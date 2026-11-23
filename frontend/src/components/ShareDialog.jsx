import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { getShares, shareDocument, unshareDocument } from '../api/documents.api';
import { showToast } from '../store/toastSlice';
import './ShareDialog.scss';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ShareDialog = ({ documentId, documentTitle, owner, onClose }) => {
  const dispatch = useDispatch();
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('edit');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await getShares(documentId);
      setLoading(false);
      if (res.error) {
        dispatch(showToast({ type: 'error', message: res.message }));
        return;
      }
      setShares(res.data);
    })();
  }, [documentId, dispatch]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(value)) {
      setFormError('Enter a valid email address');
      return;
    }

    setSubmitting(true);
    const res = await shareDocument(documentId, { email: value, permission });
    setSubmitting(false);

    if (res.error) {
      setFormError(res.message);
      return;
    }

    setShares(res.data);
    setEmail('');
    setFormError('');
    dispatch(showToast({ type: 'success', message: res.message }));
  };

  const handlePermissionChange = async (share, next) => {
    const res = await shareDocument(documentId, { email: share.email, permission: next });
    if (res.error) {
      dispatch(showToast({ type: 'error', message: res.message }));
      return;
    }
    setShares(res.data);
  };

  const handleRemove = async (share) => {
    const res = await unshareDocument(documentId, share.userId);
    if (res.error) {
      dispatch(showToast({ type: 'error', message: res.message }));
      return;
    }
    setShares(res.data);
    dispatch(showToast({ type: 'success', message: `Removed ${share.name}` }));
  };

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="share-title">
        <h2 id="share-title" className="dialog__title">Share “{documentTitle}”</h2>

        <form className="share-form" onSubmit={handleSubmit} noValidate>
          <input
            className={`input${formError ? ' input--error' : ''}`}
            type="email"
            placeholder="Add people by email, e.g. bob@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFormError('');
            }}
            autoFocus
          />
          <select className="input share-form__select" value={permission} onChange={(e) => setPermission(e.target.value)}>
            <option value="edit">Can edit</option>
            <option value="view">View only</option>
          </select>
          <button type="submit" className="btn btn--primary" disabled={submitting || !email.trim()}>
            {submitting ? 'Sharing…' : 'Share'}
          </button>
        </form>
        {formError && <p className="field-error">{formError}</p>}

        <h3 className="dialog__subtitle">People with access</h3>
        <ul className="share-list">
          <li className="share-list__item">
            <div>
              <div className="share-list__name">{owner?.name} (you)</div>
              <div className="share-list__email">{owner?.email}</div>
            </div>
            <span className="badge badge--owner">Owner</span>
          </li>
          {loading && <li className="share-list__empty">Loading…</li>}
          {!loading && shares.length === 0 && <li className="share-list__empty">Not shared with anyone yet.</li>}
          {shares.map((share) => (
            <li key={share.userId} className="share-list__item">
              <div>
                <div className="share-list__name">{share.name}</div>
                <div className="share-list__email">{share.email}</div>
              </div>
              <div className="share-list__actions">
                <select
                  className="input input--compact"
                  value={share.permission}
                  onChange={(e) => handlePermissionChange(share, e.target.value)}
                  aria-label={`Permission for ${share.name}`}
                >
                  <option value="edit">Can edit</option>
                  <option value="view">View only</option>
                </select>
                <button type="button" className="btn btn--ghost btn--danger" onClick={() => handleRemove(share)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="dialog__footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareDialog;

import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { getShares, shareDocument, unshareDocument } from '../api/documents.api';
import { showToast } from '../store/toastSlice';
import Avatar from './Avatar';
import { copyText } from '../utils/format';
import Icon from './Icon';
import Modal from './Modal';
import './ShareDialog.scss';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PERMISSIONS = [
  { value: 'edit', label: 'Editor' },
  { value: 'view', label: 'Viewer' },
];

const ShareDialog = ({ documentId, documentTitle, owner, onClose }) => {
  const dispatch = useDispatch();
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('edit');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [busyUserId, setBusyUserId] = useState(null);

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

  const handleInvite = async () => {
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
    setBusyUserId(share.userId);
    const res = await shareDocument(documentId, { email: share.email, permission: next });
    setBusyUserId(null);
    if (res.error) {
      dispatch(showToast({ type: 'error', message: res.message }));
      return;
    }
    setShares(res.data);
  };

  const handleRemove = async (share) => {
    setBusyUserId(share.userId);
    const res = await unshareDocument(documentId, share.userId);
    setBusyUserId(null);
    if (res.error) {
      dispatch(showToast({ type: 'error', message: res.message }));
      return;
    }
    setShares(res.data);
    dispatch(showToast({ type: 'success', message: `Removed ${share.name}'s access` }));
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/documents/${documentId}`;
    const copied = await copyText(url);
    dispatch(
      copied
        ? showToast({ type: 'success', message: 'Link copied. Only people with access can open it.' })
        : showToast({ type: 'error', message: 'Could not copy the link' }),
    );
  };

  return (
    <Modal
      title={`Share “${documentTitle}”`}
      size="md"
      onClose={onClose}
      onSubmit={handleInvite}
      footerAlign="between"
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={copyLink}>
            <Icon name="link" size={18} />
            Copy link
          </button>
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Done
          </button>
        </>
      }
    >
      {/* Invite */}
      <div className="share-invite">
        <div className="input-icon">
          <Icon name="personAdd" size={18} />
          <input
            className={`input${formError ? ' input--error' : ''}`}
            type="email"
            placeholder="Add people by email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFormError('');
            }}
            aria-label="Email address"
            aria-invalid={Boolean(formError)}
            data-autofocus
          />
        </div>
        <select className="input share-invite__role" value={permission} onChange={(e) => setPermission(e.target.value)} aria-label="Permission">
          {PERMISSIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn--primary share-invite__submit" disabled={submitting || !email.trim()}>
          {submitting ? 'Sharing…' : 'Share'}
        </button>
      </div>
      {formError && (
        <p className="field-error" role="alert">
          {formError}
        </p>
      )}

      {/* People with access */}
      <section className="modal-section share-people">
        <h3 className="modal-section__title">People with access</h3>
        <ul className="share-list">
          <li className="share-person">
            <Avatar name={owner?.name} email={owner?.email} size={36} />
            <div className="share-person__info">
              <span className="share-person__name">{owner?.name} (you)</span>
              <span className="share-person__email">{owner?.email}</span>
            </div>
            <span className="share-person__role">Owner</span>
          </li>

          {loading &&
            [0, 1].map((i) => (
              <li key={i} className="share-person share-person--loading" aria-hidden="true">
                <span className="skeleton skeleton--avatar" />
                <span className="skeleton skeleton--text" />
              </li>
            ))}

          {shares.map((share) => (
            <li key={share.userId} className={`share-person${busyUserId === share.userId ? ' is-busy' : ''}`}>
              <Avatar name={share.name} email={share.email} size={36} />
              <div className="share-person__info">
                <span className="share-person__name">{share.name}</span>
                <span className="share-person__email">{share.email}</span>
              </div>
              <select
                className="input input--compact input--ghost"
                value={share.permission}
                onChange={(e) => handlePermissionChange(share, e.target.value)}
                disabled={busyUserId === share.userId}
                aria-label={`Permission for ${share.name}`}
              >
                {PERMISSIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="icon-btn icon-btn--danger"
                onClick={() => handleRemove(share)}
                disabled={busyUserId === share.userId}
                aria-label={`Remove ${share.name}`}
                title="Remove access"
              >
                <Icon name="close" size={18} />
              </button>
            </li>
          ))}
        </ul>
        {!loading && shares.length === 0 && <p className="share-empty">Only you can open this document. Add people above to collaborate.</p>}
      </section>

      {/* General access */}
      <section className="modal-section">
        <h3 className="modal-section__title">General access</h3>
        <div className="share-access">
          <span className="share-access__icon" aria-hidden="true">
            <Icon name="lock" size={18} />
          </span>
          <div>
            <div className="share-access__title">Restricted</div>
            <div className="share-access__text">Only people added above can open this document, even with the link.</div>
          </div>
        </div>
      </section>
    </Modal>
  );
};

export default ShareDialog;

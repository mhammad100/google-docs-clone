import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { changePassword } from '../api/auth.api';
import { showToast } from '../store/toastSlice';
import './ChangePasswordDialog.scss';

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };
const MIN_LENGTH = 8;

const validate = (form) => {
  const errors = {};
  if (!form.currentPassword) errors.currentPassword = 'Current password is required';
  if (form.newPassword.length < MIN_LENGTH) errors.newPassword = `New password must be at least ${MIN_LENGTH} characters`;
  else if (form.newPassword === form.currentPassword) errors.newPassword = 'New password must be different from the current one';
  if (form.confirmPassword !== form.newPassword) errors.confirmPassword = 'Passwords do not match';
  return errors;
};

const FIELDS = [
  ['currentPassword', 'Current password', 'current-password'],
  ['newPassword', 'New password', 'new-password'],
  ['confirmPassword', 'Confirm new password', 'new-password'],
];

const ChangePasswordDialog = ({ onClose }) => {
  const dispatch = useDispatch();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clientErrors = validate(form);
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    const res = await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
    setSubmitting(false);

    if (res.error) {
      // Show server field errors next to the matching input when possible
      const fieldErrors = Object.fromEntries((res.error.details || []).map((d) => [d.field, d.message]));
      setErrors(fieldErrors);
      if (!Object.keys(fieldErrors).length) setFormError(res.message);
      return;
    }

    dispatch(showToast({ type: 'success', message: 'Password updated' }));
    onClose();
  };

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        className="dialog change-password"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        onSubmit={handleSubmit}
        noValidate
      >
        <h2 id="change-password-title" className="dialog__title">Change password</h2>

        <div className="change-password__fields">
          {FIELDS.map(([field, label, autoComplete], i) => (
            <label key={field} className="field">
              <span className="field__label">{label}</span>
              <input
                className={`input${errors[field] ? ' input--error' : ''}`}
                type="password"
                autoComplete={autoComplete}
                value={form[field]}
                onChange={update(field)}
                autoFocus={i === 0}
              />
              {errors[field] && <span className="field-error">{errors[field]}</span>}
            </label>
          ))}
          <p className="change-password__hint">Use at least {MIN_LENGTH} characters.</p>
        </div>

        {formError && <p className="form-error">{formError}</p>}

        <div className="dialog__footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Update password'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChangePasswordDialog;

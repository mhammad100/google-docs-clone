import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { changePassword } from '../api/auth.api';
import { showToast } from '../store/toastSlice';
import Icon from './Icon';
import Modal from './Modal';
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
  { name: 'currentPassword', label: 'Current password', autoComplete: 'current-password' },
  { name: 'newPassword', label: 'New password', autoComplete: 'new-password', hint: `At least ${MIN_LENGTH} characters` },
  { name: 'confirmPassword', label: 'Confirm new password', autoComplete: 'new-password' },
];

/** Password input with a show/hide toggle. */
const PasswordField = ({ label, hint, error, autoFocus, ...inputProps }) => {
  const [visible, setVisible] = useState(false);
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <span className={`password-input${error ? ' password-input--error' : ''}`}>
        <input type={visible ? 'text' : 'password'} aria-invalid={Boolean(error)} data-autofocus={autoFocus || undefined} {...inputProps} />
        <button
          type="button"
          className="icon-btn password-input__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          title={visible ? 'Hide password' : 'Show password'}
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} size={18} />
        </button>
      </span>
      {error ? <span className="field-error">{error}</span> : hint && <span className="field-hint">{hint}</span>}
    </label>
  );
};

const ChangePasswordDialog = ({ onClose }) => {
  const dispatch = useDispatch();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
    setFormError('');
  };

  const handleSubmit = async () => {
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
    <Modal
      title="Change password"
      description="You'll stay signed in on this device."
      icon="key"
      size="sm"
      busy={submitting}
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Update password'}
          </button>
        </>
      }
    >
      <div className="change-password">
        {FIELDS.map((field, i) => (
          <PasswordField
            key={field.name}
            label={field.label}
            hint={field.hint}
            autoComplete={field.autoComplete}
            value={form[field.name]}
            onChange={update(field.name)}
            error={errors[field.name]}
            autoFocus={i === 0}
          />
        ))}
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
      </div>
    </Modal>
  );
};

export default ChangePasswordDialog;

import { useEffect, useState } from 'react';
import Icon from './Icon';

/**
 * Accessible confirmation dialog. onConfirm may be async: the button shows a busy state
 * until it resolves, and the dialog closes itself afterwards.
 */
const ConfirmDialog = ({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onClose }) => {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const handleConfirm = async () => {
    setBusy(true);
    await onConfirm();
    setBusy(false);
    onClose();
  };

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
        {danger && (
          <span className="confirm-dialog__icon" aria-hidden="true">
            <Icon name="warning" size={22} />
          </span>
        )}
        <h2 id="confirm-title" className="dialog__title">{title}</h2>
        <p id="confirm-message" className="confirm-dialog__message">{message}</p>
        <div className="dialog__footer">
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn--destructive' : 'btn--primary'}`}
            onClick={handleConfirm}
            disabled={busy}
            autoFocus
          >
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

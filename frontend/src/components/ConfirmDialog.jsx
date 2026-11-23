import { useState } from 'react';
import Modal from './Modal';

/**
 * Confirmation dialog built on Modal. onConfirm may be async: the button shows a busy
 * state until it resolves, and the dialog closes itself afterwards.
 */
const ConfirmDialog = ({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onClose }) => {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    await onConfirm();
    setBusy(false);
    onClose();
  };

  return (
    <Modal
      role="alertdialog"
      title={title}
      description={message}
      icon={danger ? 'warning' : undefined}
      tone={danger ? 'danger' : 'default'}
      size="sm"
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn--destructive' : 'btn--primary'}`}
            onClick={handleConfirm}
            disabled={busy}
            data-autofocus
          >
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </>
      }
    />
  );
};

export default ConfirmDialog;

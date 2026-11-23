import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

/**
 * Shared dialog shell: header with title + close button, scrollable body, footer.
 * - Escape and clicking the backdrop close it (unless `busy`)
 * - Locks page scroll while open and gives focus back to the opener on close
 * - Renders as a <form> when onSubmit is passed, so Enter submits
 */
const Modal = ({
  title,
  description,
  icon,
  tone = 'default',
  size = 'md',
  busy = false,
  onClose,
  onSubmit,
  footer,
  footerAlign = 'end',
  role = 'dialog',
  children,
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the first field marked autoFocus-like, else the panel itself
    const firstField = panelRef.current?.querySelector('[data-autofocus]');
    (firstField || panelRef.current)?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement) opener.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const Panel = onSubmit ? 'form' : 'div';
  const panelProps = onSubmit
    ? {
        noValidate: true,
        onSubmit: (e) => {
          e.preventDefault();
          onSubmit(e);
        },
      }
    : {};

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <Panel
        ref={panelRef}
        className={`modal modal--${size}`}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        {...panelProps}
      >
        <header className="modal__header">
          {icon && (
            <span className={`modal__icon modal__icon--${tone}`} aria-hidden="true">
              <Icon name={icon} size={22} />
            </span>
          )}
          <div className="modal__heading">
            <h2 id={titleId} className="modal__title">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="modal__description">
                {description}
              </p>
            )}
          </div>
          <button type="button" className="modal__close" onClick={onClose} disabled={busy} aria-label="Close">
            <Icon name="close" size={20} />
          </button>
        </header>

        {children && <div className="modal__body">{children}</div>}

        {footer && <footer className={`modal__footer modal__footer--${footerAlign}`}>{footer}</footer>}
      </Panel>
    </div>,
    document.body,
  );
};

export default Modal;

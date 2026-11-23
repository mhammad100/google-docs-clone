import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import './Dropdown.scss';

// Toolbar/menu controls keep the editor's text selection: mousedown must not move focus.
export const keepSelection = (e) => e.preventDefault();

/**
 * Button that opens a popover. `children` is a render function receiving `close`.
 * onOpen can return false to cancel opening (e.g. when nothing is selected).
 */
const Dropdown = ({ label, title, className = '', buttonClassName = '', caret = true, align = 'left', disabled, onOpen, children }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => !rootRef.current?.contains(e.target) && setOpen(false);
    const onKeyDown = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggle = () => {
    if (open) return setOpen(false);
    if (onOpen && onOpen() === false) return undefined;
    return setOpen(true);
  };

  return (
    <div ref={rootRef} className={`dropdown ${className}`}>
      <button
        type="button"
        className={`dropdown__button ${buttonClassName}${open ? ' is-open' : ''}`}
        onMouseDown={keepSelection}
        onClick={toggle}
        title={title}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
      >
        {label}
        {caret && <Icon name="caret" size={18} className="dropdown__caret" />}
      </button>
      {open && (
        <div className={`dropdown__panel dropdown__panel--${align}`} role="menu" onMouseDown={(e) => e.target.tagName !== 'INPUT' && keepSelection(e)}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
};

export const MenuItem = ({ icon, label, shortcut, active, disabled, onSelect, close, className = '' }) => (
  <button
    type="button"
    role="menuitem"
    className={`menu-item${active ? ' is-active' : ''} ${className}`}
    disabled={disabled}
    onMouseDown={keepSelection}
    onClick={() => {
      close?.();
      onSelect();
    }}
  >
    <span className="menu-item__icon">{icon && <Icon name={icon} size={18} />}</span>
    <span className="menu-item__label">{label}</span>
    {shortcut && <span className="menu-item__shortcut">{shortcut}</span>}
  </button>
);

export const MenuDivider = () => <div className="menu-divider" role="separator" />;

export default Dropdown;

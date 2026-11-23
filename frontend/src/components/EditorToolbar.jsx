import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import Dropdown, { keepSelection, MenuItem } from './Dropdown';
import Icon from './Icon';
import { showToast } from '../store/toastSlice';
import { applyLink, captureLinkTarget, normalizeUrl, removeLink } from '../editor/formatting';
import { SHORTCUTS, TEXT_STYLES, ZOOM_LEVELS } from '../editor/shortcuts';
import './EditorToolbar.scss';

const ToolButton = ({ icon, label, shortcut, active, disabled, onClick }) => (
  <button
    type="button"
    className={`tb-btn${active ? ' is-active' : ''}`}
    data-tooltip={shortcut ? `${label} (${shortcut})` : label}
    aria-label={label}
    aria-pressed={active ?? undefined}
    disabled={disabled}
    onMouseDown={keepSelection}
    onClick={onClick}
  >
    <Icon name={icon} />
  </button>
);

const Separator = () => <span className="tb-sep" aria-hidden="true" />;

/** Popover form for adding or editing a link. Mounted fresh each time the popover opens. */
const LinkForm = ({ target, close, onChanged }) => {
  const inputRef = useRef(null);
  const [url, setUrl] = useState(target.href);
  const [error, setError] = useState('');

  // Focus and select after mount so typing replaces an existing address
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const submit = () => {
    const normalized = normalizeUrl(url);
    if (!normalized) {
      setError('Enter a valid web address or email');
      return;
    }
    applyLink(target, normalized);
    close();
    onChanged();
  };

  const remove = () => {
    removeLink(target);
    close();
    onChanged();
  };

  return (
    <form
      className="link-form"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label className="link-form__label" htmlFor="link-url">
        Link
      </label>
      <input
        ref={inputRef}
        id="link-url"
        className={`input${error ? ' input--error' : ''}`}
        placeholder="Paste or type a link, e.g. example.com"
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          setError('');
        }}
        // Editor.js handles Enter / ⌘A at the document level, so deal with them here
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
            e.preventDefault();
            e.currentTarget.select();
          }
        }}
      />
      {error && <p className="field-error">{error}</p>}
      <div className="link-form__actions">
        {target.anchor && (
          <button type="button" className="btn btn--ghost btn--danger" onClick={remove}>
            Remove link
          </button>
        )}
        <button type="submit" className="btn btn--primary">
          Apply
        </button>
      </div>
    </form>
  );
};

const LinkControl = ({ holderRef, disabled, active, onChanged }) => {
  const dispatch = useDispatch();
  const [target, setTarget] = useState(null);

  // Capture the selection before focus moves into the popover
  const open = () => {
    const result = captureLinkTarget(holderRef.current);
    if (!result.ok) {
      dispatch(showToast({ type: 'info', message: result.reason }));
      return false;
    }
    setTarget(result);
    return true;
  };

  return (
    <Dropdown
      label={<Icon name="link" />}
      caret={false}
      tooltip={`Insert link (${SHORTCUTS.link})`}
      ariaLabel="Insert link"
      buttonClassName={`tb-btn${active ? ' is-active' : ''}`}
      disabled={disabled}
      onOpen={open}
    >
      {(close) => target && <LinkForm target={target} close={close} onChanged={onChanged} />}
    </Dropdown>
  );
};

/** Google Docs style formatting toolbar. Every control works on the current selection / caret. */
const EditorToolbar = ({ state, commands, canEdit, holderRef, zoom, onZoomChange, onPrint, onPageSetup, onLinkChanged }) => {
  const off = !canEdit;
  const styleLabel = TEXT_STYLES.find((s) => s.value === state.textStyle)?.label || 'Normal text';

  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Formatting">
      <ToolButton icon="undo" label="Undo" shortcut={SHORTCUTS.undo} disabled={off} onClick={commands.undo} />
      <ToolButton icon="redo" label="Redo" shortcut={SHORTCUTS.redo} disabled={off} onClick={commands.redo} />
      <ToolButton icon="print" label="Print" shortcut={SHORTCUTS.print} onClick={onPrint} />
      <Separator />

      <Dropdown label={`${Math.round(zoom * 100)}%`} tooltip="Zoom" buttonClassName="tb-select tb-select--zoom">
        {(close) =>
          ZOOM_LEVELS.map((level) => (
            <MenuItem key={level} label={`${level * 100}%`} active={level === zoom} close={close} onSelect={() => onZoomChange(level)} />
          ))
        }
      </Dropdown>
      <Separator />

      <Dropdown label={styleLabel} tooltip="Text style" buttonClassName="tb-select tb-select--style" disabled={off}>
        {(close) =>
          TEXT_STYLES.map((style) => (
            <MenuItem
              key={style.value}
              className={`text-style-option text-style-option--${style.value}`}
              label={style.label}
              shortcut={SHORTCUTS[style.value]}
              active={state.textStyle === style.value}
              close={close}
              onSelect={() => commands.textStyle(style.value)}
            />
          ))
        }
      </Dropdown>
      <Separator />

      <ToolButton
        icon="bold"
        label="Bold"
        shortcut={SHORTCUTS.bold}
        active={state.bold}
        disabled={off}
        onClick={() => commands.inline('bold')}
      />
      <ToolButton
        icon="italic"
        label="Italic"
        shortcut={SHORTCUTS.italic}
        active={state.italic}
        disabled={off}
        onClick={() => commands.inline('italic')}
      />
      <ToolButton
        icon="underline"
        label="Underline"
        shortcut={SHORTCUTS.underline}
        active={state.underline}
        disabled={off}
        onClick={() => commands.inline('underline')}
      />
      <ToolButton
        icon="strikethrough"
        label="Strikethrough"
        shortcut={SHORTCUTS.strikethrough}
        active={state.strikethrough}
        disabled={off}
        onClick={() => commands.inline('strikethrough')}
      />
      <ToolButton
        icon="highlight"
        label="Highlight"
        shortcut={SHORTCUTS.highlight}
        active={state.highlight}
        disabled={off}
        onClick={() => commands.wrap('highlight')}
      />
      <ToolButton
        icon="code"
        label="Inline code"
        shortcut={SHORTCUTS.code}
        active={state.code}
        disabled={off}
        onClick={() => commands.wrap('code')}
      />
      <Separator />

      <LinkControl holderRef={holderRef} disabled={off} active={state.link} onChanged={onLinkChanged} />
      <Separator />

      <ToolButton
        icon="checklist"
        label="Checklist"
        shortcut={SHORTCUTS.checklist}
        active={state.listStyle === 'checklist'}
        disabled={off}
        onClick={() => commands.list('checklist')}
      />
      <ToolButton
        icon="bulleted"
        label="Bulleted list"
        shortcut={SHORTCUTS.unordered}
        active={state.listStyle === 'unordered'}
        disabled={off}
        onClick={() => commands.list('unordered')}
      />
      <ToolButton
        icon="numbered"
        label="Numbered list"
        shortcut={SHORTCUTS.ordered}
        active={state.listStyle === 'ordered'}
        disabled={off}
        onClick={() => commands.list('ordered')}
      />
      <ToolButton icon="quote" label="Quote" active={state.blockType === 'quote'} disabled={off} onClick={commands.quote} />
      <ToolButton icon="divider" label="Horizontal line" disabled={off} onClick={commands.divider} />
      <Separator />

      <ToolButton icon="clear" label="Clear formatting" shortcut={SHORTCUTS.clear} disabled={off} onClick={commands.clearFormatting} />
      <ToolButton icon="pageSetup" label="Page setup" disabled={off} onClick={onPageSetup} />
    </div>
  );
};

export default EditorToolbar;

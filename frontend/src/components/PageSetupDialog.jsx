import { useEffect, useState } from 'react';
import { MARGIN_PRESETS, MAX_MARGIN, PAGE_SIZES, pageDimensions, validateSettings } from '../editor/pageSettings';
import './PageSetupDialog.scss';

const MARGIN_FIELDS = [
  ['top', 'Top'],
  ['bottom', 'Bottom'],
  ['left', 'Left'],
  ['right', 'Right'],
];

const sameMargins = (a, b) => MARGIN_FIELDS.every(([k]) => Number(a[k]) === b[k]);

/** Scaled page thumbnail showing the text area inside the margins. */
const PagePreview = ({ settings }) => {
  const [w, h] = pageDimensions(settings);
  const scale = 140 / Math.max(w, h);
  const m = settings.margins;
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  return (
    <div className="page-preview" style={{ width: w * scale, height: h * scale }} aria-hidden="true">
      <div
        className="page-preview__text"
        style={{
          top: num(m.top) * scale,
          bottom: num(m.bottom) * scale,
          left: num(m.left) * scale,
          right: num(m.right) * scale,
        }}
      />
    </div>
  );
};

const PageSetupDialog = ({ settings, onApply, onClose }) => {
  const [draft, setDraft] = useState(settings);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const update = (patch) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError('');
  };

  const setMargin = (key, value) => update({ margins: { ...draft.margins, [key]: value } });

  const handleSubmit = (e) => {
    e.preventDefault();
    const next = {
      ...draft,
      header: draft.header.trim(),
      footer: draft.footer.trim(),
      margins: Object.fromEntries(MARGIN_FIELDS.map(([k]) => [k, Number(draft.margins[k])])),
    };
    const message = validateSettings(next);
    if (message) {
      setError(message);
      return;
    }
    onApply(next);
    onClose();
  };

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="dialog page-setup" role="dialog" aria-modal="true" aria-labelledby="page-setup-title" onSubmit={handleSubmit} noValidate>
        <h2 id="page-setup-title" className="dialog__title">Page setup</h2>

        <div className="page-setup__body">
          <div className="page-setup__fields">
            <fieldset className="page-setup__group">
              <legend>Orientation</legend>
              {['portrait', 'landscape'].map((o) => (
                <label key={o} className="radio">
                  <input type="radio" name="orientation" checked={draft.orientation === o} onChange={() => update({ orientation: o })} />
                  {o[0].toUpperCase() + o.slice(1)}
                </label>
              ))}
            </fieldset>

            <label className="field">
              <span className="field__label">Paper size</span>
              <select className="input" value={draft.pageSize} onChange={(e) => update({ pageSize: e.target.value })}>
                {Object.entries(PAGE_SIZES).map(([key, size]) => (
                  <option key={key} value={key}>
                    {size.label} ({size.hint})
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="page-setup__group">
              <legend>Margins (inches)</legend>
              <div className="page-setup__presets">
                {Object.entries(MARGIN_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    className={`chip${sameMargins(draft.margins, preset.margins) ? ' is-active' : ''}`}
                    onClick={() => update({ margins: preset.margins })}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="page-setup__margins">
                {MARGIN_FIELDS.map(([key, label]) => (
                  <label key={key} className="field">
                    <span className="field__label">{label}</span>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      max={MAX_MARGIN}
                      step="0.1"
                      value={draft.margins[key]}
                      onChange={(e) => setMargin(key, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="page-setup__preview">
            <PagePreview settings={draft} />
            <span>{PAGE_SIZES[draft.pageSize].label} · {draft.orientation}</span>
          </div>
        </div>

        <fieldset className="page-setup__group">
          <legend>Header &amp; footer</legend>
          <div className="page-setup__hf">
            <label className="field">
              <span className="field__label">Header text</span>
              <input className="input" maxLength={200} value={draft.header} onChange={(e) => update({ header: e.target.value })} placeholder="e.g. Company name" />
            </label>
            <label className="field">
              <span className="field__label">Footer text</span>
              <input className="input" maxLength={200} value={draft.footer} onChange={(e) => update({ footer: e.target.value })} placeholder="e.g. Confidential" />
            </label>
          </div>
          <label className="checkbox">
            <input type="checkbox" checked={draft.showPageNumbers} onChange={(e) => update({ showPageNumbers: e.target.checked })} />
            Show page numbers in the footer
          </label>
        </fieldset>

        {error && <p className="form-error">{error}</p>}

        <div className="dialog__footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary">OK</button>
        </div>
      </form>
    </div>
  );
};

export default PageSetupDialog;

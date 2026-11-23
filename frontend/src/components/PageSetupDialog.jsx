import { useState } from 'react';
import { MARGIN_PRESETS, MAX_MARGIN, PAGE_SIZES, pageDimensions, validateSettings } from '../editor/pageSettings';
import Modal from './Modal';
import './PageSetupDialog.scss';

const MARGIN_FIELDS = [
  ['top', 'Top'],
  ['bottom', 'Bottom'],
  ['left', 'Left'],
  ['right', 'Right'],
];

const ORIENTATIONS = [
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
];

const sameMargins = (a, b) => MARGIN_FIELDS.every(([k]) => Number(a[k]) === b[k]);
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Scaled page thumbnail showing the header, text area and footer inside the margins. */
const PagePreview = ({ settings }) => {
  const [w, h] = pageDimensions(settings);
  const scale = 150 / Math.max(w, h);
  const m = settings.margins;
  return (
    <div className="page-preview" style={{ width: w * scale, height: h * scale }} aria-hidden="true">
      {settings.header.trim() && (
        <span className="page-preview__hf" style={{ top: Math.max(num(m.top) * scale - 9, 2), left: num(m.left) * scale }} />
      )}
      <div
        className="page-preview__text"
        style={{
          top: num(m.top) * scale,
          bottom: num(m.bottom) * scale,
          left: num(m.left) * scale,
          right: num(m.right) * scale,
        }}
      />
      {(settings.footer.trim() || settings.showPageNumbers) && (
        <span className="page-preview__hf" style={{ bottom: Math.max(num(m.bottom) * scale - 9, 2), left: num(m.left) * scale }} />
      )}
    </div>
  );
};

const PageSetupDialog = ({ settings, onApply, onClose }) => {
  const [draft, setDraft] = useState(settings);
  const [error, setError] = useState('');

  const update = (patch) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError('');
  };

  const setMargin = (key, value) => update({ margins: { ...draft.margins, [key]: value } });

  const handleSubmit = () => {
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

  const [w, h] = pageDimensions(draft);

  return (
    <Modal
      title="Page setup"
      description="Applies to this document on screen and when printing or saving as PDF."
      size="lg"
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary">
            Apply
          </button>
        </>
      }
    >
      <div className="page-setup">
        <div className="page-setup__fields">
          <section className="modal-section">
            <h3 className="modal-section__title">Orientation</h3>
            <div className="option-cards" role="radiogroup" aria-label="Orientation">
              {ORIENTATIONS.map((o) => (
                <label key={o.value} className={`option-card${draft.orientation === o.value ? ' is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="orientation"
                    value={o.value}
                    checked={draft.orientation === o.value}
                    onChange={() => update({ orientation: o.value })}
                  />
                  <span className={`orientation-glyph orientation-glyph--${o.value}`} aria-hidden="true" />
                  {o.label}
                </label>
              ))}
            </div>
          </section>

          <section className="modal-section">
            <h3 className="modal-section__title">Paper size</h3>
            <select className="input" value={draft.pageSize} onChange={(e) => update({ pageSize: e.target.value })} aria-label="Paper size">
              {Object.entries(PAGE_SIZES).map(([key, size]) => (
                <option key={key} value={key}>
                  {size.label} ({size.hint})
                </option>
              ))}
            </select>
          </section>

          <section className="modal-section">
            <h3 className="modal-section__title">Margins</h3>
            <div className="page-setup__presets" role="group" aria-label="Margin presets">
              {Object.entries(MARGIN_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  className={`chip${sameMargins(draft.margins, preset.margins) ? ' is-active' : ''}`}
                  aria-pressed={sameMargins(draft.margins, preset.margins)}
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
                  <span className="input-affix">
                    <input type="number" min="0" max={MAX_MARGIN} step="0.1" value={draft.margins[key]} onChange={(e) => setMargin(key, e.target.value)} />
                    <span className="input-affix__suffix">in</span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <aside className="page-setup__preview">
          <PagePreview settings={draft} />
          <span className="page-setup__preview-label">
            {PAGE_SIZES[draft.pageSize].label} · {w}″ × {h}″
          </span>
        </aside>
      </div>

      <section className="modal-section page-setup__hf">
        <h3 className="modal-section__title">Header &amp; footer</h3>
        <div className="page-setup__hf-fields">
          <label className="field">
            <span className="field__label">Header</span>
            <input className="input" maxLength={200} value={draft.header} onChange={(e) => update({ header: e.target.value })} placeholder="e.g. Company name" />
          </label>
          <label className="field">
            <span className="field__label">Footer</span>
            <input className="input" maxLength={200} value={draft.footer} onChange={(e) => update({ footer: e.target.value })} placeholder="e.g. Confidential" />
          </label>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            role="switch"
            checked={draft.showPageNumbers}
            onChange={(e) => update({ showPageNumbers: e.target.checked })}
          />
          <span className="switch__track" aria-hidden="true" />
          Show page numbers in the footer
        </label>
      </section>

      {error && (
        <p className="form-error page-setup__error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
};

export default PageSetupDialog;

import { useLayoutEffect, useRef, useState } from 'react';
import { buildPrintCss, pageDimensions, PX_PER_INCH } from '../editor/pageSettings';
import './PageView.scss';

/** Header or footer text, edited in place inside the page margin (remounted via key when the saved value changes). */
const MarginField = ({ kind, value, canEdit, inputRef, style, extra, onSave }) => {
  const [text, setText] = useState(value);

  const commit = () => {
    const next = text.trim();
    if (next !== value) onSave(next);
  };

  return (
    <div className={`page-view__margin page-view__margin--${kind}${value ? ' has-value' : ''}`} style={style}>
      {canEdit ? (
        <input
          ref={inputRef}
          className="page-view__margin-input"
          value={text}
          maxLength={200}
          placeholder={kind === 'header' ? 'Add a header' : 'Add a footer'}
          aria-label={kind === 'header' ? 'Header' : 'Footer'}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') {
              setText(value);
              requestAnimationFrame(() => e.target.blur());
            }
          }}
        />
      ) : (
        <span className="page-view__margin-text">{value}</span>
      )}
      {extra && <span className="page-view__page-number">{extra}</span>}
    </div>
  );
};

/**
 * Renders the document as a sheet with the chosen size and margins.
 * On screen the text flows continuously with page-break guides; printing (or Save as PDF)
 * produces real pages with the header/footer on each one.
 */
const PageView = ({ settings, zoom, canEdit, headerRef, footerRef, onSettingsChange, onEmptyAreaClick, children }) => {
  const contentRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(0);

  const [widthIn, heightIn] = pageDimensions(settings);
  const width = widthIn * PX_PER_INCH;
  const height = heightIn * PX_PER_INCH;
  const m = Object.fromEntries(Object.entries(settings.margins).map(([k, v]) => [k, v * PX_PER_INCH]));

  useLayoutEffect(() => {
    const el = contentRef.current;
    const observer = new ResizeObserver(() => setContentHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const pageCount = Math.max(1, Math.ceil((contentHeight + m.top + m.bottom) / height));
  const save = (key) => (value) => onSettingsChange({ ...settings, [key]: value });

  return (
    <div className="page-view" style={{ zoom }}>
      <style>{buildPrintCss(settings)}</style>
      <div
        className="page-view__paper"
        // Clicking blank paper below the text puts the caret at the end, like a word processor
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && canEdit) {
            e.preventDefault();
            onEmptyAreaClick?.();
          }
        }}
        style={{ width, minHeight: height * pageCount, padding: `${m.top}px ${m.right}px ${m.bottom}px ${m.left}px` }}
      >
        <MarginField
          key={`header-${settings.header}`}
          kind="header"
          value={settings.header}
          canEdit={canEdit}
          inputRef={headerRef}
          style={{ top: 0, height: m.top, left: m.left, right: m.right }}
          onSave={save('header')}
        />

        {Array.from({ length: pageCount - 1 }, (_, i) => (
          <div key={i} className="page-view__break" style={{ top: height * (i + 1) }} aria-hidden="true">
            <span>Page {i + 2}</span>
          </div>
        ))}

        <div ref={contentRef} className="page-view__content">
          {children}
        </div>

        <MarginField
          key={`footer-${settings.footer}`}
          kind="footer"
          value={settings.footer}
          canEdit={canEdit}
          inputRef={footerRef}
          style={{ bottom: 0, height: m.bottom, left: m.left, right: m.right }}
          extra={settings.showPageNumbers ? `Page ${pageCount} of ${pageCount}` : null}
          onSave={save('footer')}
        />
      </div>
    </div>
  );
};

export default PageView;

// Page setup helpers. All sizes are in inches; the screen renders 1in = 96 CSS px.

export const PX_PER_INCH = 96;

export const PAGE_SIZES = {
  letter: { label: 'Letter', size: [8.5, 11], hint: '8.5" × 11"' },
  a4: { label: 'A4', size: [8.27, 11.69], hint: '21 × 29.7 cm' },
  legal: { label: 'Legal', size: [8.5, 14], hint: '8.5" × 14"' },
  a5: { label: 'A5', size: [5.83, 8.27], hint: '14.8 × 21 cm' },
};

export const MARGIN_PRESETS = {
  normal: { label: 'Normal', margins: { top: 1, right: 1, bottom: 1, left: 1 } },
  narrow: { label: 'Narrow', margins: { top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 } },
  moderate: { label: 'Moderate', margins: { top: 1, right: 0.75, bottom: 1, left: 0.75 } },
  wide: { label: 'Wide', margins: { top: 1, right: 2, bottom: 1, left: 2 } },
};

export const MAX_MARGIN = 3;
export const MIN_TEXT_AREA = 1;

export const DEFAULT_SETTINGS = {
  pageSize: 'a4',
  orientation: 'portrait',
  margins: { top: 1, right: 1, bottom: 1, left: 1 },
  header: '',
  footer: '',
  showPageNumbers: false,
};

export const withDefaults = (settings) => ({
  ...DEFAULT_SETTINGS,
  ...settings,
  margins: { ...DEFAULT_SETTINGS.margins, ...settings?.margins },
});

/** [width, height] in inches, after orientation. */
export const pageDimensions = ({ pageSize, orientation }) => {
  const [w, h] = (PAGE_SIZES[pageSize] || PAGE_SIZES.a4).size;
  return orientation === 'landscape' ? [h, w] : [w, h];
};

/** Mirrors the backend rule; returns an error message or null. */
export const validateSettings = (settings) => {
  const { margins } = settings;
  for (const [key, value] of Object.entries(margins)) {
    if (!Number.isFinite(value) || value < 0 || value > MAX_MARGIN) {
      return `${key[0].toUpperCase()}${key.slice(1)} margin must be between 0 and ${MAX_MARGIN} inches`;
    }
  }
  const [width, height] = pageDimensions(settings);
  if (width - margins.left - margins.right < MIN_TEXT_AREA || height - margins.top - margins.bottom < MIN_TEXT_AREA) {
    return 'Margins are too large for this page size';
  }
  return null;
};

const cssString = (text) => `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\s+/g, ' ')}"`;

/**
 * Print stylesheet: real page size + margins, and the header/footer repeated on every printed
 * page through CSS page-margin boxes (supported in Chromium 131+).
 */
export const buildPrintCss = (settings) => {
  const [width, height] = pageDimensions(settings);
  const { top, right, bottom, left } = settings.margins;
  const box = 'font-family: Arial, sans-serif; font-size: 9pt; color: #5f6368;';

  const footerRight = settings.showPageNumbers
    ? `@bottom-right { content: "Page " counter(page) " of " counter(pages); ${box} }`
    : '';
  const header = settings.header ? `@top-center { content: ${cssString(settings.header)}; ${box} }` : '';
  const footer = settings.footer ? `@bottom-left { content: ${cssString(settings.footer)}; ${box} }` : '';

  return `@media print {
  @page { size: ${width}in ${height}in; margin: ${top}in ${right}in ${bottom}in ${left}in; ${header} ${footer} ${footerRight} }
}`;
};

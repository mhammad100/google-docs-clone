// Page setup stored per document. Sizes are in inches.

// Portrait width/height
const PAGE_DIMENSIONS = { letter: [8.5, 11], a4: [8.27, 11.69], legal: [8.5, 14], a5: [5.83, 8.27] };
const PAGE_SIZES = Object.keys(PAGE_DIMENSIONS);
const ORIENTATIONS = ['portrait', 'landscape'];
const MARGIN_KEYS = ['top', 'right', 'bottom', 'left'];
const MAX_MARGIN = 3;
const MAX_HEADER_LENGTH = 200;

const DEFAULT_SETTINGS = {
  pageSize: 'a4',
  orientation: 'portrait',
  margins: { top: 1, right: 1, bottom: 1, left: 1 },
  header: '',
  footer: '',
  showPageNumbers: false,
};

const toMargin = (value, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(Math.min(Math.max(n, 0), MAX_MARGIN) * 100) / 100;
};

// Merges stored/incoming settings over the defaults and drops unknown keys.
const normalizeSettings = (settings = {}) => {
  const s = settings && typeof settings === 'object' ? settings : {};
  const margins = s.margins && typeof s.margins === 'object' ? s.margins : {};
  return {
    pageSize: PAGE_SIZES.includes(s.pageSize) ? s.pageSize : DEFAULT_SETTINGS.pageSize,
    orientation: ORIENTATIONS.includes(s.orientation) ? s.orientation : DEFAULT_SETTINGS.orientation,
    margins: Object.fromEntries(MARGIN_KEYS.map((k) => [k, toMargin(margins[k], DEFAULT_SETTINGS.margins[k])])),
    header: typeof s.header === 'string' ? s.header.trim().slice(0, MAX_HEADER_LENGTH) : '',
    footer: typeof s.footer === 'string' ? s.footer.trim().slice(0, MAX_HEADER_LENGTH) : '',
    showPageNumbers: s.showPageNumbers === true,
  };
};

/** [width, height] in inches after applying orientation. */
const pageDimensions = ({ pageSize, orientation }) => {
  const [w, h] = PAGE_DIMENSIONS[pageSize] || PAGE_DIMENSIONS[DEFAULT_SETTINGS.pageSize];
  return orientation === 'landscape' ? [h, w] : [w, h];
};

module.exports = {
  PAGE_SIZES,
  pageDimensions,
  ORIENTATIONS,
  MARGIN_KEYS,
  MAX_MARGIN,
  MAX_HEADER_LENGTH,
  DEFAULT_SETTINGS,
  normalizeSettings,
};

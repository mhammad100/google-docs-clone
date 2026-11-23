const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

const MOD = isMac ? '⌘' : 'Ctrl+';
const ALT = isMac ? '⌥' : 'Alt+';
const SHIFT = isMac ? '⇧' : 'Shift+';

export const SHORTCUTS = {
  undo: `${MOD}Z`,
  redo: `${MOD}${SHIFT}Z`,
  print: `${MOD}P`,
  save: `${MOD}S`,
  bold: `${MOD}B`,
  italic: `${MOD}I`,
  underline: `${MOD}U`,
  strikethrough: `${MOD}${SHIFT}X`,
  highlight: `${MOD}${SHIFT}H`,
  code: `${MOD}${SHIFT}C`,
  link: `${MOD}K`,
  clear: `${MOD}\\`,
  paragraph: `${MOD}${ALT}0`,
  h1: `${MOD}${ALT}1`,
  h2: `${MOD}${ALT}2`,
  h3: `${MOD}${ALT}3`,
  h4: `${MOD}${ALT}4`,
  ordered: `${MOD}${SHIFT}7`,
  unordered: `${MOD}${SHIFT}8`,
  checklist: `${MOD}${SHIFT}9`,
};

export const TEXT_STYLES = [
  { value: 'paragraph', label: 'Normal text' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'h4', label: 'Heading 4' },
];

export const ZOOM_LEVELS = [0.5, 0.75, 0.9, 1, 1.25, 1.5, 2];

const sanitizeHtml = require('sanitize-html');

// Editor.js block types the app supports. Anything else is rejected by the validator.
const BLOCK_TYPES = ['paragraph', 'header', 'list', 'quote', 'delimiter'];
const LIST_STYLES = ['unordered', 'ordered', 'checklist'];
const COUNTER_TYPES = ['numeric', 'lower-roman', 'upper-roman', 'lower-alpha', 'upper-alpha'];

// Inline HTML allowed inside block text (what Editor.js bold/italic/underline/link produce).
const INLINE_OPTIONS = {
  allowedTags: ['b', 'i', 'u', 's', 'a', 'br', 'mark', 'code'],
  allowedAttributes: { a: ['href', 'target', 'rel'], u: ['class'], mark: ['class'], code: ['class'] },
  allowedClasses: { u: ['cdx-underline'], mark: ['cdx-marker'], code: ['inline-code'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: { strong: 'b', em: 'i', strike: 's', del: 's' },
};

const cleanInline = (html) => sanitizeHtml(String(html ?? ''), INLINE_OPTIONS);

const clampLevel = (level) => Math.min(Math.max(Number(level) || 2, 1), 4);

// Keeps only the known @editorjs/list meta fields (checklist state, ordered list numbering)
const cleanMeta = (meta = {}) => {
  const out = {};
  if (typeof meta.checked === 'boolean') out.checked = meta.checked;
  if (Number.isInteger(meta.start) && meta.start > 0) out.start = meta.start;
  if (COUNTER_TYPES.includes(meta.counterType)) out.counterType = meta.counterType;
  return out;
};

const cleanListItems = (items = []) =>
  items.map((item) => {
    // Older @editorjs/list format stored items as plain strings
    if (typeof item === 'string') return { content: cleanInline(item), meta: {}, items: [] };
    return {
      content: cleanInline(item?.content),
      meta: cleanMeta(item?.meta),
      items: cleanListItems(Array.isArray(item?.items) ? item.items : []),
    };
  });

const cleanBlock = (block) => {
  const data = block.data || {};
  switch (block.type) {
    case 'header':
      return { type: 'header', data: { text: cleanInline(data.text), level: clampLevel(data.level) } };
    case 'list':
      return {
        type: 'list',
        data: {
          style: LIST_STYLES.includes(data.style) ? data.style : 'unordered',
          meta: cleanMeta(data.meta),
          items: cleanListItems(Array.isArray(data.items) ? data.items : []),
        },
      };
    case 'quote':
      return { type: 'quote', data: { text: cleanInline(data.text), caption: cleanInline(data.caption), alignment: 'left' } };
    case 'delimiter':
      return { type: 'delimiter', data: {} };
    default:
      return { type: 'paragraph', data: { text: cleanInline(data.text) } };
  }
};

// Normalises Editor.js output before it is stored: strips unsafe HTML and unknown fields.
const sanitizeContent = (content) => ({
  time: Number(content?.time) || Date.now(),
  version: typeof content?.version === 'string' ? content.version : undefined,
  blocks: (content?.blocks || []).filter((b) => BLOCK_TYPES.includes(b?.type)).map(cleanBlock),
});

const emptyContent = () => ({ time: Date.now(), blocks: [] });

module.exports = { BLOCK_TYPES, sanitizeContent, cleanInline, emptyContent };

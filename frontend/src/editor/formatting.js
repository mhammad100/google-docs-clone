/**
 * Formatting commands used by the toolbar and menus.
 *
 * Inline styles (bold, italic…) act on the current text selection inside the editor.
 * Block styles (headings, lists, quote) act on the block that holds the caret, through
 * the Editor.js blocks API.
 */

const INLINE_COMMANDS = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strikethrough: 'strikeThrough',
};

// Wrapper tags produced by the marker / inline-code Editor.js tools
export const WRAPPERS = {
  highlight: { tag: 'mark', className: 'cdx-marker' },
  code: { tag: 'code', className: 'inline-code' },
};

const elementOf = (node) => (node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement);

const closestIn = (node, selector, holder) => {
  const el = elementOf(node)?.closest(selector);
  return el && holder.contains(el) ? el : null;
};

/** Current selection if it is inside the editor, else null. */
export const getEditorSelection = (holder) => {
  const selection = window.getSelection();
  if (!holder || !selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!holder.contains(range.commonAncestorContainer)) return null;
  return { selection, range };
};

const unwrap = (el) => {
  const parent = el.parentNode;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
  parent.normalize();
};

const selectNode = (selection, node) => {
  const range = document.createRange();
  range.selectNodeContents(node);
  selection.removeAllRanges();
  selection.addRange(range);
};

// ---------- Inline ----------

export const toggleInline = (style) => document.execCommand(INLINE_COMMANDS[style]);

/** Wraps the selection in <mark>/<code>, or unwraps it if it is already inside one. */
export const toggleWrapper = (holder, style) => {
  const ctx = getEditorSelection(holder);
  if (!ctx) return { ok: false, reason: 'Click inside the document first' };
  const { tag, className } = WRAPPERS[style];

  const existing = closestIn(ctx.range.commonAncestorContainer, tag, holder);
  if (existing) {
    unwrap(existing);
    return { ok: true };
  }
  if (ctx.range.collapsed) return { ok: false, reason: 'Select some text first' };

  const startBlock = closestIn(ctx.range.startContainer, '.ce-block', holder);
  if (startBlock !== closestIn(ctx.range.endContainer, '.ce-block', holder)) {
    return { ok: false, reason: 'Select text within a single paragraph' };
  }

  const wrapper = document.createElement(tag);
  wrapper.className = className;
  wrapper.appendChild(ctx.range.extractContents());
  ctx.range.insertNode(wrapper);
  selectNode(ctx.selection, wrapper);
  return { ok: true };
};

/** Removes inline formatting (bold, italic, underline, strike, highlight, code, links) from the selection. */
export const clearFormatting = (holder) => {
  const ctx = getEditorSelection(holder);
  if (!ctx || ctx.range.collapsed) return { ok: false, reason: 'Select some text first' };

  document.execCommand('removeFormat');
  document.execCommand('unlink');
  const scope = closestIn(ctx.range.commonAncestorContainer, '.ce-block', holder) || holder;
  scope.querySelectorAll('mark, code, u, s, strike').forEach((el) => {
    if (ctx.range.intersectsNode(el)) unwrap(el);
  });
  return { ok: true };
};

// ---------- Links ----------

export const normalizeUrl = (value) => {
  const url = value.trim();
  if (!url) return null;
  if (/^(https?:|mailto:)/i.test(url)) return url;
  if (/^[\w.-]+@[\w-]+\.[\w.]+$/.test(url)) return `mailto:${url}`;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return null; // javascript:, data:, …
  return `https://${url}`;
};

/** Captures what the link popover needs before focus moves to its input. */
export const captureLinkTarget = (holder) => {
  const ctx = getEditorSelection(holder);
  if (!ctx) return { ok: false, reason: 'Click inside the document first' };

  const anchor = closestIn(ctx.range.commonAncestorContainer, 'a', holder);
  if (!anchor && ctx.range.collapsed) return { ok: false, reason: 'Select the text you want to link' };

  return { ok: true, anchor, range: ctx.range.cloneRange(), href: anchor?.getAttribute('href') || '' };
};

export const applyLink = (target, url) => {
  if (target.anchor) {
    target.anchor.setAttribute('href', url);
    return;
  }
  // Give focus back to the block's editable element, then restore the selection
  elementOf(target.range.startContainer)?.closest('[contenteditable="true"]')?.focus();
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(target.range);
  document.execCommand('createLink', false, url);
};

export const removeLink = (target) => target.anchor && unwrap(target.anchor);

// ---------- Blocks ----------

const resolveIndex = (editor, index) => {
  if (index >= 0 && index < editor.blocks.getBlocksCount()) return index;
  const current = editor.blocks.getCurrentBlockIndex();
  return current >= 0 ? current : editor.blocks.getBlocksCount() - 1;
};

const blockData = async (block) => (await block.save())?.data || {};

const focusBlock = (editor, index) => {
  try {
    editor.caret.setToBlock(index, 'end');
  } catch {
    // block may not be focusable (e.g. a divider)
  }
};

// Each list item (nested ones too) becomes its own line when a list is converted
const flattenItems = (items = []) =>
  items.flatMap((item) => [typeof item === 'string' ? item : item.content, ...flattenItems(item.items)]);

/** The rich-text lines of a block, or null if it has no text (e.g. a divider). */
const blockLines = (name, data) => {
  if (name === 'list') return flattenItems(data.items);
  if (['paragraph', 'header', 'quote'].includes(name)) return [data.text || ''];
  return null;
};

const dataFor = (type, html, options) => {
  switch (type) {
    case 'header':
      return { text: html, level: options.level };
    case 'quote':
      return { text: html, caption: '', alignment: 'left' };
    default:
      return { text: html };
  }
};

/**
 * Replaces the block at `index` with blocks of another type, keeping inline formatting.
 * (Editor.js's own blocks.convert() strips inline tags like <b> and <i>.)
 */
const convertBlock = async (editor, index, type, options = {}) => {
  const block = editor.blocks.getBlockByIndex(index);
  const lines = blockLines(block.name, await blockData(block));
  if (!lines) throw new Error('Block cannot be converted');

  const newBlocks =
    type === 'list'
      ? [{ style: options.style, meta: {}, items: lines.map((content) => ({ content, meta: {}, items: [] })) }]
      : lines.map((html) => dataFor(type, html, options));

  newBlocks.forEach((data, offset) => {
    // The first block replaces the current one, the rest go right after it
    editor.blocks.insert(type, data, undefined, index + offset, offset === 0, offset === 0);
  });
};

/** style: 'paragraph' | 'h1' | 'h2' | 'h3' | 'h4' */
export const setTextStyle = async (editor, index, style) => {
  const i = resolveIndex(editor, index);
  const block = editor.blocks.getBlockByIndex(i);
  if (!block) return;

  if (style === 'paragraph') {
    if (block.name !== 'paragraph') await convertBlock(editor, i, 'paragraph');
  } else {
    const level = Number(style.slice(1));
    if (block.name === 'header') await editor.blocks.update(block.id, { ...(await blockData(block)), level });
    else await convertBlock(editor, i, 'header', { level });
  }
  focusBlock(editor, i);
};

/** style: 'unordered' | 'ordered' | 'checklist'. Applying the active style turns the list back into text. */
export const toggleList = async (editor, index, style) => {
  const i = resolveIndex(editor, index);
  const block = editor.blocks.getBlockByIndex(i);
  if (!block) return;

  if (block.name === 'list') {
    const data = await blockData(block);
    if (data.style === style) await convertBlock(editor, i, 'paragraph');
    else await editor.blocks.update(block.id, { ...data, style });
  } else {
    await convertBlock(editor, i, 'list', { style });
  }
  focusBlock(editor, i);
};

export const toggleQuote = async (editor, index) => {
  const i = resolveIndex(editor, index);
  const block = editor.blocks.getBlockByIndex(i);
  if (!block) return;
  await convertBlock(editor, i, block.name === 'quote' ? 'paragraph' : 'quote');
  focusBlock(editor, i);
};

/** Inserts a horizontal divider after the current block, followed by an empty paragraph. */
export const insertDivider = (editor, index) => {
  const i = resolveIndex(editor, index);
  editor.blocks.insert('delimiter', {}, undefined, i + 1, false);
  editor.blocks.insert('paragraph', { text: '' }, undefined, i + 2, true);
  focusBlock(editor, i + 2);
};

// ---------- State (for active buttons) ----------

const LIST_CLASSES = { 'cdx-list-ordered': 'ordered', 'cdx-list-unordered': 'unordered', 'cdx-list-checklist': 'checklist' };

/** Reads the formatting at the caret so the toolbar can show active states. */
export const readFormatState = (editor, holder) => {
  const ctx = getEditorSelection(holder);
  if (!ctx) return null;

  const node = ctx.range.startContainer;
  const blockEl = closestIn(node, '.ce-block', holder);
  const index = blockEl ? [...holder.querySelectorAll('.ce-block')].indexOf(blockEl) : -1;
  const block = index >= 0 ? editor.blocks.getBlockByIndex(index) : null;

  let textStyle = 'paragraph';
  let listStyle = null;
  if (block?.name === 'header') {
    textStyle = blockEl.querySelector('h1, h2, h3, h4')?.tagName.toLowerCase() || 'h2';
  } else if (block?.name === 'list') {
    const listEl = blockEl.querySelector('.cdx-list');
    listStyle = Object.entries(LIST_CLASSES).find(([cls]) => listEl?.classList.contains(cls))?.[1] || 'unordered';
  }

  return {
    index,
    blockType: block?.name || null,
    textStyle,
    listStyle,
    bold: document.queryCommandState('bold'),
    italic: document.queryCommandState('italic'),
    underline: document.queryCommandState('underline'),
    strikethrough: document.queryCommandState('strikeThrough'),
    highlight: Boolean(closestIn(node, 'mark', holder)),
    code: Boolean(closestIn(node, 'code', holder)),
    link: Boolean(closestIn(node, 'a', holder)),
  };
};

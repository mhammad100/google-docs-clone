// pdfmake 0.2.x on purpose: it is CommonJS all the way down. 0.3 pulls in ESM-only
// dependencies (fontkit) that Vercel's Node runtime cannot require().
const PdfPrinter = require('pdfmake');
const vfsFonts = require('pdfmake/build/vfs_fonts');
const { cleanInline } = require('./content.service');
const { normalizeSettings, pageDimensions } = require('./settings.service');
const { getById } = require('./document.service');

// ---------- pdfmake setup ----------

// Roboto ships base64-encoded inside pdfmake, so no font files have to be deployed.
// Definitions below only ever contain text (no images or file paths), so pdfmake never
// touches the file system or the network.
const fontsVfs = vfsFonts.pdfMake ? vfsFonts.pdfMake.vfs : vfsFonts;
const font = (file) => Buffer.from(fontsVfs[file], 'base64');

const printer = new PdfPrinter({
  Roboto: {
    normal: font('Roboto-Regular.ttf'),
    bold: font('Roboto-Medium.ttf'),
    italics: font('Roboto-Italic.ttf'),
    bolditalics: font('Roboto-MediumItalic.ttf'),
  },
});

const PT_PER_INCH = 72;
const COLORS = { text: '#1f1f1f', muted: '#5f6368', link: '#1a5fd0', rule: '#dadce0', quoteBar: '#c4c7c5' };

// ---------- Inline HTML -> pdfmake text runs ----------

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

const decodeEntities = (text) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[entity.toLowerCase()] ?? match;
  });

// Style for a run of text given the tags it is nested in
const styleFor = (openTags) => {
  const style = {};
  const decoration = new Set();
  for (const { tag, href } of openTags) {
    if (tag === 'b') style.bold = true;
    if (tag === 'i') style.italics = true;
    if (tag === 'u') decoration.add('underline');
    if (tag === 's') decoration.add('lineThrough');
    if (tag === 'mark') style.background = '#fde68a';
    if (tag === 'code') Object.assign(style, { background: '#f1f3f4', color: '#b3261e' });
    if (tag === 'a' && href) {
      Object.assign(style, { link: href, color: COLORS.link });
      decoration.add('underline');
    }
  }
  if (decoration.size) style.decoration = decoration.size === 1 ? [...decoration][0] : [...decoration];
  return style;
};

/**
 * Converts the inline HTML Editor.js stores (b, i, u, s, a, mark, code, br) into pdfmake runs.
 * The HTML is sanitized first, so only that small, well-formed tag set can appear.
 */
const inlineRuns = (html) => {
  const safe = cleanInline(html);
  const runs = [];
  const openTags = [];
  let cursor = 0;

  const pushText = (raw) => {
    if (raw) runs.push({ text: decodeEntities(raw), ...styleFor(openTags) });
  };

  for (const match of safe.matchAll(/<(\/?)([a-z]+)([^>]*)>/gi)) {
    pushText(safe.slice(cursor, match.index));
    cursor = match.index + match[0].length;

    const [, closing, name, attrs] = match;
    const tag = name.toLowerCase();
    if (tag === 'br') {
      runs.push({ text: '\n' });
    } else if (closing) {
      const index = openTags.map((t) => t.tag).lastIndexOf(tag);
      if (index >= 0) openTags.splice(index, 1);
    } else {
      const href = /href="([^"]*)"/i.exec(attrs)?.[1];
      openTags.push({ tag, href: href && decodeEntities(href) });
    }
  }
  pushText(safe.slice(cursor));

  return runs.length ? runs : [{ text: ' ' }]; // keep empty paragraphs as a blank line
};

// ---------- Blocks -> pdfmake content ----------

const HEADINGS = {
  1: { fontSize: 22, margin: [0, 12, 0, 6] },
  2: { fontSize: 17, margin: [0, 10, 0, 4] },
  3: { fontSize: 14, margin: [0, 8, 0, 3] },
  4: { fontSize: 12, margin: [0, 6, 0, 2], color: '#444746' },
};

const listNode = (items, style, meta = {}) => {
  const children = items.map((item) => {
    const content = typeof item === 'string' ? item : item.content;
    const checked = style === 'checklist' && item.meta?.checked;
    const line = { text: inlineRuns(content), ...(checked && { decoration: 'lineThrough', color: COLORS.muted }) };
    return item.items?.length ? { stack: [line, listNode(item.items, style)] } : line;
  });

  if (style === 'ordered') return { ol: children, margin: [0, 0, 0, 6], ...(meta.start > 1 && { start: meta.start }) };
  return { ul: children, type: style === 'checklist' ? 'square' : 'disc', margin: [0, 0, 0, 6] };
};

const blockToContent = (block, contentWidth) => {
  const data = block.data || {};
  switch (block.type) {
    case 'header': {
      const level = HEADINGS[data.level] ? data.level : 2;
      return { text: inlineRuns(data.text), bold: true, ...HEADINGS[level] };
    }
    case 'list':
      return listNode(data.items || [], data.style, data.meta);
    case 'quote':
      // One-cell table whose only visible line is a left bar
      return {
        table: { widths: ['*'], body: [[{ text: inlineRuns(data.text), italics: true, color: '#444746' }]] },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: (i) => (i === 0 ? 2.5 : 0),
          vLineColor: () => COLORS.quoteBar,
          paddingLeft: () => 12,
          paddingTop: () => 2,
          paddingBottom: () => 2,
        },
        margin: [0, 4, 0, 10],
      };
    case 'delimiter':
      return {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: contentWidth, y2: 0, lineWidth: 0.75, lineColor: COLORS.rule }],
        margin: [0, 8, 0, 12],
      };
    default:
      return { text: inlineRuns(data.text), margin: [0, 0, 0, 6] };
  }
};

/**
 * pdfmake document definition for a stored document, honouring its page setup:
 * paper size, orientation, margins, header, footer and page numbers.
 */
const buildPdfDefinition = ({ title, content, settings: rawSettings, owner }) => {
  const settings = normalizeSettings(rawSettings);
  const [widthIn, heightIn] = pageDimensions(settings);
  const pt = (inches) => inches * PT_PER_INCH;
  const { top, right, bottom, left } = settings.margins;
  const margins = [pt(left), pt(top), pt(right), pt(bottom)];
  const contentWidth = pt(widthIn) - margins[0] - margins[2];
  const muted = { fontSize: 9, color: COLORS.muted };

  // Header/footer sit inside the top/bottom margin, like on screen
  const header = settings.header
    ? () => ({ text: settings.header, ...muted, margin: [margins[0], Math.max(margins[1] - 28, 8), margins[2], 0] })
    : undefined;

  const footer =
    settings.footer || settings.showPageNumbers
      ? (currentPage, pageCount) => ({
          columns: [
            { text: settings.footer, ...muted },
            settings.showPageNumbers ? { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', width: 'auto', ...muted } : '',
          ],
          margin: [margins[0], Math.min(18, Math.max(margins[3] / 2 - 4, 4)), margins[2], 0],
        })
      : undefined;

  return {
    info: { title, author: owner?.name, creator: 'Docs', producer: 'Docs' },
    pageSize: { width: pt(widthIn), height: pt(heightIn) },
    pageMargins: margins,
    header,
    footer,
    content: (content?.blocks || []).map((block) => blockToContent(block, contentWidth)),
    defaultStyle: { font: 'Roboto', fontSize: 11, lineHeight: 1.3, color: COLORS.text },
  };
};

/** Renders a pdfmake definition to a Buffer. */
const renderPdf = (definition) =>
  new Promise((resolve, reject) => {
    const doc = printer.createPdfKitDocument(definition);
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });

/** Safe download name: strips characters that are invalid in file names. */
const exportFilename = (title, extension) => {
  const base = String(title || '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
  return `${base || 'Untitled document'}.${extension}`;
};

/** Anyone who can open the document (owner, editor, viewer) can export it. */
const exportPdf = async (documentId, userId) => {
  const document = await getById(documentId, userId);
  const buffer = await renderPdf(buildPdfDefinition(document));
  return { buffer, filename: exportFilename(document.title, 'pdf') };
};

module.exports = { exportPdf, buildPdfDefinition, inlineRuns, renderPdf, exportFilename };

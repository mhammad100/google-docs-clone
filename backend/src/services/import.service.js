const path = require('path');
const { marked } = require('marked');
const ApiError = require('../utils/ApiError');
const { cleanInline } = require('./content.service');

const escapeHtml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Markdown inline syntax (**bold**, *italic*, links...) -> safe inline HTML for Editor.js
const inlineMd = (text) => cleanInline(marked.parseInline(text || ''));

// Plain text: blank lines separate paragraphs, single newlines become <br>
const textToBlocks = (text) =>
  text
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => ({ type: 'paragraph', data: { text: escapeHtml(p).replace(/\r?\n/g, '<br>') } }));

const listItemsFromTokens = (items) =>
  items.map((item) => {
    const textToken = (item.tokens || []).find((t) => t.type === 'text' || t.type === 'paragraph');
    const nested = (item.tokens || []).find((t) => t.type === 'list');
    return {
      content: inlineMd(textToken ? textToken.text : item.text),
      meta: {},
      items: nested ? listItemsFromTokens(nested.items) : [],
    };
  });

const markdownToBlocks = (markdown) => {
  const blocks = [];
  for (const token of marked.lexer(markdown)) {
    switch (token.type) {
      case 'heading':
        blocks.push({ type: 'header', data: { text: inlineMd(token.text), level: Math.min(token.depth, 4) } });
        break;
      case 'paragraph':
        blocks.push({ type: 'paragraph', data: { text: inlineMd(token.text) } });
        break;
      case 'list':
        blocks.push({
          type: 'list',
          data: { style: token.ordered ? 'ordered' : 'unordered', meta: {}, items: listItemsFromTokens(token.items) },
        });
        break;
      case 'blockquote':
        blocks.push({ type: 'quote', data: { text: inlineMd(token.text), caption: '', alignment: 'left' } });
        break;
      case 'hr':
        blocks.push({ type: 'delimiter', data: {} });
        break;
      case 'space':
        break;
      default:
        // code blocks, tables, raw html: keep the text, drop the formatting
        if (token.raw && token.raw.trim()) {
          blocks.push({ type: 'paragraph', data: { text: escapeHtml(token.raw.trim()).replace(/\n/g, '<br>') } });
        }
    }
  }
  return blocks;
};

// Turns an uploaded .txt / .md file (from multer) into { title, content } for a new document.
const fileToDocument = (file) => {
  if (!file) throw ApiError.badRequest('Please choose a .txt or .md file to upload');

  const text = file.buffer.toString('utf8');
  if (text.includes('\u0000')) throw ApiError.badRequest('File does not look like a text file');
  if (!text.trim()) throw ApiError.badRequest('File is empty');

  const ext = path.extname(file.originalname).toLowerCase();
  const blocks = ext === '.md' ? markdownToBlocks(text) : textToBlocks(text);
  const title = path.basename(file.originalname, path.extname(file.originalname)).trim().slice(0, 200) || 'Imported document';

  return { title, content: { time: Date.now(), blocks } };
};

module.exports = { fileToDocument, markdownToBlocks, textToBlocks };

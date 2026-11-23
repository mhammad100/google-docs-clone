const { body, param } = require('express-validator');
const { BLOCK_TYPES } = require('../services/content.service');
const {
  PAGE_SIZES,
  ORIENTATIONS,
  MARGIN_KEYS,
  MAX_MARGIN,
  MAX_HEADER_LENGTH,
} = require('../services/settings.service');

// Page width/height in inches (portrait), used to check margins leave room for text
const PAGE_DIMENSIONS = { letter: [8.5, 11], a4: [8.27, 11.69], legal: [8.5, 14], a5: [5.83, 8.27] };
const MIN_TEXT_AREA = 1; // inch

const MAX_BLOCKS = 5000;

const documentId = param('id').isUUID().withMessage('Document not found');

const title = (optional) => {
  const chain = body('title');
  return (optional ? chain.optional() : chain)
    .isString().withMessage('Title must be text')
    .trim()
    .notEmpty().withMessage('Title cannot be empty')
    .isLength({ max: 200 }).withMessage('Title must be at most 200 characters');
};

// Editor.js output shape: { time?, version?, blocks: [{ type, data }] }
const content = body('content')
  .optional()
  .custom((value) => {
    if (!value || typeof value !== 'object' || !Array.isArray(value.blocks)) {
      throw new Error('Content must be an object with a blocks array');
    }
    if (value.blocks.length > MAX_BLOCKS) throw new Error(`Content can have at most ${MAX_BLOCKS} blocks`);
    value.blocks.forEach((block, i) => {
      if (!block || !BLOCK_TYPES.includes(block.type)) {
        throw new Error(`Block ${i + 1} has an unsupported type`);
      }
      if (block.data && typeof block.data !== 'object') throw new Error(`Block ${i + 1} has invalid data`);
    });
    return true;
  });

// Page setup: { pageSize, orientation, margins: { top, right, bottom, left }, header, footer, showPageNumbers }
const settings = [
  body('settings').optional().isObject().withMessage('Settings must be an object'),
  body('settings.pageSize').optional().isIn(PAGE_SIZES).withMessage(`Page size must be one of: ${PAGE_SIZES.join(', ')}`),
  body('settings.orientation').optional().isIn(ORIENTATIONS).withMessage('Orientation must be portrait or landscape'),
  ...MARGIN_KEYS.map((key) =>
    body(`settings.margins.${key}`)
      .optional()
      .isFloat({ min: 0, max: MAX_MARGIN })
      .withMessage(`${key[0].toUpperCase()}${key.slice(1)} margin must be between 0 and ${MAX_MARGIN} inches`),
  ),
  ...['header', 'footer'].map((key) =>
    body(`settings.${key}`)
      .optional()
      .isString().withMessage(`${key} must be text`)
      .isLength({ max: MAX_HEADER_LENGTH }).withMessage(`${key[0].toUpperCase()}${key.slice(1)} must be at most ${MAX_HEADER_LENGTH} characters`),
  ),
  body('settings.showPageNumbers').optional().isBoolean({ strict: true }).withMessage('showPageNumbers must be true or false'),
  body('settings').optional().custom((value) => {
    if (!value || typeof value !== 'object') return true; // reported by isObject() above
    const [w, h] = PAGE_DIMENSIONS[value.pageSize] || PAGE_DIMENSIONS.a4;
    const [width, height] = value.orientation === 'landscape' ? [h, w] : [w, h];
    const m = value.margins || {};
    const num = (k) => Number(m[k] ?? 1);
    if (width - num('left') - num('right') < MIN_TEXT_AREA || height - num('top') - num('bottom') < MIN_TEXT_AREA) {
      throw new Error('Margins are too large for this page size');
    }
    return true;
  }),
];

const createRules = [title(true), content, ...settings];

const updateRules = [
  documentId,
  title(true),
  content,
  ...settings,
  body().custom((value) => {
    if (value?.title === undefined && value?.content === undefined && value?.settings === undefined) {
      throw new Error('Nothing to update: send a title, content or settings');
    }
    return true;
  }),
];

const idRules = [documentId];

const shareRules = [
  documentId,
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Email is not valid')
    .normalizeEmail({ gmail_remove_dots: false }),
  body('permission')
    .optional()
    .isIn(['view', 'edit']).withMessage('Permission must be "view" or "edit"'),
];

const unshareRules = [documentId, param('userId').isUUID().withMessage('User not found')];

module.exports = { createRules, updateRules, idRules, shareRules, unshareRules };

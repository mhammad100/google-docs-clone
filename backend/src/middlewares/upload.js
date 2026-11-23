const path = require('path');
const multer = require('multer');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const ALLOWED_EXTENSIONS = ['.txt', '.md'];

// Files are kept in memory: they are small text files that we parse immediately.
const uploadTextFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(ApiError.badRequest('Only .txt and .md files are supported'));
    }
    return cb(null, true);
  },
}).single('file');

module.exports = { uploadTextFile, ALLOWED_EXTENSIONS };

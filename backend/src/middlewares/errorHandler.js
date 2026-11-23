const multer = require('multer');
const ApiError = require('../utils/ApiError');
const { sendError } = require('../utils/response');
const env = require('../config/env');

const notFoundHandler = (req, res) =>
  sendError(res, { status: 404, message: `Route ${req.method} ${req.originalUrl} not found`, code: 'NOT_FOUND' });

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return sendError(res, { status: err.status, message: err.message, code: err.code, details: err.details });
  }

  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 1 MB)' : err.message;
    return sendError(res, { status: 400, message, code: 'UPLOAD_ERROR' });
  }

  // Malformed JSON body
  if (err.type === 'entity.parse.failed') {
    return sendError(res, { status: 400, message: 'Request body is not valid JSON', code: 'BAD_REQUEST' });
  }
  if (err.type === 'entity.too.large') {
    return sendError(res, { status: 413, message: 'Request body is too large', code: 'PAYLOAD_TOO_LARGE' });
  }

  // Postgres: invalid uuid input
  if (err.code === '22P02') {
    return sendError(res, { status: 404, message: 'Resource not found', code: 'NOT_FOUND' });
  }

  if (env.nodeEnv !== 'test') console.error(err);
  return sendError(res, { status: 500, message: 'Something went wrong on our side', code: 'INTERNAL_ERROR' });
};

module.exports = { errorHandler, notFoundHandler };

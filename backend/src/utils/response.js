// Every API response uses the same envelope: { data, status, message, error }

const sendSuccess = (res, { data = null, message = 'OK', status = 200 } = {}) =>
  res.status(status).json({ data, status, message, error: null });

const sendError = (res, { status = 500, message = 'Something went wrong', code = 'INTERNAL_ERROR', details = null } = {}) =>
  res.status(status).json({ data: null, status, message, error: { code, details } });

module.exports = { sendSuccess, sendError };

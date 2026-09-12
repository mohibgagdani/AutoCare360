import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

const DUPLICATE_MESSAGES = {
  registrationNumber: 'A vehicle with this registration number already exists in your garage',
  email: 'An account with this email already exists',
  code: 'An item with this code already exists',
};

function normalise(err) {
  if (err instanceof ApiError) return err;

  if (err?.name === 'ValidationError' && err.errors) {
    const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return ApiError.validation(errors);
  }
  if (err?.name === 'CastError') {
    return ApiError.badRequest(`Invalid value for ${err.path}`);
  }
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {}).find((k) => DUPLICATE_MESSAGES[k]) || Object.keys(err.keyPattern || {})[0];
    return ApiError.conflict(DUPLICATE_MESSAGES[field] || 'This record already exists', field ? [{ field, message: DUPLICATE_MESSAGES[field] || 'Already exists' }] : undefined);
  }
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return new ApiError(413, 'File is too large. Please upload a smaller file.');
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return ApiError.badRequest('Too many files or unexpected file field');
    }
    return ApiError.badRequest(`Upload failed: ${err.message}`);
  }
  if (err?.type === 'entity.parse.failed') return ApiError.badRequest('Malformed JSON in request body');
  if (err?.type === 'entity.too.large') return new ApiError(413, 'Request body is too large');
  if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
    return ApiError.unauthorized('Invalid or expired session');
  }
  return null;
}

export function notFound(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, { code: 'ROUTE_NOT_FOUND' }));
}

/** Central error handler — never leaks stack traces or internals to clients. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const known = normalise(err);
  const status = known?.statusCode || 500;

  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} →`, err);
  } else if (status !== 401 && status !== 404) {
    logger.debug(`${req.method} ${req.originalUrl} → ${status} ${known.message}`);
  }

  if (res.headersSent) return;

  res.status(status).json({
    success: false,
    message: known?.message || 'Something went wrong on our side. Please try again.',
    code: known?.code || 'INTERNAL_ERROR',
    ...(known?.errors?.length ? { errors: known.errors } : {}),
  });
}

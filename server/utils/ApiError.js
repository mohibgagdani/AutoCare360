/**
 * Operational error with an HTTP status. Anything thrown that is NOT an ApiError
 * is treated as an unexpected failure and reported generically to the client.
 */
export class ApiError extends Error {
  constructor(statusCode, message, { code, errors } = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code || ApiError.codeFor(statusCode);
    this.errors = errors;
    this.isOperational = true;
  }

  static codeFor(status) {
    return (
      {
        400: 'BAD_REQUEST',
        401: 'UNAUTHORIZED',
        403: 'FORBIDDEN',
        404: 'NOT_FOUND',
        409: 'CONFLICT',
        413: 'PAYLOAD_TOO_LARGE',
        422: 'VALIDATION_ERROR',
        429: 'TOO_MANY_REQUESTS',
      }[status] || 'ERROR'
    );
  }

  static badRequest(message = 'Bad request', errors) {
    return new ApiError(400, message, { errors });
  }

  static validation(errors, message = 'Please check the highlighted fields') {
    return new ApiError(422, message, { errors, code: 'VALIDATION_ERROR' });
  }

  static unauthorized(message = 'Please sign in to continue', code) {
    return new ApiError(401, message, { code });
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new ApiError(403, message);
  }

  static notFound(resource = 'Resource') {
    return new ApiError(404, `${resource} not found`);
  }

  static conflict(message, errors) {
    return new ApiError(409, message, { errors });
  }
}

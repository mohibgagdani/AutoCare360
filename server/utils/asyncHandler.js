/**
 * Wraps an async route handler so rejected promises reach the central error
 * handler. Express 5 already forwards rejections, but wrapping keeps handlers
 * explicit and portable across Express versions.
 */
export const asyncHandler = (fn) =>
  function asyncRoute(req, res, next) {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };

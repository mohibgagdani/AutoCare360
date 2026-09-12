import { ApiError } from '../utils/ApiError.js';

const stripUndefined = (value) => {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)])
    );
  }
  return value;
};

const formatIssues = (issues, location) =>
  issues.map((issue) => ({
    field: issue.path.length ? issue.path.join('.') : location,
    message: issue.message,
  }));

/**
 * Validates req.body / req.query / req.params with zod schemas.
 * Multipart requests send their JSON payload in a `data` field alongside files.
 * Parsed body replaces req.body; parsed query/params are exposed on req.validated.
 */
export const validate =
  ({ body, query, params } = {}) =>
  (req, _res, next) => {
    if (req.body && typeof req.body.data === 'string') {
      try {
        req.body = JSON.parse(req.body.data);
      } catch {
        return next(ApiError.badRequest('Malformed form data'));
      }
    }

    const errors = [];
    req.validated = req.validated || {};

    if (params) {
      const result = params.safeParse(req.params);
      if (result.success) req.validated.params = result.data;
      else errors.push(...formatIssues(result.error.issues, 'params'));
    }
    if (query) {
      const result = query.safeParse(req.query || {});
      if (result.success) req.validated.query = stripUndefined(result.data);
      else errors.push(...formatIssues(result.error.issues, 'query'));
    }
    if (body) {
      const result = body.safeParse(req.body ?? {});
      if (result.success) req.body = stripUndefined(result.data);
      else errors.push(...formatIssues(result.error.issues, 'body'));
    }

    if (errors.length) return next(ApiError.validation(errors));
    return next();
  };

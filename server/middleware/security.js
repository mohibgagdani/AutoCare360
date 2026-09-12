import rateLimit from 'express-rate-limit';

const limitHandler = (message) => (_req, res) =>
  res.status(429).json({ success: false, message, code: 'TOO_MANY_REQUESTS' });

/** General API limiter — generous, protects against scraping/abuse. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1500,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: limitHandler('Too many requests. Please slow down and try again shortly.'),
});

/** Strict limiter for credential endpoints (brute-force protection). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: limitHandler('Too many attempts. Please wait 15 minutes and try again.'),
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: limitHandler('Too many password reset requests. Please try again later.'),
});

const isUnsafeKey = (key) => key.startsWith('$') || key.includes('.');

function scrub(value, depth = 0) {
  if (depth > 12 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    value.forEach((item, i) => {
      value[i] = scrub(item, depth + 1);
    });
    return value;
  }
  for (const key of Object.keys(value)) {
    if (isUnsafeKey(key)) delete value[key];
    else value[key] = scrub(value[key], depth + 1);
  }
  return value;
}

/**
 * Strips MongoDB operator keys ($gt, $where, dotted paths) from user input to
 * prevent NoSQL injection. Express 5 query strings use the "simple" parser
 * (no nested objects), so only body and params need scrubbing.
 */
export function mongoSanitize(req, _res, next) {
  if (req.body) scrub(req.body);
  if (req.params) scrub(req.params);
  next();
}

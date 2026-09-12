import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** Requires a valid access token; attaches the (active) user to req.user. */
export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) throw ApiError.unauthorized('Please sign in to continue', 'NO_TOKEN');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') throw ApiError.unauthorized('Your session has expired', 'TOKEN_EXPIRED');
    throw ApiError.unauthorized('Invalid session, please sign in again', 'INVALID_TOKEN');
  }

  const user = await User.findById(payload.sub).select(
    'name email role isActive passwordChangedAt preferences avatar phone lastStatusSyncAt createdAt'
  );
  if (!user) throw ApiError.unauthorized('This account no longer exists', 'USER_NOT_FOUND');
  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been blocked. Please contact support.', { code: 'ACCOUNT_BLOCKED' });
  }
  if (user.passwordChangedAfter(payload.iat)) {
    throw ApiError.unauthorized('Your password was changed. Please sign in again.', 'SESSION_REVOKED');
  }

  req.user = user;
  next();
});

/** Restricts a route to the given roles. Use after `protect`. */
export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to access this resource'));
    }
    return next();
  };

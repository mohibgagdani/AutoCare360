import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

export const REFRESH_COOKIE = 'ac360_rt';
const MAX_SESSIONS = 8;
const ROTATION_GRACE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const signAccessToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, { expiresIn: env.accessTokenTtl });

const signRefreshToken = (user) =>
  jwt.sign({ sub: String(user._id), jti: crypto.randomUUID() }, env.jwtRefreshSecret, {
    expiresIn: `${env.refreshTokenDays}d`,
  });

const cookieOptions = () => ({
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  path: '/api/auth',
  maxAge: env.refreshTokenDays * DAY_MS,
});

export function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, cookieOptions());
}

export function clearRefreshCookie(res) {
  const { maxAge, ...opts } = cookieOptions();
  res.clearCookie(REFRESH_COOKIE, opts);
}

/**
 * Issues an access + refresh pair and stores the hashed refresh token so it can
 * be rotated and revoked. Uses atomic array updates so concurrent requests
 * (several tabs refreshing at once) never overwrite each other's sessions.
 * Persists any other pending changes on `user` (e.g. lastLoginAt) first.
 */
export async function issueTokens(user, userAgent = '') {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const now = Date.now();

  if (user.isModified?.()) {
    user.$ignore?.('refreshTokens');
    await user.save({ validateModifiedOnly: true });
  }
  // Drop expired sessions and retired (rotated) tokens past the grace window.
  await User.updateOne(
    { _id: user._id },
    {
      $pull: {
        refreshTokens: {
          $or: [{ expiresAt: { $lte: new Date(now) } }, { rotatedAt: { $lte: new Date(now - ROTATION_GRACE_MS) } }],
        },
      },
    }
  );
  await User.updateOne(
    { _id: user._id },
    {
      $push: {
        refreshTokens: {
          $each: [
            {
              tokenHash: hashToken(refreshToken),
              expiresAt: new Date(now + env.refreshTokenDays * DAY_MS),
              userAgent: String(userAgent).slice(0, 300),
              rotatedAt: null,
              createdAt: new Date(now),
            },
          ],
          $slice: -MAX_SESSIONS,
        },
      },
    }
  );
  return { accessToken, refreshToken };
}

/** Validates a refresh token, rotates it, and detects token reuse. */
export async function rotateRefreshToken(token, userAgent) {
  if (!token) throw ApiError.unauthorized('Session expired, please sign in again', 'NO_REFRESH_TOKEN');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtRefreshSecret);
  } catch {
    throw ApiError.unauthorized('Session expired, please sign in again', 'INVALID_REFRESH_TOKEN');
  }

  const user = await User.findById(payload.sub).select('+refreshTokens');
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  if (!user.isActive) throw new ApiError(403, 'Your account has been blocked. Contact support.', { code: 'ACCOUNT_BLOCKED' });

  const hash = hashToken(token);
  const stored = user.refreshTokens.find((t) => t.tokenHash === hash);
  const now = Date.now();
  if (!stored) {
    throw ApiError.unauthorized('Session expired, please sign in again', 'INVALID_REFRESH_TOKEN');
  }
  if (stored.rotatedAt && now - stored.rotatedAt.getTime() > ROTATION_GRACE_MS) {
    // A retired token replayed long after rotation suggests theft — revoke every session.
    await revokeAllSessions(user._id);
    throw ApiError.unauthorized('Session expired, please sign in again', 'REFRESH_TOKEN_REUSED');
  }

  // Retire the presented token but keep it briefly so concurrent refreshes (several tabs) still succeed.
  if (!stored.rotatedAt) {
    await User.updateOne(
      { _id: user._id, 'refreshTokens.tokenHash': hash },
      { $set: { 'refreshTokens.$.rotatedAt': new Date(now) } }
    );
  }
  const tokens = await issueTokens(user, userAgent);
  return { user, ...tokens };
}

export async function revokeRefreshToken(token) {
  if (!token) return;
  const hash = hashToken(token);
  await User.updateOne({ 'refreshTokens.tokenHash': hash }, { $pull: { refreshTokens: { tokenHash: hash } } });
}

export async function revokeAllSessions(userId) {
  await User.updateOne({ _id: userId }, { $set: { refreshTokens: [] } });
}

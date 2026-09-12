import crypto from 'node:crypto';
import { User } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import {
  issueTokens,
  rotateRefreshToken,
  revokeRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
  REFRESH_COOKIE,
} from '../services/tokenService.js';
import { sendPasswordResetEmail, sendWelcomeEmail, isEmailEnabled } from '../services/emailService.js';
import { notify } from '../services/notificationService.js';
import { primaryClientUrl, env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const sessionPayload = (user, accessToken) => ({ user: user.toSafeJSON(), accessToken });

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const exists = await User.exists({ email });
  if (exists) throw ApiError.conflict('An account with this email already exists', [{ field: 'email', message: 'Email already registered' }]);

  const user = await User.create({ name, email, password });
  const { accessToken, refreshToken } = await issueTokens(user, req.get('user-agent'));
  setRefreshCookie(res, refreshToken);

  await notify({
    user: user._id,
    type: 'system',
    severity: 'success',
    title: 'Welcome to AutoCare360 🎉',
    message: 'Add your first vehicle to generate a maintenance schedule tailored to it.',
    link: '/app/vehicles/new',
    dedupeKey: 'welcome',
  });
  sendWelcomeEmail(user).catch(() => {});

  return sendSuccess(res, { status: 201, message: 'Account created', data: sessionPayload(user, accessToken) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password +refreshTokens');
  // Same message for unknown email and wrong password to avoid account enumeration.
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }
  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been blocked. Please contact support.', { code: 'ACCOUNT_BLOCKED' });
  }

  user.lastLoginAt = new Date();
  const { accessToken, refreshToken } = await issueTokens(user, req.get('user-agent'));
  setRefreshCookie(res, refreshToken);
  return sendSuccess(res, { message: `Welcome back, ${user.name.split(' ')[0]}!`, data: sessionPayload(user, accessToken) });
});

export const refresh = asyncHandler(async (req, res) => {
  try {
    const { user, accessToken, refreshToken } = await rotateRefreshToken(req.cookies?.[REFRESH_COOKIE], req.get('user-agent'));
    setRefreshCookie(res, refreshToken);
    return sendSuccess(res, { data: sessionPayload(user, accessToken) });
  } catch (error) {
    clearRefreshCookie(res);
    throw error;
  }
});

export const logout = asyncHandler(async (req, res) => {
  await revokeRefreshToken(req.cookies?.[REFRESH_COOKIE]);
  clearRefreshCookie(res);
  return sendSuccess(res, { message: 'Signed out' });
});

export const me = asyncHandler(async (req, res) => sendSuccess(res, { data: { user: req.user.toSafeJSON() } }));

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email, isActive: true });
  if (user) {
    const token = user.createPasswordResetToken();
    await user.save({ validateModifiedOnly: true });
    const resetUrl = `${primaryClientUrl}/reset-password/${token}`;
    await sendPasswordResetEmail(user, resetUrl);
    if (!isEmailEnabled && !env.isProd) logger.info(`[dev] Password reset link for ${user.email}: ${resetUrl}`);
  }
  // Always respond identically so the endpoint can't be used to discover accounts.
  return sendSuccess(res, {
    message: 'If an account exists for that email, a password reset link has been sent.',
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires +refreshTokens');
  if (!user) throw ApiError.badRequest('This reset link is invalid or has expired. Please request a new one.');

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokens = [];
  await user.save();

  await notify({
    user: user._id,
    type: 'system',
    severity: 'info',
    title: 'Your password was changed',
    message: "If this wasn't you, reset your password immediately and contact support.",
  });
  return sendSuccess(res, { message: 'Password updated. You can now sign in with your new password.' });
});

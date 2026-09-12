import { User } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadFile, deleteFile } from '../services/storageService.js';
import { issueTokens, setRefreshCookie } from '../services/tokenService.js';

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (req.body.email && req.body.email !== user.email) {
    const taken = await User.exists({ email: req.body.email, _id: { $ne: user._id } });
    if (taken) throw ApiError.conflict('This email is already in use', [{ field: 'email', message: 'Email already in use' }]);
  }
  Object.assign(user, req.body);
  await user.save();
  return sendSuccess(res, { message: 'Profile updated', data: { user: user.toSafeJSON() } });
});

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password +refreshTokens');
  if (!(await user.comparePassword(req.body.currentPassword))) {
    throw ApiError.validation([{ field: 'currentPassword', message: 'Current password is incorrect' }], 'Current password is incorrect');
  }
  user.password = req.body.newPassword;
  user.refreshTokens = []; // sign out other devices
  await user.save();

  // Keep the current device signed in with a fresh session.
  const { accessToken, refreshToken } = await issueTokens(user, req.get('user-agent'));
  setRefreshCookie(res, refreshToken);
  return sendSuccess(res, { message: 'Password changed. Other devices have been signed out.', data: { accessToken } });
});

export const updatePreferences = asyncHandler(async (req, res) => {
  const set = Object.fromEntries(Object.entries(req.body).map(([k, v]) => [`preferences.${k}`, v]));
  const user = await User.findByIdAndUpdate(req.user._id, { $set: set }, { returnDocument: 'after', runValidators: true });
  return sendSuccess(res, { message: 'Preferences saved', data: { user: user.toSafeJSON() } });
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Please choose an image to upload');
  const user = await User.findById(req.user._id);
  const previous = user.avatar;
  const file = await uploadFile(req.file, 'avatars');
  user.avatar = { url: file.url, publicId: file.publicId, provider: file.provider };
  await user.save();
  if (previous?.publicId) await deleteFile({ ...previous, resourceType: 'image' });
  return sendSuccess(res, { message: 'Profile photo updated', data: { user: user.toSafeJSON() } });
});

export const removeAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user.avatar?.publicId) await deleteFile({ ...user.avatar.toObject?.(), resourceType: 'image' });
  user.avatar = undefined;
  await user.save();
  return sendSuccess(res, { message: 'Profile photo removed', data: { user: user.toSafeJSON() } });
});

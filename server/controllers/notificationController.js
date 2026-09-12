import { Notification } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { getPagination, paginate } from '../utils/pagination.js';
import { toList } from '../utils/helpers.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const filter = { user: req.user._id };
  if (req.query.unread === 'true') filter.read = false;
  const types = toList(req.query.type);
  if (types.length) filter.type = { $in: types };
  const { items, meta } = await paginate(Notification, filter, { page, limit, skip, sort: { createdAt: -1, _id: -1 } });
  meta.unread = await Notification.countDocuments({ user: req.user._id, read: false });
  return sendSuccess(res, { data: items, meta });
});

export const unreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ user: req.user._id, read: false });
  return sendSuccess(res, { data: { count } });
});

export const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: { read: true, readAt: new Date() } },
    { returnDocument: 'after' }
  );
  if (!notification) throw ApiError.notFound('Notification');
  return sendSuccess(res, { data: notification });
});

export const markAllRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true, readAt: new Date() } });
  return sendSuccess(res, { message: 'All notifications marked as read', data: { updated: result.modifiedCount } });
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const result = await Notification.deleteOne({ _id: req.params.id, user: req.user._id });
  if (!result.deletedCount) throw ApiError.notFound('Notification');
  return sendSuccess(res, { message: 'Notification removed' });
});

export const clearRead = asyncHandler(async (req, res) => {
  const result = await Notification.deleteMany({ user: req.user._id, read: true });
  return sendSuccess(res, { message: 'Cleared read notifications', data: { deleted: result.deletedCount } });
});

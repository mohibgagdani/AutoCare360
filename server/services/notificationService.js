import { Notification, User } from '../models/index.js';
import { sendAlertEmail, isEmailEnabled } from './emailService.js';
import { logger } from '../utils/logger.js';

/**
 * Creates an in-app notification. Duplicate dedupe keys are silently ignored so
 * callers can raise the same alert repeatedly without spamming users.
 * Optionally mirrors important notifications to email (respecting preferences).
 */
export async function notify(payload, { email = false } = {}) {
  try {
    const notification = await Notification.create(payload);
    if (email && isEmailEnabled) {
      const user = await User.findById(payload.user).select('email name preferences isActive').lean();
      if (user?.isActive && user.preferences?.emailNotifications !== false) {
        await sendAlertEmail(user, payload);
      }
    }
    return notification;
  } catch (error) {
    if (error?.code === 11000) return null;
    logger.error(`Failed to create notification: ${error.message}`);
    return null;
  }
}

export const notifyMany = (payloads, options) => Promise.all(payloads.map((p) => notify(p, options)));

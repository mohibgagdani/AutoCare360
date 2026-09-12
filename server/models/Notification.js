import mongoose from 'mongoose';
import { NOTIFICATION_TYPES, SEVERITIES } from '../constants/enums.js';
import { toJSONOptions } from './schemas.js';

const NOTIFICATION_TTL_SECONDS = 120 * 24 * 60 * 60;

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: 'system' },
    severity: { type: String, enum: SEVERITIES, default: 'info' },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, trim: true, maxlength: 600 },
    link: { type: String, trim: true, maxlength: 300 },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    read: { type: Boolean, default: false },
    readAt: Date,
    // Prevents the same alert being raised twice (e.g. task X overdue).
    dedupeKey: { type: String, default: null },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index(
  { user: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } }
);
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: NOTIFICATION_TTL_SECONDS });

export const Notification = mongoose.model('Notification', notificationSchema);

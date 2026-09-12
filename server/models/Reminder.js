import mongoose from 'mongoose';
import { REMINDER_TYPES, REMINDER_STATUSES, REMINDER_SOURCES, REMINDER_REPEAT } from '../constants/enums.js';
import { toJSONOptions } from './schemas.js';

const reminderSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null, index: true },
    type: { type: String, enum: REMINDER_TYPES, default: 'custom' },
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 140 },
    description: { type: String, trim: true, maxlength: 600 },
    dueDate: { type: Date, required: [true, 'Due date is required'] },
    remindBeforeDays: { type: Number, min: 0, max: 365, default: 15 },
    repeat: { type: String, enum: REMINDER_REPEAT, default: 'none' },
    status: { type: String, enum: REMINDER_STATUSES, default: 'active', index: true },
    source: { type: String, enum: REMINDER_SOURCES, default: 'manual' },
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'MaintenanceTask', default: null },
    notifyByEmail: { type: Boolean, default: true },
    notifiedStages: { type: [String], default: [] },
    lastNotifiedAt: Date,
    completedAt: Date,
  },
  { timestamps: true, toJSON: toJSONOptions, toObject: { virtuals: true } }
);

reminderSchema.index({ owner: 1, status: 1, dueDate: 1 });
reminderSchema.index({ status: 1, dueDate: 1 });
reminderSchema.index({ vehicle: 1, source: 1, type: 1 });
reminderSchema.index({ task: 1 }, { unique: true, partialFilterExpression: { task: { $type: 'objectId' } } });
reminderSchema.index({ document: 1 }, { unique: true, partialFilterExpression: { document: { $type: 'objectId' } } });

export const Reminder = mongoose.model('Reminder', reminderSchema);

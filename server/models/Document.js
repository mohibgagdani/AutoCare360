import mongoose from 'mongoose';
import { DOCUMENT_TYPES } from '../constants/enums.js';
import { fileSchema, toJSONOptions } from './schemas.js';
import { diffInDays } from '../utils/dates.js';

const documentSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Optional: licences and personal documents are not tied to a vehicle.
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null, index: true },
    name: { type: String, required: [true, 'Document name is required'], trim: true, maxlength: 120 },
    type: { type: String, enum: DOCUMENT_TYPES, required: [true, 'Document type is required'] },
    documentNumber: { type: String, trim: true, maxlength: 60 },
    issuer: { type: String, trim: true, maxlength: 120 },
    issueDate: Date,
    expiryDate: { type: Date, index: true },
    uploadDate: { type: Date, default: Date.now },
    file: fileSchema,
    notes: { type: String, trim: true, maxlength: 1000 },
    reminderDaysBefore: { type: Number, min: 1, max: 365, default: 30 },
    reminder: { type: mongoose.Schema.Types.ObjectId, ref: 'Reminder', default: null },
  },
  { timestamps: true, toJSON: toJSONOptions, toObject: { virtuals: true } }
);

documentSchema.index({ owner: 1, type: 1 });
documentSchema.index({ owner: 1, expiryDate: 1 });

/** valid | expiring_soon | expired | no_expiry */
export function documentExpiryStatus(doc, now = new Date()) {
  if (!doc.expiryDate) return { status: 'no_expiry', daysLeft: null };
  const daysLeft = diffInDays(doc.expiryDate, now);
  if (daysLeft < 0) return { status: 'expired', daysLeft };
  if (daysLeft <= (doc.reminderDaysBefore || 30)) return { status: 'expiring_soon', daysLeft };
  return { status: 'valid', daysLeft };
}

documentSchema.virtual('expiry').get(function expiry() {
  return documentExpiryStatus(this);
});

export const Document = mongoose.model('Document', documentSchema);

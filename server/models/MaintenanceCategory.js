import mongoose from 'mongoose';
import { toJSONOptions } from './schemas.js';

const maintenanceCategorySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9_]+$/, 'Code may only contain lowercase letters, numbers and underscores'],
    },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 300 },
    icon: { type: String, default: 'wrench' },
    color: { type: String, default: '#3b82f6', match: /^#[0-9a-fA-F]{6}$/ },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

export const MaintenanceCategory = mongoose.model('MaintenanceCategory', maintenanceCategorySchema);

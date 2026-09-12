import mongoose from 'mongoose';
import { POWERTRAINS } from '../constants/enums.js';
import { toJSONOptions } from './schemas.js';

const fuelTypeSchema = new mongoose.Schema(
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
    powertrain: { type: String, enum: POWERTRAINS, required: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

export const FuelType = mongoose.model('FuelType', fuelTypeSchema);

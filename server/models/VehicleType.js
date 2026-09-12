import mongoose from 'mongoose';
import { VEHICLE_GROUPS, VEHICLE_ILLUSTRATIONS, USAGE_UNITS } from '../constants/enums.js';
import { toJSONOptions } from './schemas.js';

const vehicleTypeSchema = new mongoose.Schema(
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
    // The group drives template inheritance: a new type in an existing group
    // automatically receives that group's maintenance templates.
    group: { type: String, enum: VEHICLE_GROUPS, required: true, index: true },
    illustration: { type: String, enum: VEHICLE_ILLUSTRATIONS, default: 'sedan' },
    usageUnit: { type: String, enum: USAGE_UNITS, default: 'km' },
    allowedFuelTypes: { type: [String], default: [] },
    description: { type: String, trim: true, maxlength: 300 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

export const VehicleType = mongoose.model('VehicleType', vehicleTypeSchema);

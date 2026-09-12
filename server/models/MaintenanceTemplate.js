import mongoose from 'mongoose';
import { PRIORITIES, SERVICE_MODES, POWERTRAINS, TRANSMISSIONS, VEHICLE_GROUPS } from '../constants/enums.js';
import { toJSONOptions } from './schemas.js';

const maintenanceTemplateSchema = new mongoose.Schema(
  {
    // Templates sharing a code override each other; the most specific match wins
    // (e.g. a Royal Enfield engine-oil template replaces the generic motorcycle one).
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9_]+$/, 'Code may only contain letters, numbers and underscores'],
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 600 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'MaintenanceCategory', required: true },

    vehicleTypes: { type: [String], default: [] },
    vehicleGroups: { type: [{ type: String, enum: VEHICLE_GROUPS }], default: [] },
    fuelTypes: { type: [String], default: [] },
    powertrains: { type: [{ type: String, enum: POWERTRAINS }], default: [] },
    transmissions: { type: [{ type: String, enum: TRANSMISSIONS }], default: [] },
    makes: { type: [String], default: [] },
    excludeMakes: { type: [String], default: [] },
    models: { type: [String], default: [] },

    intervalKm: { type: Number, min: 1, default: null },
    intervalMonths: { type: Number, min: 1, max: 240, default: null },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    estimatedCost: { type: Number, min: 0, default: 0 },
    estimatedDurationMinutes: { type: Number, min: 0, default: 30 },
    serviceMode: { type: String, enum: SERVICE_MODES, default: 'professional' },
    notes: { type: String, trim: true, maxlength: 600 },
    isRecurring: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

maintenanceTemplateSchema.index({ code: 1 });
maintenanceTemplateSchema.index({ isActive: 1, vehicleGroups: 1 });
maintenanceTemplateSchema.index({ isActive: 1, vehicleTypes: 1 });
maintenanceTemplateSchema.index({ name: 'text', description: 'text' });

maintenanceTemplateSchema.pre('validate', function requireInterval() {
  if (!this.intervalKm && !this.intervalMonths) {
    this.invalidate('intervalKm', 'Provide an interval in kilometres/hours, months, or both');
  }
  if (!this.vehicleTypes.length && !this.vehicleGroups.length) {
    this.invalidate('vehicleTypes', 'Select at least one vehicle type or vehicle group');
  }
});

export const MaintenanceTemplate = mongoose.model('MaintenanceTemplate', maintenanceTemplateSchema);

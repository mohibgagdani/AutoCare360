import mongoose from 'mongoose';
import { TRANSMISSIONS, VEHICLE_STATUSES, TASK_STATUS_VALUES } from '../constants/enums.js';
import { fileSchema, toJSONOptions } from './schemas.js';

const odometerLogSchema = new mongoose.Schema(
  {
    value: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    source: { type: String, enum: ['initial', 'manual', 'service', 'expense', 'maintenance'], default: 'manual' },
  },
  { _id: false }
);

const noteEntrySchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 120 },
    body: { type: String, trim: true, required: true, maxlength: 4000 },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const vehicleSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vehicleType: { type: String, required: [true, 'Vehicle type is required'], lowercase: true, trim: true },
    make: { type: String, required: [true, 'Make is required'], trim: true, maxlength: 60 },
    model: { type: String, required: [true, 'Model is required'], trim: true, maxlength: 60 },
    variant: { type: String, trim: true, maxlength: 80 },
    nickname: { type: String, trim: true, maxlength: 60 },
    year: {
      type: Number,
      min: [1900, 'Year looks too old'],
      max: [new Date().getFullYear() + 1, 'Year cannot be in the future'],
    },
    registrationNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      uppercase: true,
      trim: true,
      maxlength: 20,
    },
    vin: { type: String, uppercase: true, trim: true, maxlength: 30 },
    engineNumber: { type: String, uppercase: true, trim: true, maxlength: 30 },
    fuelType: { type: String, required: [true, 'Fuel type is required'], lowercase: true, trim: true },
    secondaryFuelType: { type: String, lowercase: true, trim: true, default: null },
    transmission: { type: String, enum: TRANSMISSIONS, default: 'manual' },
    purchaseDate: Date,
    purchasePrice: { type: Number, min: 0 },
    purchaseOdometer: { type: Number, min: 0, default: 0 },
    odometer: { type: Number, min: 0, default: 0 },
    odometerUpdatedAt: { type: Date, default: Date.now },
    odometerLogs: { type: [odometerLogSchema], default: [] },
    color: { type: String, default: '#3b82f6', match: /^#[0-9a-fA-F]{6}$/ },
    image: fileSchema,
    notes: { type: String, trim: true, maxlength: 2000 },
    noteEntries: { type: [noteEntrySchema], default: [] },
    status: { type: String, enum: VEHICLE_STATUSES, default: 'active', index: true },

    // Template codes the owner removed from this vehicle's schedule; sync skips them.
    excludedMaintenanceCodes: { type: [String], default: [] },
    lastServiceDate: Date,
    lastServiceOdometer: Number,
    healthScore: { type: Number, min: 0, max: 100, default: 100 },
    healthLabel: { type: String, default: 'excellent' },
    nextService: {
      task: { type: mongoose.Schema.Types.ObjectId, ref: 'MaintenanceTask' },
      name: String,
      date: Date,
      odometer: Number,
      status: { type: String, enum: TASK_STATUS_VALUES },
    },
    openTaskCounts: {
      overdue: { type: Number, default: 0 },
      due: { type: Number, default: 0 },
      dueSoon: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
  },
  { timestamps: true, toJSON: toJSONOptions, toObject: { virtuals: true } }
);

vehicleSchema.index({ owner: 1, registrationNumber: 1 }, { unique: true });
vehicleSchema.index({ owner: 1, createdAt: -1 });
vehicleSchema.index({ owner: 1, vehicleType: 1 });
vehicleSchema.index({ make: 1, model: 1 });

vehicleSchema.virtual('displayName').get(function displayName() {
  return this.nickname || `${this.make} ${this.model}`.trim();
});

vehicleSchema.pre('validate', function normaliseRegistration() {
  if (this.registrationNumber) {
    this.registrationNumber = this.registrationNumber.replace(/\s+/g, ' ').trim().toUpperCase();
  }
  if (this.secondaryFuelType && this.secondaryFuelType === this.fuelType) this.secondaryFuelType = null;
});

export const Vehicle = mongoose.model('Vehicle', vehicleSchema);

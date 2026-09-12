import mongoose from 'mongoose';
import { SERVICE_TYPES } from '../constants/enums.js';
import { fileSchema, toJSONOptions } from './schemas.js';

const serviceItemSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'MaintenanceTask', default: null },
    code: { type: String, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'MaintenanceCategory', default: null },
  },
  { _id: false }
);

const partSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    partNumber: { type: String, trim: true, maxlength: 60 },
    quantity: { type: Number, min: 0, default: 1 },
    unitPrice: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const serviceRecordSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    serviceDate: { type: Date, required: [true, 'Service date is required'] },
    odometer: { type: Number, required: [true, 'Odometer reading is required'], min: 0 },
    serviceCenter: { type: String, trim: true, maxlength: 120 },
    serviceCenterLocation: { type: String, trim: true, maxlength: 160 },
    mechanic: { type: String, trim: true, maxlength: 80 },
    serviceType: { type: String, enum: SERVICE_TYPES, default: 'periodic_service' },
    maintenanceItems: { type: [serviceItemSchema], default: [] },
    partsReplaced: { type: [partSchema], default: [] },
    laborCost: { type: Number, min: 0, default: 0 },
    partsCost: { type: Number, min: 0, default: 0 },
    taxes: { type: Number, min: 0, default: 0 },
    discount: { type: Number, min: 0, default: 0 },
    totalCost: { type: Number, min: 0, default: 0 },
    rating: { type: Number, min: 1, max: 5 },
    notes: { type: String, trim: true, maxlength: 2000 },
    invoice: fileSchema,
    photos: { type: [fileSchema], default: [] },
    expense: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', default: null },
  },
  { timestamps: true, toJSON: toJSONOptions, toObject: { virtuals: true } }
);

serviceRecordSchema.index({ owner: 1, serviceDate: -1 });
serviceRecordSchema.index({ vehicle: 1, serviceDate: -1 });
serviceRecordSchema.index({ owner: 1, serviceCenter: 1 });

/** Parts cost defaults to the sum of the parts list; total = labour + parts + taxes − discount. */
serviceRecordSchema.pre('validate', function computeTotals() {
  const partsFromList = (this.partsReplaced || []).reduce(
    (acc, p) => acc + (Number(p.quantity) || 0) * (Number(p.unitPrice) || 0),
    0
  );
  if (partsFromList > 0 && (!this.partsCost || this.isModified('partsReplaced'))) {
    this.partsCost = Math.round(partsFromList * 100) / 100;
  }
  const total = (this.laborCost || 0) + (this.partsCost || 0) + (this.taxes || 0) - (this.discount || 0);
  this.totalCost = Math.max(0, Math.round(total * 100) / 100);
});

export const ServiceRecord = mongoose.model('ServiceRecord', serviceRecordSchema);

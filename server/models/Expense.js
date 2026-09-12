import mongoose from 'mongoose';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, FUEL_UNITS } from '../constants/enums.js';
import { fileSchema, toJSONOptions } from './schemas.js';

const expenseSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: [true, 'Category is required'] },
    amount: { type: Number, required: [true, 'Amount is required'], min: [0, 'Amount cannot be negative'] },
    date: { type: Date, required: [true, 'Date is required'] },
    odometer: { type: Number, min: 0 },
    description: { type: String, trim: true, maxlength: 200 },
    vendor: { type: String, trim: true, maxlength: 120 },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'upi' },
    fuelDetails: {
      quantity: { type: Number, min: 0 },
      unit: { type: String, enum: FUEL_UNITS },
      pricePerUnit: { type: Number, min: 0 },
      fullTank: { type: Boolean, default: false },
    },
    serviceRecord: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRecord', default: null },
    receipt: fileSchema,
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true, toJSON: toJSONOptions, toObject: { virtuals: true } }
);

expenseSchema.index({ owner: 1, date: -1 });
expenseSchema.index({ vehicle: 1, date: -1 });
expenseSchema.index({ owner: 1, category: 1, date: -1 });

export const Expense = mongoose.model('Expense', expenseSchema);

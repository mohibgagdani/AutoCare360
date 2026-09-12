import mongoose from 'mongoose';
import { PRIORITIES, SERVICE_MODES, TASK_STATUS_VALUES, OPEN_TASK_STATUSES } from '../constants/enums.js';
import { toJSONOptions } from './schemas.js';

/**
 * One occurrence of a maintenance item for a vehicle. Completing or skipping an
 * occurrence closes it (isOpen=false) and the scheduler opens the next one.
 */
const maintenanceTaskSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'MaintenanceTemplate', default: null },
    code: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 600 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'MaintenanceCategory', required: true },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    serviceMode: { type: String, enum: SERVICE_MODES, default: 'professional' },
    isRecurring: { type: Boolean, default: true },
    isCustom: { type: Boolean, default: false },

    intervalKm: { type: Number, min: 1, default: null },
    intervalMonths: { type: Number, min: 1, default: null },
    estimatedCost: { type: Number, min: 0, default: 0 },
    estimatedDurationMinutes: { type: Number, min: 0, default: 30 },

    lastPerformedDate: Date,
    lastPerformedOdometer: Number,
    baselineEstimated: { type: Boolean, default: false },
    nextDueDate: { type: Date, index: true },
    nextDueOdometer: Number,
    isRescheduled: { type: Boolean, default: false },
    rescheduleReason: { type: String, trim: true, maxlength: 300 },

    status: { type: String, enum: TASK_STATUS_VALUES, default: 'up_to_date', index: true },
    isOpen: { type: Boolean, default: true },
    dueBy: { type: String, enum: ['date', 'odometer', null], default: null },

    completedAt: Date,
    completedOdometer: Number,
    actualCost: { type: Number, min: 0 },
    serviceRecord: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRecord', default: null },
    skippedAt: Date,
    skipReason: { type: String, trim: true, maxlength: 300 },
    notes: { type: String, trim: true, maxlength: 1000 },
    lastNotifiedStatus: { type: String, default: null },
  },
  { timestamps: true, toJSON: toJSONOptions, toObject: { virtuals: true } }
);

// One open occurrence per vehicle + maintenance code.
maintenanceTaskSchema.index(
  { vehicle: 1, code: 1 },
  { unique: true, partialFilterExpression: { isOpen: true }, name: 'one_open_task_per_code' }
);
maintenanceTaskSchema.index({ owner: 1, status: 1, nextDueDate: 1 });
maintenanceTaskSchema.index({ owner: 1, isOpen: 1, priority: 1 });
maintenanceTaskSchema.index({ vehicle: 1, code: 1, completedAt: -1 });
maintenanceTaskSchema.index({ owner: 1, completedAt: -1 });

maintenanceTaskSchema.pre('validate', function syncOpenFlag() {
  this.isOpen = OPEN_TASK_STATUSES.includes(this.status);
});

export const MaintenanceTask = mongoose.model('MaintenanceTask', maintenanceTaskSchema);

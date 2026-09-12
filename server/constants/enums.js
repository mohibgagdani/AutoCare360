// Central enum definitions shared by models, validators and services.
// Dynamic catalogs (vehicle types, fuel types, categories, templates) live in the
// database so admins can extend them without code changes.

export const ROLES = Object.freeze({ USER: 'user', ADMIN: 'admin' });
export const ROLE_VALUES = Object.values(ROLES);

export const VEHICLE_GROUPS = [
  'passenger',
  'two_wheeler',
  'light_commercial',
  'heavy_commercial',
  'agricultural',
  'construction',
  'towable',
  'other',
];

export const VEHICLE_ILLUSTRATIONS = [
  'sedan',
  'hatchback',
  'suv',
  'mpv',
  'pickup',
  'van',
  'minitruck',
  'truck',
  'bus',
  'motorcycle',
  'scooter',
  'tractor',
  'excavator',
  'trailer',
];

export const USAGE_UNITS = ['km', 'hours'];

export const POWERTRAINS = ['ice', 'hybrid', 'ev', 'fcev'];

export const TRANSMISSIONS = ['manual', 'automatic', 'amt', 'cvt', 'dct', 'single_speed', 'other'];

export const VEHICLE_STATUSES = ['active', 'sold', 'archived'];

export const TASK_STATUS = Object.freeze({
  UP_TO_DATE: 'up_to_date',
  DUE_SOON: 'due_soon',
  DUE: 'due',
  OVERDUE: 'overdue',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
});
export const TASK_STATUS_VALUES = Object.values(TASK_STATUS);
export const OPEN_TASK_STATUSES = [
  TASK_STATUS.UP_TO_DATE,
  TASK_STATUS.DUE_SOON,
  TASK_STATUS.DUE,
  TASK_STATUS.OVERDUE,
];
export const ATTENTION_STATUSES = [TASK_STATUS.DUE, TASK_STATUS.OVERDUE];

export const PRIORITIES = ['low', 'medium', 'high', 'critical'];
export const SERVICE_MODES = ['diy', 'professional', 'either'];

export const SERVICE_TYPES = [
  'periodic_service',
  'repair',
  'inspection',
  'breakdown',
  'accident_repair',
  'warranty',
  'recall',
  'tyre_service',
  'other',
];

export const EXPENSE_CATEGORIES = [
  'fuel',
  'charging',
  'maintenance',
  'repairs',
  'insurance',
  'registration',
  'taxes',
  'parking',
  'toll',
  'accessories',
  'cleaning',
  'tyres',
  'parts',
  'other',
];

export const PAYMENT_METHODS = ['cash', 'card', 'upi', 'net_banking', 'wallet', 'fleet_card', 'other'];
export const FUEL_UNITS = ['L', 'kg', 'kWh'];

export const DOCUMENT_TYPES = [
  'registration_certificate',
  'insurance',
  'pollution_certificate',
  'warranty',
  'service_invoice',
  'purchase_document',
  'driving_license',
  'fitness_certificate',
  'permit',
  'other',
];

export const REMINDER_TYPES = [
  'maintenance_due',
  'maintenance_overdue',
  'insurance_expiry',
  'registration_expiry',
  'pollution_expiry',
  'warranty_expiry',
  'license_expiry',
  'document_expiry',
  'custom',
];
export const REMINDER_STATUSES = ['active', 'completed', 'dismissed'];
export const REMINDER_SOURCES = ['manual', 'document', 'maintenance'];
export const REMINDER_REPEAT = ['none', 'monthly', 'yearly'];

// Maps a document type to the reminder type it generates when it has an expiry date.
export const DOCUMENT_REMINDER_TYPE = Object.freeze({
  insurance: 'insurance_expiry',
  registration_certificate: 'registration_expiry',
  pollution_certificate: 'pollution_expiry',
  warranty: 'warranty_expiry',
  driving_license: 'license_expiry',
});

export const NOTIFICATION_TYPES = ['maintenance', 'reminder', 'document', 'service', 'expense', 'system'];
export const SEVERITIES = ['info', 'success', 'warning', 'critical'];

export const HEALTH_LABELS = [
  { min: 90, label: 'excellent' },
  { min: 75, label: 'good' },
  { min: 50, label: 'needs_attention' },
  { min: 0, label: 'critical' },
];

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'];
export const THEMES = ['light', 'dark', 'system'];

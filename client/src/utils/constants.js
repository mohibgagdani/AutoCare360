import {
  CircleCheck,
  Clock,
  AlertTriangle,
  CircleAlert,
  CheckCheck,
  SkipForward,
  Fuel,
  BatteryCharging,
  Wrench,
  Hammer,
  ShieldCheck,
  FileBadge,
  Landmark,
  ParkingCircle,
  Route,
  Sparkles,
  Sparkle,
  CircleDot,
  Package,
  Receipt,
  FileText,
  Leaf,
  BadgeCheck,
  IdCard,
  ClipboardCheck,
  ScrollText,
  File,
  ShoppingBag,
  Bell,
  Cog,
  Disc,
  Settings2,
  MoveVertical,
  Zap,
  Snowflake,
  Link,
  Droplets,
  Car,
  Info,
} from 'lucide-react';

/** Maintenance task statuses — tone maps to Badge colours. */
export const TASK_STATUS = {
  up_to_date: { label: 'Up to date', tone: 'green', icon: CircleCheck, order: 3 },
  due_soon: { label: 'Due soon', tone: 'yellow', icon: Clock, order: 2 },
  due: { label: 'Due', tone: 'orange', icon: AlertTriangle, order: 1 },
  overdue: { label: 'Overdue', tone: 'red', icon: CircleAlert, order: 0 },
  completed: { label: 'Completed', tone: 'blue', icon: CheckCheck, order: 4 },
  skipped: { label: 'Skipped', tone: 'gray', icon: SkipForward, order: 5 },
};
export const OPEN_STATUSES = ['overdue', 'due', 'due_soon', 'up_to_date'];

export const PRIORITY = {
  critical: { label: 'Critical', tone: 'red', rank: 0 },
  high: { label: 'High', tone: 'orange', rank: 1 },
  medium: { label: 'Medium', tone: 'blue', rank: 2 },
  low: { label: 'Low', tone: 'gray', rank: 3 },
};

export const SERVICE_MODE = {
  diy: { label: 'DIY', tone: 'teal' },
  professional: { label: 'Professional', tone: 'violet' },
  either: { label: 'DIY or Pro', tone: 'gray' },
};

export const HEALTH = {
  excellent: { label: 'Excellent', tone: 'green', color: 'var(--status-good)' },
  good: { label: 'Good', tone: 'blue', color: 'var(--chart-1)' },
  needs_attention: { label: 'Needs attention', tone: 'yellow', color: 'var(--status-warning)' },
  critical: { label: 'Critical', tone: 'red', color: 'var(--status-critical)' },
};
export const healthKey = (score) =>
  score >= 90 ? 'excellent' : score >= 75 ? 'good' : score >= 50 ? 'needs_attention' : 'critical';

export const EXPENSE_CATEGORIES = {
  fuel: { label: 'Fuel', icon: Fuel },
  charging: { label: 'Charging', icon: BatteryCharging },
  maintenance: { label: 'Maintenance', icon: Wrench },
  repairs: { label: 'Repairs', icon: Hammer },
  insurance: { label: 'Insurance', icon: ShieldCheck },
  registration: { label: 'Registration', icon: FileBadge },
  taxes: { label: 'Taxes', icon: Landmark },
  parking: { label: 'Parking', icon: ParkingCircle },
  toll: { label: 'Toll', icon: Route },
  accessories: { label: 'Accessories', icon: ShoppingBag },
  cleaning: { label: 'Cleaning', icon: Sparkles },
  tyres: { label: 'Tyres', icon: CircleDot },
  parts: { label: 'Parts', icon: Package },
  other: { label: 'Other', icon: Receipt },
};

export const PAYMENT_METHODS = {
  upi: 'UPI',
  card: 'Card',
  cash: 'Cash',
  net_banking: 'Net banking',
  wallet: 'Wallet / FASTag',
  fleet_card: 'Fleet card',
  other: 'Other',
};

export const SERVICE_TYPES = {
  periodic_service: 'Periodic service',
  repair: 'Repair',
  inspection: 'Inspection',
  breakdown: 'Breakdown repair',
  accident_repair: 'Accident repair',
  warranty: 'Warranty service',
  recall: 'Recall',
  tyre_service: 'Tyre service',
  other: 'Other',
};

export const DOCUMENT_TYPES = {
  registration_certificate: { label: 'Registration certificate', short: 'RC', icon: IdCard },
  insurance: { label: 'Insurance', short: 'Insurance', icon: ShieldCheck },
  pollution_certificate: { label: 'Pollution certificate (PUC)', short: 'PUC', icon: Leaf },
  warranty: { label: 'Warranty', short: 'Warranty', icon: BadgeCheck },
  service_invoice: { label: 'Service invoice', short: 'Invoice', icon: Receipt },
  purchase_document: { label: 'Purchase document', short: 'Purchase', icon: ScrollText },
  driving_license: { label: 'Driving licence', short: 'Licence', icon: IdCard },
  fitness_certificate: { label: 'Fitness certificate', short: 'Fitness', icon: ClipboardCheck },
  permit: { label: 'Permit', short: 'Permit', icon: FileText },
  other: { label: 'Other', short: 'Other', icon: File },
};

export const EXPIRY_STATUS = {
  valid: { label: 'Valid', tone: 'green' },
  expiring_soon: { label: 'Expiring soon', tone: 'yellow' },
  expired: { label: 'Expired', tone: 'red' },
  no_expiry: { label: 'No expiry', tone: 'gray' },
};

export const REMINDER_TYPES = {
  maintenance_due: { label: 'Maintenance due', icon: Wrench },
  maintenance_overdue: { label: 'Maintenance overdue', icon: AlertTriangle },
  insurance_expiry: { label: 'Insurance expiry', icon: ShieldCheck },
  registration_expiry: { label: 'Registration expiry', icon: IdCard },
  pollution_expiry: { label: 'Pollution certificate', icon: Leaf },
  warranty_expiry: { label: 'Warranty expiry', icon: BadgeCheck },
  license_expiry: { label: 'Licence expiry', icon: IdCard },
  document_expiry: { label: 'Document expiry', icon: FileText },
  custom: { label: 'Custom', icon: Bell },
};
export const MANUAL_REMINDER_TYPES = ['custom', 'insurance_expiry', 'registration_expiry', 'pollution_expiry', 'warranty_expiry', 'license_expiry', 'document_expiry'];

export const REMINDER_TIMING = [
  { value: 7, label: '7 days before' },
  { value: 15, label: '15 days before' },
  { value: 30, label: '30 days before' },
];

export const TRANSMISSIONS = {
  manual: 'Manual',
  automatic: 'Automatic (AT)',
  amt: 'AMT',
  cvt: 'CVT / IVT',
  dct: 'DCT / DSG',
  single_speed: 'Single-speed (EV)',
  other: 'Other',
};

export const VEHICLE_GROUPS = {
  passenger: 'Passenger',
  two_wheeler: 'Two-wheeler',
  light_commercial: 'Light commercial',
  heavy_commercial: 'Heavy commercial',
  agricultural: 'Agricultural',
  construction: 'Construction',
  towable: 'Towable',
  other: 'Other',
};

export const POWERTRAINS = { ice: 'Combustion (ICE)', hybrid: 'Hybrid', ev: 'Electric (EV)', fcev: 'Fuel cell (FCEV)' };

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

export const VEHICLE_COLORS = [
  '#b91c1c',
  '#ea580c',
  '#ca8a04',
  '#15803d',
  '#0f766e',
  '#0ea5e9',
  '#1e3a8a',
  '#2563eb',
  '#6d28d9',
  '#be185d',
  '#3f3f46',
  '#94a3b8',
  '#f8fafc',
  '#0b1220',
];

/** Lucide icons for maintenance categories (by the category's `icon` field). */
export const CATEGORY_ICONS = {
  cog: Cog,
  disc: Disc,
  'circle-dot': CircleDot,
  'settings-2': Settings2,
  'move-vertical': MoveVertical,
  zap: Zap,
  snowflake: Snowflake,
  'battery-charging': BatteryCharging,
  link: Link,
  fuel: Fuel,
  droplets: Droplets,
  'shield-check': ShieldCheck,
  car: Car,
  wrench: Wrench,
  sparkle: Sparkle,
  info: Info,
};

export const NOTIFICATION_TONE = { info: 'blue', success: 'green', warning: 'yellow', critical: 'red' };

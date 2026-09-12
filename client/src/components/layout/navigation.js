import {
  LayoutDashboard,
  Car,
  Wrench,
  History,
  Wallet,
  BellRing,
  FileText,
  Settings,
  Bell,
  BarChart3,
  Users,
  ClipboardList,
  ListChecks,
  Layers,
  Fuel,
  Truck,
} from 'lucide-react';

export const APP_NAV = [
  {
    label: 'Overview',
    items: [
      { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/app/vehicles', label: 'Vehicles', icon: Car },
      { to: '/app/maintenance', label: 'Maintenance', icon: Wrench, badge: 'overdue' },
    ],
  },
  {
    label: 'Records',
    items: [
      { to: '/app/service-history', label: 'Service history', icon: History },
      { to: '/app/expenses', label: 'Expenses', icon: Wallet },
      { to: '/app/reminders', label: 'Reminders', icon: BellRing },
      { to: '/app/documents', label: 'Documents', icon: FileText },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/app/notifications', label: 'Notifications', icon: Bell, badge: 'unread' },
      { to: '/app/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export const ADMIN_NAV = [
  {
    label: 'Admin',
    items: [
      { to: '/admin', label: 'Analytics', icon: BarChart3, end: true },
      { to: '/admin/users', label: 'Users', icon: Users },
      { to: '/admin/vehicles', label: 'All vehicles', icon: Car },
      { to: '/admin/maintenance', label: 'Maintenance records', icon: ClipboardList },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { to: '/admin/templates', label: 'Maintenance templates', icon: ListChecks },
      { to: '/admin/categories', label: 'Categories', icon: Layers },
      { to: '/admin/vehicle-types', label: 'Vehicle types', icon: Truck },
      { to: '/admin/fuel-types', label: 'Fuel types', icon: Fuel },
    ],
  },
];

export const MOBILE_TABS = [
  { to: '/app', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/app/vehicles', label: 'Vehicles', icon: Car },
  { to: '/app/maintenance', label: 'Service', icon: Wrench },
  { to: '/app/expenses', label: 'Expenses', icon: Wallet },
];

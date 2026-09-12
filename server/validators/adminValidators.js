import { z } from 'zod';
import {
  ROLE_VALUES,
  PRIORITIES,
  SERVICE_MODES,
  POWERTRAINS,
  TRANSMISSIONS,
  VEHICLE_GROUPS,
  VEHICLE_ILLUSTRATIONS,
  USAGE_UNITS,
} from '../constants/enums.js';
import { reqString, optString, optNumber, optBool, optEnum, reqEnum, objectId, password, email, hexColor } from './common.js';

const lowerCode = reqString('Code', 40)
  .toLowerCase()
  .regex(/^[a-z0-9_]+$/, 'Use lowercase letters, numbers and underscores');
const upperCode = reqString('Code', 60)
  .toUpperCase()
  .regex(/^[A-Z0-9_]+$/, 'Use letters, numbers and underscores');
const list = (max = 60) => z.array(z.string().trim().min(1).max(80)).max(max).optional();

// Users
export const adminCreateUserSchema = z.object({
  name: reqString('Name', 80),
  email,
  password,
  role: optEnum(ROLE_VALUES, 'Role'),
  isActive: optBool,
  phone: optString(20),
});

export const adminUpdateUserSchema = z.object({
  name: reqString('Name', 80).optional(),
  email: email.optional(),
  password: password.optional(),
  role: optEnum(ROLE_VALUES, 'Role'),
  phone: optString(20),
});

export const userStatusSchema = z.object({
  isActive: z.boolean({ error: 'isActive must be true or false' }),
  reason: optString(300),
});

// Categories
export const categorySchema = z.object({
  code: lowerCode,
  name: reqString('Name', 60),
  description: optString(300),
  icon: optString(40),
  color: hexColor.optional(),
  sortOrder: optNumber({ min: -1000, int: true, label: 'Sort order' }),
  isActive: optBool,
});

// Templates
const templateFields = {
  code: upperCode,
  name: reqString('Name', 120),
  description: optString(600),
  category: objectId,
  vehicleTypes: list(),
  vehicleGroups: z.array(z.enum(VEHICLE_GROUPS)).optional(),
  fuelTypes: list(),
  powertrains: z.array(z.enum(POWERTRAINS)).optional(),
  transmissions: z.array(z.enum(TRANSMISSIONS)).optional(),
  makes: list(),
  excludeMakes: list(),
  models: list(),
  intervalKm: optNumber({ min: 1, label: 'Distance interval' }),
  intervalMonths: optNumber({ min: 1, max: 240, int: true, label: 'Time interval' }),
  priority: optEnum(PRIORITIES, 'Priority'),
  estimatedCost: optNumber({ label: 'Estimated cost' }),
  estimatedDurationMinutes: optNumber({ int: true, label: 'Duration' }),
  serviceMode: optEnum(SERVICE_MODES, 'Service mode'),
  notes: optString(600),
  isRecurring: optBool,
  isActive: optBool,
};
const templateRules = (d, ctx) => {
  if (d.intervalKm === null && d.intervalMonths === null) {
    ctx.addIssue({ code: 'custom', path: ['intervalKm'], message: 'Provide at least one interval' });
  }
};
export const createTemplateSchema = z
  .object(templateFields)
  .superRefine((d, ctx) => {
    if (!d.intervalKm && !d.intervalMonths) {
      ctx.addIssue({ code: 'custom', path: ['intervalKm'], message: 'Provide a distance interval, a time interval, or both' });
    }
    if (!d.vehicleTypes?.length && !d.vehicleGroups?.length) {
      ctx.addIssue({ code: 'custom', path: ['vehicleTypes'], message: 'Select at least one vehicle type or group' });
    }
  });
export const updateTemplateSchema = z.object(templateFields).partial().superRefine(templateRules);

// Vehicle types
export const vehicleTypeSchema = z.object({
  code: lowerCode,
  name: reqString('Name', 60),
  group: reqEnum(VEHICLE_GROUPS, 'Group'),
  illustration: optEnum(VEHICLE_ILLUSTRATIONS, 'Illustration'),
  usageUnit: optEnum(USAGE_UNITS, 'Usage unit'),
  allowedFuelTypes: list(),
  description: optString(300),
  isActive: optBool,
  sortOrder: optNumber({ min: -1000, int: true, label: 'Sort order' }),
});

// Fuel types
export const fuelTypeSchema = z.object({
  code: lowerCode,
  name: reqString('Name', 60),
  powertrain: reqEnum(POWERTRAINS, 'Powertrain'),
  isActive: optBool,
  sortOrder: optNumber({ min: -1000, int: true, label: 'Sort order' }),
});

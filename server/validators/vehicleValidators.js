import { z } from 'zod';
import { TRANSMISSIONS, VEHICLE_STATUSES } from '../constants/enums.js';
import { reqString, optString, optNumber, reqNumber, optDate, optEnum, hexColor } from './common.js';

const currentYear = new Date().getFullYear();
const code = (label) =>
  reqString(label, 40)
    .toLowerCase()
    .regex(/^[a-z0-9_]+$/, `Select a valid ${label.toLowerCase()}`);

const vehicleFields = {
  vehicleType: code('Vehicle type'),
  make: reqString('Make', 60),
  model: reqString('Model', 60),
  variant: optString(80),
  nickname: optString(60),
  year: optNumber({ min: 1900, max: currentYear + 1, int: true, label: 'Year' }),
  registrationNumber: reqString('Registration number', 20).regex(
    /^[A-Za-z0-9][A-Za-z0-9 -]*$/,
    'Use letters, numbers, spaces or dashes only'
  ),
  vin: optString(30),
  engineNumber: optString(30),
  fuelType: code('Fuel type'),
  secondaryFuelType: z.preprocess((v) => (v === '' ? null : v), z.string().trim().toLowerCase().max(40).nullable().optional()),
  transmission: optEnum(TRANSMISSIONS, 'Transmission'),
  purchaseDate: optDate('Purchase date'),
  purchasePrice: optNumber({ label: 'Purchase price' }),
  purchaseOdometer: optNumber({ label: 'Odometer at purchase' }),
  odometer: optNumber({ label: 'Current odometer' }),
  color: hexColor.optional(),
  notes: optString(2000),
  status: optEnum(VEHICLE_STATUSES, 'Status'),
  lastServiceDate: optDate('Last service date'),
  lastServiceOdometer: optNumber({ label: 'Last service odometer' }),
};

const crossChecks = (data, ctx) => {
  const now = new Date();
  if (data.purchaseDate && data.purchaseDate > now) {
    ctx.addIssue({ code: 'custom', path: ['purchaseDate'], message: 'Purchase date cannot be in the future' });
  }
  if (data.lastServiceDate && data.lastServiceDate > now) {
    ctx.addIssue({ code: 'custom', path: ['lastServiceDate'], message: 'Last service date cannot be in the future' });
  }
  if (data.lastServiceOdometer != null && data.odometer != null && data.lastServiceOdometer > data.odometer) {
    ctx.addIssue({ code: 'custom', path: ['lastServiceOdometer'], message: 'Cannot exceed the current odometer' });
  }
  if (data.purchaseOdometer != null && data.odometer != null && data.purchaseOdometer > data.odometer) {
    ctx.addIssue({ code: 'custom', path: ['purchaseOdometer'], message: 'Cannot exceed the current odometer' });
  }
};

export const createVehicleSchema = z.object(vehicleFields).superRefine(crossChecks);
export const updateVehicleSchema = z.object(vehicleFields).partial().superRefine(crossChecks);

export const odometerSchema = z.object({
  odometer: reqNumber('Odometer', { min: 0 }),
  date: optDate('Date'),
});

export const noteSchema = z.object({
  title: optString(120),
  body: reqString('Note', 4000),
  pinned: z.boolean().optional(),
});

export const previewSchema = z.object({
  vehicleType: code('Vehicle type'),
  fuelType: code('Fuel type'),
  secondaryFuelType: z.preprocess((v) => (v === '' ? null : v), z.string().trim().toLowerCase().nullable().optional()),
  transmission: optEnum(TRANSMISSIONS, 'Transmission'),
  make: optString(60),
  model: optString(60),
});

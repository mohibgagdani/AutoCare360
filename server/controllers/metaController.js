import { VehicleType, FuelType, MaintenanceCategory } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { previewSchedule } from '../services/scheduleService.js';

/** Catalog data used across the client (vehicle types, fuels, categories). */
export const getMeta = asyncHandler(async (_req, res) => {
  const [vehicleTypes, fuelTypes, categories] = await Promise.all([
    VehicleType.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean(),
    FuelType.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean(),
    MaintenanceCategory.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean(),
  ]);
  // Revalidate every time (ETag → 304) so admin catalog edits show up immediately.
  res.set('Cache-Control', 'private, no-cache');
  return sendSuccess(res, { data: { vehicleTypes, fuelTypes, categories } });
});

/** Live checklist preview for the add-vehicle wizard. */
export const previewMaintenance = asyncHandler(async (req, res) => {
  const preview = await previewSchedule(req.body);
  return sendSuccess(res, { data: preview });
});

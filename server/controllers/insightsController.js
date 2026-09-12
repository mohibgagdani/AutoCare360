import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { getDashboard } from '../services/dashboardService.js';
import { globalSearch } from '../services/searchService.js';
import { refreshUserIfStale } from '../services/scheduleService.js';
import {
  exportServiceRecords,
  exportExpenses,
  exportMaintenance,
  exportVehicleReport,
} from '../services/exportService.js';

export const dashboard = asyncHandler(async (req, res) => {
  await refreshUserIfStale(req.user);
  const data = await getDashboard(req.user._id);
  return sendSuccess(res, { data });
});

export const search = asyncHandler(async (req, res) => {
  const data = await globalSearch(req.user._id, req.query.q, { limit: Math.min(Number(req.query.limit) || 5, 10) });
  return sendSuccess(res, { data });
});

const formatOf = (req) => {
  const format = String(req.query.format || 'csv').toLowerCase();
  if (!['csv', 'pdf'].includes(format)) throw ApiError.badRequest('Format must be csv or pdf');
  return format;
};

export const exportServices = asyncHandler(async (req, res) => exportServiceRecords(req.user._id, req.query, formatOf(req), res));
export const exportExpenseList = asyncHandler(async (req, res) => exportExpenses(req.user._id, req.query, formatOf(req), res));
export const exportMaintenanceList = asyncHandler(async (req, res) => exportMaintenance(req.user._id, req.query, formatOf(req), res));
export const vehicleReport = asyncHandler(async (req, res) => exportVehicleReport(req.user._id, req.params.id, res));

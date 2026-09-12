import { Expense, Vehicle } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { getPagination, parseSort, paginate } from '../utils/pagination.js';
import { searchRegex } from '../utils/helpers.js';
import { buildExpenseFilter, getExpenseSummary } from '../services/expenseService.js';
import { EXPENSE_SORTS } from '../services/queryFilters.js';
import { recordOdometer, refreshVehicle } from '../services/scheduleService.js';
import { uploadFile, deleteFile } from '../services/storageService.js';

const assertVehicle = async (owner, vehicleId) => {
  const vehicle = await Vehicle.findOne({ _id: vehicleId, owner });
  if (!vehicle) throw ApiError.validation([{ field: 'vehicle', message: 'Select one of your vehicles' }], 'Vehicle not found');
  return vehicle;
};

/** Fuel/charging entries: derive the missing value of quantity × price = amount. */
function normaliseFuel(body) {
  const f = body.fuelDetails;
  if (!f) return body;
  if (!['fuel', 'charging'].includes(body.category)) {
    delete body.fuelDetails;
    return body;
  }
  if (f.quantity && f.pricePerUnit && !body.amount) body.amount = Math.round(f.quantity * f.pricePerUnit * 100) / 100;
  if (f.quantity && body.amount && !f.pricePerUnit) f.pricePerUnit = Math.round((body.amount / f.quantity) * 100) / 100;
  if (!f.unit) f.unit = body.category === 'charging' ? 'kWh' : 'L';
  return body;
}

export const listExpenses = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 15 });
  const filter = buildExpenseFilter(req.user._id, req.query);
  if (req.query.search) {
    const rx = searchRegex(req.query.search);
    filter.$or = [{ description: rx }, { vendor: rx }, { notes: rx }];
  }
  const { items, meta } = await paginate(Expense, filter, {
    page,
    limit,
    skip,
    sort: parseSort(req.query.sort, EXPENSE_SORTS, '-date'),
    populate: [{ path: 'vehicle', select: 'make model nickname registrationNumber color vehicleType' }],
  });
  const totals = await Expense.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
  meta.totals = { total: totals[0]?.total || 0 };
  return sendSuccess(res, { data: items, meta });
});

export const expenseSummary = asyncHandler(async (req, res) => {
  const summary = await getExpenseSummary(req.user._id, req.query);
  return sendSuccess(res, { data: summary });
});

export const createExpense = asyncHandler(async (req, res) => {
  const vehicle = await assertVehicle(req.user._id, req.body.vehicle);
  const body = normaliseFuel({ ...req.body });
  const receipt = req.file ? await uploadFile(req.file, 'receipts') : undefined;
  const expense = await Expense.create({ ...body, owner: req.user._id, receipt });

  if (body.odometer) {
    const raised = await recordOdometer(vehicle, body.odometer, { date: body.date, source: 'expense' });
    if (raised) await refreshVehicle(vehicle._id);
  }
  await expense.populate('vehicle', 'make model nickname registrationNumber color vehicleType');
  return sendSuccess(res, { status: 201, message: 'Expense added', data: expense });
});

export const updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, owner: req.user._id });
  if (!expense) throw ApiError.notFound('Expense');
  if (expense.serviceRecord && ('amount' in req.body || 'category' in req.body)) {
    throw ApiError.badRequest('This expense is linked to a service record. Edit the service record to change its amount.');
  }
  if (req.body.vehicle && String(req.body.vehicle) !== String(expense.vehicle)) await assertVehicle(req.user._id, req.body.vehicle);

  const body = normaliseFuel({ ...req.body, category: req.body.category || expense.category });
  Object.assign(expense, body);
  if (req.file) {
    const previous = expense.receipt;
    expense.receipt = await uploadFile(req.file, 'receipts');
    if (previous) await deleteFile(previous);
  }
  await expense.save();
  await expense.populate('vehicle', 'make model nickname registrationNumber color vehicleType');
  return sendSuccess(res, { message: 'Expense updated', data: expense });
});

export const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, owner: req.user._id });
  if (!expense) throw ApiError.notFound('Expense');
  if (expense.serviceRecord) {
    throw ApiError.badRequest('This expense belongs to a service record. Delete the service record instead.');
  }
  if (expense.receipt) await deleteFile(expense.receipt);
  await expense.deleteOne();
  return sendSuccess(res, { message: 'Expense deleted' });
});

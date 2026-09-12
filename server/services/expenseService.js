import { Expense, Vehicle, VehicleType } from '../models/index.js';
import { dateRange, round, toObjectId } from '../utils/helpers.js';
import { APP_TIMEZONE, lastMonthKeys, monthKey, startOfMonth, startOfYear } from '../utils/dates.js';

/** Builds the Mongo filter shared by expense list, summary and export. */
export function buildExpenseFilter(owner, query = {}) {
  const filter = { owner: toObjectId(owner) };
  if (query.vehicle) filter.vehicle = toObjectId(query.vehicle);
  if (query.category) {
    const categories = String(query.category).split(',').filter(Boolean);
    filter.category = categories.length > 1 ? { $in: categories } : categories[0];
  }
  const range = dateRange(query.from, query.to);
  if (range) filter.date = range;
  if (query.minAmount || query.maxAmount) {
    filter.amount = {};
    if (query.minAmount) filter.amount.$gte = Number(query.minAmount);
    if (query.maxAmount) filter.amount.$lte = Number(query.maxAmount);
  }
  return filter;
}

/** Distance covered per vehicle within an optional date range, from odometer logs. */
function distanceCovered(vehicle, from, to) {
  const logs = (vehicle.odometerLogs || []).filter(
    (l) => (!from || l.date >= from) && (!to || l.date <= to)
  );
  if (logs.length >= 2) {
    const values = logs.map((l) => l.value);
    return Math.max(...values) - Math.min(...values);
  }
  if (!from && !to) return Math.max(0, (vehicle.odometer || 0) - (vehicle.purchaseOdometer || 0));
  return 0;
}

export async function getExpenseSummary(owner, query = {}) {
  const filter = buildExpenseFilter(owner, query);
  const now = new Date();
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);
  const months = Math.min(Math.max(Number(query.months) || 12, 3), 36);
  const seriesStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const [totals, byCategory, byVehicle, monthly, thisMonth, thisYear, fuel] = await Promise.all([
    Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          first: { $min: '$date' },
          last: { $max: '$date' },
        },
      },
    ]),
    Expense.aggregate([
      { $match: filter },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    Expense.aggregate([
      { $match: filter },
      { $group: { _id: '$vehicle', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    Expense.aggregate([
      { $match: { ...filter, date: { ...(filter.date || {}), $gte: seriesStart } } },
      {
        $group: {
          _id: { month: { $dateToString: { format: '%Y-%m', date: '$date', timezone: APP_TIMEZONE } }, category: '$category' },
          total: { $sum: '$amount' },
        },
      },
    ]),
    Expense.aggregate([
      { $match: { ...filter, date: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Expense.aggregate([
      { $match: { ...filter, date: { $gte: yearStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Expense.aggregate([
      { $match: { ...filter, category: { $in: ['fuel', 'charging'] }, 'fuelDetails.quantity': { $gt: 0 } } },
      {
        $group: {
          _id: '$fuelDetails.unit',
          quantity: { $sum: '$fuelDetails.quantity' },
          amount: { $sum: '$amount' },
          fills: { $sum: 1 },
        },
      },
    ]),
  ]);

  const vehicleIds = byVehicle.map((v) => v._id);
  const [vehicles, hourTypes] = await Promise.all([
    Vehicle.find({ _id: { $in: vehicleIds } })
      .select('make model nickname registrationNumber color vehicleType odometer purchaseOdometer odometerLogs')
      .lean(),
    VehicleType.find({ usageUnit: 'hours' }).select('code').lean(),
  ]);
  const vehicleMap = new Map(vehicles.map((v) => [String(v._id), v]));
  const hourMeter = new Set(hourTypes.map((t) => t.code));

  const from = filter.date?.$gte;
  const to = filter.date?.$lte;
  // Fleet cost/km only mixes vehicles measured in km (tractors & equipment use engine hours).
  let totalDistance = 0;
  let kmVehicleSpend = 0;
  const vehicleRows = byVehicle.map((row) => {
    const v = vehicleMap.get(String(row._id));
    const distance = v ? distanceCovered(v, from, to) : 0;
    const usageUnit = v && hourMeter.has(v.vehicleType) ? 'hours' : 'km';
    if (usageUnit === 'km' && distance > 0) {
      totalDistance += distance;
      kmVehicleSpend += row.total;
    }
    return {
      vehicle: v
        ? { _id: v._id, name: v.nickname || `${v.make} ${v.model}`, registrationNumber: v.registrationNumber, color: v.color, vehicleType: v.vehicleType }
        : { _id: row._id, name: 'Deleted vehicle' },
      total: round(row.total),
      count: row.count,
      usageUnit,
      distance,
      // Cost per km, or per engine hour for hour-meter vehicles.
      costPerKm: distance > 0 ? round(row.total / distance) : null,
    };
  });

  const total = totals[0]?.total || 0;
  const count = totals[0]?.count || 0;
  const first = totals[0]?.first;
  const spanMonths = first
    ? Math.max(1, (now.getFullYear() - first.getFullYear()) * 12 + now.getMonth() - first.getMonth() + 1)
    : 1;

  const keys = lastMonthKeys(months, now);
  const seriesMap = new Map(keys.map((k) => [k, { month: k, total: 0 }]));
  for (const row of monthly) {
    const entry = seriesMap.get(row._id.month);
    if (!entry) continue;
    entry[row._id.category] = round((entry[row._id.category] || 0) + row.total);
    entry.total = round(entry.total + row.total);
  }

  return {
    total: round(total),
    count,
    averageExpense: count ? round(total / count) : 0,
    monthlyAverage: round(total / spanMonths),
    currentMonth: round(thisMonth[0]?.total || 0),
    currentYear: round(thisYear[0]?.total || 0),
    annualized: round((total / spanMonths) * 12),
    totalDistance,
    costPerKm: totalDistance > 0 ? round(kmVehicleSpend / totalDistance) : null,
    byCategory: byCategory.map((c) => ({ category: c._id, total: round(c.total), count: c.count, share: total ? round((c.total / total) * 100, 1) : 0 })),
    byVehicle: vehicleRows,
    monthly: [...seriesMap.values()],
    fuel: fuel.map((f) => ({
      unit: f._id,
      quantity: round(f.quantity),
      amount: round(f.amount),
      fills: f.fills,
      averagePrice: f.quantity ? round(f.amount / f.quantity) : 0,
    })),
    currentMonthKey: monthKey(now),
  };
}

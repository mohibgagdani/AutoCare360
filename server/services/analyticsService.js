import {
  User,
  Vehicle,
  VehicleType,
  MaintenanceTask,
  MaintenanceTemplate,
  ServiceRecord,
  Expense,
  Document,
} from '../models/index.js';
import { APP_TIMEZONE, lastMonthKeys, startOfMonth } from '../utils/dates.js';
import { round } from '../utils/helpers.js';

const monthExpr = (field) => ({ $dateToString: { format: '%Y-%m', date: field, timezone: APP_TIMEZONE } });

/** Platform-wide metrics for the admin dashboard. */
export async function getPlatformAnalytics(now = new Date()) {
  const keys = lastMonthKeys(12, now);
  const since = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const monthStart = startOfMonth(now);

  const [
    userTotals,
    newUsersThisMonth,
    vehicleCount,
    templateCount,
    taskStatus,
    serviceTotals,
    expenseTotals,
    documentCount,
    userGrowth,
    vehicleGrowth,
    vehiclesByType,
    vehiclesByFuel,
    spendByMonth,
    topTemplates,
    recentUsers,
    types,
  ] = await Promise.all([
    User.aggregate([{ $group: { _id: { role: '$role', active: '$isActive' }, count: { $sum: 1 } } }]),
    User.countDocuments({ createdAt: { $gte: monthStart } }),
    Vehicle.countDocuments(),
    MaintenanceTemplate.countDocuments({ isActive: true }),
    MaintenanceTask.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ServiceRecord.aggregate([{ $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$totalCost' } } }]),
    Expense.aggregate([{ $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } }]),
    Document.countDocuments(),
    User.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: monthExpr('$createdAt'), count: { $sum: 1 } } },
    ]),
    Vehicle.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: monthExpr('$createdAt'), count: { $sum: 1 } } },
    ]),
    Vehicle.aggregate([{ $group: { _id: '$vehicleType', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Vehicle.aggregate([{ $group: { _id: '$fuelType', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Expense.aggregate([
      { $match: { date: { $gte: since } } },
      { $group: { _id: monthExpr('$date'), total: { $sum: '$amount' } } },
    ]),
    MaintenanceTask.aggregate([
      { $match: { status: 'completed', template: { $ne: null } } },
      { $group: { _id: '$name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    User.find().sort({ createdAt: -1 }).limit(6).select('name email role isActive createdAt avatar').lean(),
    VehicleType.find().select('code name').lean(),
  ]);

  const typeNames = new Map(types.map((t) => [t.code, t.name]));
  const users = userTotals.reduce(
    (acc, row) => {
      acc.total += row.count;
      if (row._id.role === 'admin') acc.admins += row.count;
      if (row._id.active === false) acc.blocked += row.count;
      return acc;
    },
    { total: 0, admins: 0, blocked: 0 }
  );
  const statusCounts = Object.fromEntries(taskStatus.map((s) => [s._id, s.count]));
  const growthMap = (rows) => new Map(rows.map((r) => [r._id, r.count ?? r.total]));
  const ug = growthMap(userGrowth);
  const vg = growthMap(vehicleGrowth);
  const sm = growthMap(spendByMonth);

  return {
    stats: {
      users: users.total,
      activeUsers: users.total - users.blocked,
      blockedUsers: users.blocked,
      admins: users.admins,
      newUsersThisMonth,
      vehicles: vehicleCount,
      activeTemplates: templateCount,
      openTasks: ['up_to_date', 'due_soon', 'due', 'overdue'].reduce((s, k) => s + (statusCounts[k] || 0), 0),
      overdueTasks: statusCounts.overdue || 0,
      completedTasks: statusCounts.completed || 0,
      serviceRecords: serviceTotals[0]?.count || 0,
      trackedSpend: round(expenseTotals[0]?.total || 0),
      expenses: expenseTotals[0]?.count || 0,
      documents: documentCount,
    },
    growth: keys.map((k) => ({ month: k, users: ug.get(k) || 0, vehicles: vg.get(k) || 0, spend: round(sm.get(k) || 0) })),
    vehiclesByType: vehiclesByType.map((r) => ({ code: r._id, name: typeNames.get(r._id) || r._id, count: r.count })),
    vehiclesByFuel: vehiclesByFuel.map((r) => ({ code: r._id, count: r.count })),
    taskStatus: statusCounts,
    topMaintenance: topTemplates.map((t) => ({ name: t._id, count: t.count })),
    recentUsers,
  };
}

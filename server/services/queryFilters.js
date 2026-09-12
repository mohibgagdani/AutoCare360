/**
 * Filter builders shared by list endpoints and exports so both always agree.
 */
import { OPEN_TASK_STATUSES, TASK_STATUS_VALUES, PRIORITIES } from '../constants/enums.js';
import { dateRange, isObjectId, searchRegex, toList, toObjectId } from '../utils/helpers.js';

export function buildTaskFilter(owner, query = {}) {
  const filter = { owner: toObjectId(owner) };
  if (query.vehicle && isObjectId(query.vehicle)) filter.vehicle = toObjectId(query.vehicle);

  const statuses = toList(query.status).filter((s) => TASK_STATUS_VALUES.includes(s) || s === 'open' || s === 'closed');
  if (statuses.includes('open')) filter.isOpen = true;
  else if (statuses.includes('closed')) filter.isOpen = false;
  else if (statuses.length) filter.status = { $in: statuses };
  else filter.isOpen = query.history !== 'true';
  const isHistoryQuery =
    filter.isOpen === false || (statuses.length > 0 && statuses.every((s) => ['completed', 'skipped'].includes(s)));

  const categories = toList(query.category).filter(isObjectId);
  if (categories.length) filter.category = { $in: categories.map(toObjectId) };

  const priorities = toList(query.priority).filter((p) => PRIORITIES.includes(p));
  if (priorities.length) filter.priority = { $in: priorities };

  if (query.type === 'custom') filter.isCustom = true;
  if (query.type === 'scheduled') filter.isCustom = false;

  const due = dateRange(query.dueFrom, query.dueTo);
  if (due) filter.nextDueDate = due;

  const completed = dateRange(query.from, query.to);
  if (completed && isHistoryQuery) filter.$or = [{ completedAt: completed }, { skippedAt: completed }];

  if (query.search) {
    const rx = searchRegex(query.search);
    filter.$and = [...(filter.$and || []), { $or: [{ name: rx }, { code: rx }, { description: rx }] }];
  }
  return filter;
}

export const TASK_SORTS = ['nextDueDate', 'nextDueOdometer', 'name', 'priority', 'status', 'createdAt', 'completedAt', 'estimatedCost'];

export function buildServiceRecordFilter(owner, query = {}) {
  const filter = { owner: toObjectId(owner) };
  if (query.vehicle && isObjectId(query.vehicle)) filter.vehicle = toObjectId(query.vehicle);
  const types = toList(query.serviceType);
  if (types.length) filter.serviceType = { $in: types };
  const range = dateRange(query.from, query.to);
  if (range) filter.serviceDate = range;
  if (query.serviceCenter) filter.serviceCenter = searchRegex(query.serviceCenter);
  if (query.search) {
    const rx = searchRegex(query.search);
    filter.$or = [
      { serviceCenter: rx },
      { mechanic: rx },
      { notes: rx },
      { serviceCenterLocation: rx },
      { 'maintenanceItems.name': rx },
      { 'partsReplaced.name': rx },
    ];
  }
  return filter;
}

export const SERVICE_SORTS = ['serviceDate', 'totalCost', 'odometer', 'createdAt', 'serviceCenter'];
export const EXPENSE_SORTS = ['date', 'amount', 'category', 'createdAt', 'odometer'];

export function buildReminderFilter(owner, query = {}) {
  const filter = { owner: toObjectId(owner) };
  if (query.vehicle && isObjectId(query.vehicle)) filter.vehicle = toObjectId(query.vehicle);
  const types = toList(query.type);
  if (types.length) filter.type = { $in: types };
  if (query.source) filter.source = query.source;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  switch (query.status) {
    case 'overdue':
      filter.status = 'active';
      filter.dueDate = { $lt: today };
      break;
    case 'upcoming':
      filter.status = 'active';
      filter.dueDate = { $gte: today };
      break;
    case 'completed':
      filter.status = { $in: ['completed', 'dismissed'] };
      break;
    case 'all':
      break;
    default:
      filter.status = 'active';
  }
  if (query.search) {
    const rx = searchRegex(query.search);
    filter.$or = [{ title: rx }, { description: rx }];
  }
  return filter;
}

export function buildDocumentFilter(owner, query = {}) {
  const filter = { owner: toObjectId(owner) };
  if (query.vehicle === 'none') filter.vehicle = null;
  else if (query.vehicle && isObjectId(query.vehicle)) filter.vehicle = toObjectId(query.vehicle);
  const types = toList(query.type);
  if (types.length) filter.type = { $in: types };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const soon = new Date(today.getTime() + 30 * 86400000);
  if (query.expiry === 'expired') filter.expiryDate = { $lt: today };
  if (query.expiry === 'expiring') filter.expiryDate = { $gte: today, $lte: soon };
  if (query.expiry === 'valid') filter.$or = [{ expiryDate: { $gt: soon } }, { expiryDate: null }];

  if (query.search) {
    const rx = searchRegex(query.search);
    filter.$and = [{ $or: [{ name: rx }, { documentNumber: rx }, { issuer: rx }, { notes: rx }] }];
  }
  return filter;
}

export { OPEN_TASK_STATUSES };

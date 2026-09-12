import { Vehicle, MaintenanceTask, ServiceRecord, Expense, Document, Reminder } from '../models/index.js';
import { searchRegex } from '../utils/helpers.js';

const vName = (v) => (v ? v.nickname || `${v.make} ${v.model}` : '');

/** Grouped global search across the user's data (command palette). */
export async function globalSearch(owner, q, { limit = 5 } = {}) {
  const term = String(q || '').trim();
  if (term.length < 2) return { query: term, total: 0, groups: [] };
  const rx = searchRegex(term);

  const [vehicles, tasks, services, expenses, documents, reminders] = await Promise.all([
    Vehicle.find({ owner, $or: [{ make: rx }, { model: rx }, { nickname: rx }, { registrationNumber: rx }, { vin: rx }, { variant: rx }] })
      .select('make model nickname registrationNumber vehicleType color year')
      .limit(limit)
      .lean(),
    MaintenanceTask.find({ owner, isOpen: true, $or: [{ name: rx }, { code: rx }, { description: rx }] })
      .populate('vehicle', 'make model nickname registrationNumber')
      .select('name status nextDueDate vehicle priority')
      .limit(limit)
      .lean(),
    ServiceRecord.find({
      owner,
      $or: [{ serviceCenter: rx }, { mechanic: rx }, { serviceCenterLocation: rx }, { notes: rx }, { 'maintenanceItems.name': rx }],
    })
      .populate('vehicle', 'make model nickname registrationNumber')
      .select('serviceCenter serviceDate totalCost vehicle serviceType')
      .sort({ serviceDate: -1 })
      .limit(limit)
      .lean(),
    Expense.find({ owner, $or: [{ description: rx }, { vendor: rx }, { category: rx }, { notes: rx }] })
      .populate('vehicle', 'make model nickname registrationNumber')
      .select('description vendor category amount date vehicle')
      .sort({ date: -1 })
      .limit(limit)
      .lean(),
    Document.find({ owner, $or: [{ name: rx }, { documentNumber: rx }, { issuer: rx }] })
      .populate('vehicle', 'make model nickname registrationNumber')
      .select('name type expiryDate vehicle')
      .limit(limit)
      .lean(),
    Reminder.find({ owner, status: 'active', $or: [{ title: rx }, { description: rx }] })
      .select('title dueDate type')
      .limit(limit)
      .lean(),
  ]);

  const groups = [
    {
      key: 'vehicles',
      label: 'Vehicles',
      items: vehicles.map((v) => ({
        id: v._id,
        title: `${vName(v)}${v.year ? ` · ${v.year}` : ''}`,
        subtitle: v.registrationNumber,
        link: `/app/vehicles/${v._id}`,
        meta: { vehicleType: v.vehicleType, color: v.color },
      })),
    },
    {
      key: 'maintenance',
      label: 'Maintenance',
      items: tasks.map((t) => ({
        id: t._id,
        title: t.name,
        subtitle: `${vName(t.vehicle)} · ${t.vehicle?.registrationNumber || ''}`,
        link: `/app/maintenance?task=${t._id}`,
        meta: { status: t.status },
      })),
    },
    {
      key: 'services',
      label: 'Service records',
      items: services.map((s) => ({
        id: s._id,
        title: s.serviceCenter || 'Service record',
        subtitle: `${vName(s.vehicle)} · ${new Date(s.serviceDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
        link: `/app/service-history?record=${s._id}`,
        meta: { amount: s.totalCost },
      })),
    },
    {
      key: 'expenses',
      label: 'Expenses',
      items: expenses.map((e) => ({
        id: e._id,
        title: e.description || e.vendor || e.category,
        subtitle: `${vName(e.vehicle)} · ${e.category}`,
        link: `/app/expenses?expense=${e._id}`,
        meta: { amount: e.amount },
      })),
    },
    {
      key: 'documents',
      label: 'Documents',
      items: documents.map((d) => ({
        id: d._id,
        title: d.name,
        subtitle: d.vehicle ? vName(d.vehicle) : 'Personal',
        link: `/app/documents?document=${d._id}`,
      })),
    },
    {
      key: 'reminders',
      label: 'Reminders',
      items: reminders.map((r) => ({
        id: r._id,
        title: r.title,
        subtitle: new Date(r.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        link: '/app/reminders',
      })),
    },
  ].filter((g) => g.items.length);

  return { query: term, total: groups.reduce((n, g) => n + g.items.length, 0), groups };
}

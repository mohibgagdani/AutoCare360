import { ServiceRecord, Expense, MaintenanceTask, Vehicle, Document } from '../models/index.js';
import { buildServiceRecordFilter, buildTaskFilter } from './queryFilters.js';
import { buildExpenseFilter, getExpenseSummary } from './expenseService.js';
import { getVehicleOverview } from './vehicleService.js';
import { documentExpiryStatus } from '../models/Document.js';
import { toCsv } from '../utils/csv.js';
import { ApiError } from '../utils/ApiError.js';
import {
  createPdf,
  finalizePdf,
  sectionTitle,
  statBoxes,
  keyValueGrid,
  table,
  paragraph,
  money,
  fmtDate,
  fmtNumber,
  titleCase,
  STATUS_COLOR,
  PDF_COLORS,
} from './pdfService.js';

const MAX_EXPORT_ROWS = 5000;
const vName = (v) => (v ? `${v.nickname || `${v.make} ${v.model}`} (${v.registrationNumber})` : '');
const stamp = () => new Date().toISOString().slice(0, 10);

function sendCsv(res, filename, csv) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

async function scopeLabel(owner, vehicleId) {
  if (!vehicleId) return 'All vehicles';
  const v = await Vehicle.findOne({ _id: vehicleId, owner }).select('make model nickname registrationNumber').lean();
  return v ? vName(v) : 'All vehicles';
}

// ─── Service history ─────────────────────────────────────────────────────────
export async function exportServiceRecords(owner, query, format, res) {
  const records = await ServiceRecord.find(buildServiceRecordFilter(owner, query))
    .sort({ serviceDate: -1 })
    .limit(MAX_EXPORT_ROWS)
    .populate('vehicle', 'make model nickname registrationNumber')
    .lean();

  if (format === 'csv') {
    const csv = toCsv(
      [
        { header: 'Date', value: (r) => new Date(r.serviceDate) },
        { header: 'Vehicle', value: (r) => vName(r.vehicle) },
        { header: 'Odometer', value: (r) => r.odometer },
        { header: 'Service type', value: (r) => titleCase(r.serviceType) },
        { header: 'Service center', value: (r) => r.serviceCenter },
        { header: 'Location', value: (r) => r.serviceCenterLocation },
        { header: 'Mechanic', value: (r) => r.mechanic },
        { header: 'Maintenance items', value: (r) => r.maintenanceItems.map((i) => i.name).join('; ') },
        { header: 'Parts replaced', value: (r) => r.partsReplaced.map((p) => `${p.name} x${p.quantity}`).join('; ') },
        { header: 'Labour cost', value: (r) => r.laborCost },
        { header: 'Parts cost', value: (r) => r.partsCost },
        { header: 'Taxes', value: (r) => r.taxes },
        { header: 'Discount', value: (r) => r.discount },
        { header: 'Total cost', value: (r) => r.totalCost },
        { header: 'Notes', value: (r) => r.notes },
      ],
      records
    );
    return sendCsv(res, `service-history-${stamp()}.csv`, csv);
  }

  const total = records.reduce((s, r) => s + (r.totalCost || 0), 0);
  const doc = createPdf(res, {
    filename: `service-history-${stamp()}.pdf`,
    title: 'Service History Report',
    subtitle: await scopeLabel(owner, query.vehicle),
  });
  statBoxes(doc, [
    { label: 'Service records', value: records.length },
    { label: 'Total spend', value: money(total) },
    { label: 'Average per service', value: money(records.length ? total / records.length : 0) },
  ]);
  sectionTitle(doc, 'Service records');
  table(
    doc,
    [
      { header: 'Date', width: 1.1, value: (r) => fmtDate(r.serviceDate) },
      { header: 'Vehicle', width: 1.8, value: (r) => vName(r.vehicle) },
      { header: 'Odometer', width: 0.9, align: 'right', value: (r) => fmtNumber(r.odometer) },
      { header: 'Service center', width: 1.5, value: (r) => r.serviceCenter },
      { header: 'Items', width: 2.4, value: (r) => r.maintenanceItems.map((i) => i.name).join(', ') },
      { header: 'Total', width: 1, align: 'right', bold: true, value: (r) => money(r.totalCost) },
    ],
    records
  );
  return finalizePdf(doc);
}

// ─── Expenses ────────────────────────────────────────────────────────────────
export async function exportExpenses(owner, query, format, res) {
  const expenses = await Expense.find(buildExpenseFilter(owner, query))
    .sort({ date: -1 })
    .limit(MAX_EXPORT_ROWS)
    .populate('vehicle', 'make model nickname registrationNumber')
    .lean();

  if (format === 'csv') {
    const csv = toCsv(
      [
        { header: 'Date', value: (e) => new Date(e.date) },
        { header: 'Vehicle', value: (e) => vName(e.vehicle) },
        { header: 'Category', value: (e) => titleCase(e.category) },
        { header: 'Description', value: (e) => e.description },
        { header: 'Vendor', value: (e) => e.vendor },
        { header: 'Amount', value: (e) => e.amount },
        { header: 'Payment method', value: (e) => titleCase(e.paymentMethod) },
        { header: 'Odometer', value: (e) => e.odometer },
        { header: 'Quantity', value: (e) => e.fuelDetails?.quantity },
        { header: 'Unit', value: (e) => e.fuelDetails?.unit },
        { header: 'Price per unit', value: (e) => e.fuelDetails?.pricePerUnit },
        { header: 'Notes', value: (e) => e.notes },
      ],
      expenses
    );
    return sendCsv(res, `expenses-${stamp()}.csv`, csv);
  }

  const summary = await getExpenseSummary(owner, query);
  const doc = createPdf(res, {
    filename: `expenses-${stamp()}.pdf`,
    title: 'Expense Report',
    subtitle: await scopeLabel(owner, query.vehicle),
  });
  statBoxes(doc, [
    { label: 'Total', value: money(summary.total) },
    { label: 'Monthly average', value: money(summary.monthlyAverage) },
    { label: 'This year', value: money(summary.currentYear) },
    { label: 'Cost / km', value: summary.costPerKm ? `Rs. ${summary.costPerKm}` : '—' },
  ]);
  sectionTitle(doc, 'By category');
  table(
    doc,
    [
      { header: 'Category', width: 2, value: (c) => titleCase(c.category) },
      { header: 'Entries', width: 1, align: 'right', value: (c) => c.count },
      { header: 'Share', width: 1, align: 'right', value: (c) => `${c.share}%` },
      { header: 'Total', width: 1.2, align: 'right', bold: true, value: (c) => money(c.total) },
    ],
    summary.byCategory
  );
  sectionTitle(doc, 'Transactions', `${expenses.length} entries`);
  table(
    doc,
    [
      { header: 'Date', width: 1.1, value: (e) => fmtDate(e.date) },
      { header: 'Vehicle', width: 1.9, value: (e) => vName(e.vehicle) },
      { header: 'Category', width: 1.1, value: (e) => titleCase(e.category) },
      { header: 'Description', width: 2.3, value: (e) => e.description || e.vendor },
      { header: 'Amount', width: 1, align: 'right', bold: true, value: (e) => money(e.amount) },
    ],
    expenses
  );
  return finalizePdf(doc);
}

// ─── Maintenance ─────────────────────────────────────────────────────────────
export async function exportMaintenance(owner, query, format, res) {
  const tasks = await MaintenanceTask.find(buildTaskFilter(owner, query))
    .sort(query.history === 'true' ? { completedAt: -1 } : { nextDueDate: 1 })
    .limit(MAX_EXPORT_ROWS)
    .populate('vehicle', 'make model nickname registrationNumber')
    .populate('category', 'name')
    .lean();

  if (format === 'csv') {
    const csv = toCsv(
      [
        { header: 'Vehicle', value: (t) => vName(t.vehicle) },
        { header: 'Maintenance item', value: (t) => t.name },
        { header: 'Category', value: (t) => t.category?.name },
        { header: 'Status', value: (t) => titleCase(t.status) },
        { header: 'Priority', value: (t) => titleCase(t.priority) },
        { header: 'Interval (km/hrs)', value: (t) => t.intervalKm },
        { header: 'Interval (months)', value: (t) => t.intervalMonths },
        { header: 'Last performed', value: (t) => (t.lastPerformedDate ? new Date(t.lastPerformedDate) : '') },
        { header: 'Last odometer', value: (t) => t.lastPerformedOdometer },
        { header: 'Next due date', value: (t) => (t.nextDueDate ? new Date(t.nextDueDate) : '') },
        { header: 'Next due odometer', value: (t) => t.nextDueOdometer },
        { header: 'Completed on', value: (t) => (t.completedAt ? new Date(t.completedAt) : '') },
        { header: 'Completed odometer', value: (t) => t.completedOdometer },
        { header: 'Estimated cost', value: (t) => t.estimatedCost },
        { header: 'Actual cost', value: (t) => t.actualCost },
      ],
      tasks
    );
    return sendCsv(res, `maintenance-${stamp()}.csv`, csv);
  }

  const history = query.history === 'true';
  const doc = createPdf(res, {
    filename: `maintenance-${stamp()}.pdf`,
    title: history ? 'Maintenance History' : 'Maintenance Schedule',
    subtitle: await scopeLabel(owner, query.vehicle),
  });
  const counts = tasks.reduce((acc, t) => ({ ...acc, [t.status]: (acc[t.status] || 0) + 1 }), {});
  statBoxes(
    doc,
    history
      ? [
          { label: 'Completed', value: counts.completed || 0, color: PDF_COLORS.blue },
          { label: 'Skipped', value: counts.skipped || 0 },
          { label: 'Spend', value: money(tasks.reduce((s, t) => s + (t.actualCost || 0), 0)) },
        ]
      : [
          { label: 'Overdue', value: counts.overdue || 0, color: PDF_COLORS.red },
          { label: 'Due', value: counts.due || 0, color: PDF_COLORS.orange },
          { label: 'Due soon', value: counts.due_soon || 0, color: PDF_COLORS.amber },
          { label: 'Up to date', value: counts.up_to_date || 0, color: PDF_COLORS.green },
        ]
  );
  sectionTitle(doc, history ? 'Completed & skipped items' : 'Open maintenance items');
  table(
    doc,
    [
      { header: 'Vehicle', width: 1.7, value: (t) => vName(t.vehicle) },
      { header: 'Item', width: 2, value: (t) => t.name },
      { header: 'Category', width: 1.1, value: (t) => t.category?.name },
      history
        ? { header: 'Date', width: 1.1, value: (t) => fmtDate(t.completedAt || t.skippedAt) }
        : { header: 'Due date', width: 1.1, value: (t) => fmtDate(t.nextDueDate) },
      history
        ? { header: 'Odometer', width: 0.9, align: 'right', value: (t) => fmtNumber(t.completedOdometer) }
        : { header: 'Due at', width: 0.9, align: 'right', value: (t) => fmtNumber(t.nextDueOdometer) },
      { header: 'Status', width: 0.9, bold: true, value: (t) => titleCase(t.status), color: (t) => STATUS_COLOR[t.status] },
    ],
    tasks
  );
  return finalizePdf(doc);
}

// ─── Printable vehicle report ────────────────────────────────────────────────
export async function exportVehicleReport(owner, vehicleId, res) {
  const vehicle = await Vehicle.findOne({ _id: vehicleId, owner });
  if (!vehicle) throw ApiError.notFound('Vehicle');

  const [overview, openTasks, services, documents] = await Promise.all([
    getVehicleOverview(vehicle),
    MaintenanceTask.find({ vehicle: vehicle._id, isOpen: true }).populate('category', 'name').sort({ nextDueDate: 1 }).lean(),
    ServiceRecord.find({ vehicle: vehicle._id }).sort({ serviceDate: -1 }).limit(40).lean(),
    Document.find({ vehicle: vehicle._id }).sort({ expiryDate: 1 }).lean(),
  ]);
  const unit = overview.type?.usageUnit === 'hours' ? 'hrs' : 'km';
  const statusOrder = { overdue: 0, due: 1, due_soon: 2, up_to_date: 3 };
  openTasks.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  const doc = createPdf(res, {
    filename: `${vehicle.registrationNumber.replace(/\s+/g, '-')}-maintenance-report.pdf`,
    title: 'Vehicle Maintenance Report',
    subtitle: `${vehicle.make} ${vehicle.model} · ${vehicle.registrationNumber}`,
  });

  const healthColor =
    vehicle.healthScore >= 90 ? PDF_COLORS.green : vehicle.healthScore >= 75 ? PDF_COLORS.blue : vehicle.healthScore >= 50 ? PDF_COLORS.amber : PDF_COLORS.red;
  statBoxes(doc, [
    { label: 'Health score', value: `${vehicle.healthScore}/100`, color: healthColor },
    { label: `Odometer (${unit})`, value: fmtNumber(vehicle.odometer) },
    { label: 'Overdue items', value: overview.statusCounts.overdue || 0, color: PDF_COLORS.red },
    { label: 'Total expenses', value: money(overview.totals.expenses) },
  ]);

  sectionTitle(doc, 'Vehicle details');
  keyValueGrid(
    doc,
    [
      ['Make / model', `${vehicle.make} ${vehicle.model}${vehicle.variant ? ` ${vehicle.variant}` : ''}`],
      ['Registration', vehicle.registrationNumber],
      ['Vehicle type', overview.type?.name || titleCase(vehicle.vehicleType)],
      ['Fuel', overview.fuel?.name || titleCase(vehicle.fuelType)],
      ['Year', vehicle.year || '—'],
      ['Transmission', titleCase(vehicle.transmission)],
      ['VIN / chassis', vehicle.vin || '—'],
      ['Engine number', vehicle.engineNumber || '—'],
      ['Purchase date', fmtDate(vehicle.purchaseDate)],
      ['Last service', vehicle.lastServiceDate ? `${fmtDate(vehicle.lastServiceDate)} @ ${fmtNumber(vehicle.lastServiceOdometer)} ${unit}` : '—'],
    ],
    2
  );

  sectionTitle(doc, 'Maintenance schedule', 'Due date or odometer — whichever comes first');
  table(
    doc,
    [
      { header: 'Item', width: 2.2, value: (t) => t.name },
      { header: 'Category', width: 1.2, value: (t) => t.category?.name },
      { header: 'Interval', width: 1.3, value: (t) => [t.intervalKm ? `${fmtNumber(t.intervalKm)} ${unit}` : null, t.intervalMonths ? `${t.intervalMonths} mo` : null].filter(Boolean).join(' / ') },
      { header: 'Due date', width: 1.1, value: (t) => fmtDate(t.nextDueDate) },
      { header: `Due (${unit})`, width: 1, align: 'right', value: (t) => fmtNumber(t.nextDueOdometer) },
      { header: 'Status', width: 1, bold: true, value: (t) => titleCase(t.status), color: (t) => STATUS_COLOR[t.status] },
    ],
    openTasks
  );

  sectionTitle(doc, 'Service history', `${overview.totals.services} records · ${money(overview.totals.serviceSpend)} total`);
  table(
    doc,
    [
      { header: 'Date', width: 1.1, value: (r) => fmtDate(r.serviceDate) },
      { header: unit === 'hrs' ? 'Hours' : 'Odometer', width: 0.9, align: 'right', value: (r) => fmtNumber(r.odometer) },
      { header: 'Service center', width: 1.6, value: (r) => r.serviceCenter },
      { header: 'Work done', width: 3, value: (r) => r.maintenanceItems.map((i) => i.name).join(', ') || titleCase(r.serviceType) },
      { header: 'Total', width: 1, align: 'right', bold: true, value: (r) => money(r.totalCost) },
    ],
    services,
    { emptyText: 'No service records yet' }
  );

  sectionTitle(doc, 'Expenses by category');
  table(
    doc,
    [
      { header: 'Category', width: 3, value: (c) => titleCase(c.category) },
      { header: 'Total', width: 1, align: 'right', bold: true, value: (c) => money(c.total) },
    ],
    overview.expenseByCategory
  );

  sectionTitle(doc, 'Documents');
  table(
    doc,
    [
      { header: 'Document', width: 2.2, value: (d) => d.name },
      { header: 'Type', width: 1.6, value: (d) => titleCase(d.type) },
      { header: 'Expiry', width: 1.1, value: (d) => fmtDate(d.expiryDate) },
      {
        header: 'Status',
        width: 1.1,
        bold: true,
        value: (d) => titleCase(documentExpiryStatus(d).status),
        color: (d) => STATUS_COLOR[documentExpiryStatus(d).status],
      },
    ],
    documents,
    { emptyText: 'No documents stored' }
  );

  paragraph(
    doc,
    'This report was generated from the maintenance records in AutoCare360. Intervals are recommendations — always follow your manufacturer\'s service manual.'
  );
  return finalizePdf(doc);
}

import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Printer, FileDown, ChevronLeft } from 'lucide-react';
import { Button, Card, Skeleton, ErrorState } from '@/components/ui';
import { LogoMark } from '@/components/brand/Logo';
import { VehicleVisual } from '@/components/vehicles/VehicleVisual';
import { vehicleApi, maintenanceApi, serviceRecordApi, documentApi, exportApi } from '@/services';
import { useFetch } from '@/hooks/useFetch';
import { useDocumentTitle, useMeta } from '@/hooks/common';
import { formatCurrency, formatDate, formatNumber } from '@/utils/format';
import { TASK_STATUS, HEALTH, healthKey, TRANSMISSIONS, EXPENSE_CATEGORIES, EXPIRY_STATUS, DOCUMENT_TYPES } from '@/utils/constants';
import { unitLabel, vehicleName } from '@/utils/vehicle';
import { getErrorMessage } from '@/utils/errors';

const STATUS_TEXT = {
  overdue: 'text-red-600',
  due: 'text-orange-600',
  due_soon: 'text-amber-600',
  up_to_date: 'text-emerald-600',
};

function Section({ title, children, caption }) {
  return (
    <section className="print-avoid-break mt-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b-2 border-brand-600 pb-1.5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">{title}</h2>
        {caption && <span className="text-xs text-slate-500">{caption}</span>}
      </div>
      <div className="scrollbar-thin overflow-x-auto print:overflow-visible">{children}</div>
    </section>
  );
}

const Th = ({ children, right }) => <th className={`px-2 py-2 text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 ${right ? 'text-right' : 'text-left'}`}>{children}</th>;
const Td = ({ children, right, className = '' }) => <td className={`px-2 py-1.5 text-[12.5px] text-slate-700 ${right ? 'text-right tabular' : ''} ${className}`}>{children}</td>;

/** A4 printable maintenance report (always rendered on white paper, even in dark mode). */
export default function VehicleReportPage() {
  const { id } = useParams();
  const { vehicleTypeMap, fuelTypeMap } = useMeta();
  const { data, error, initialLoading, refetch } = useFetch(
    async (signal) => {
      const [v, overview, tasks, services, docs] = await Promise.all([
        vehicleApi.get(id, { signal }),
        vehicleApi.overview(id, { signal }),
        maintenanceApi.list({ vehicle: id, limit: 100 }, { signal }),
        serviceRecordApi.list({ vehicle: id, limit: 50 }, { signal }),
        documentApi.list({ vehicle: id, limit: 50, sort: 'expiryDate' }, { signal }),
      ]);
      return { data: { vehicle: v.data, overview: overview.data, tasks: tasks.data, services: services.data, serviceTotals: services.meta.totals, documents: docs.data } };
    },
    [id]
  );
  useDocumentTitle(data ? `${vehicleName(data.vehicle)} — report` : 'Vehicle report');

  if (error) return <Card><ErrorState error={error} onRetry={refetch} /></Card>;
  if (initialLoading || !data) return <Skeleton className="mx-auto h-[1000px] max-w-[860px] rounded-2xl" />;

  const { vehicle, overview, tasks, services, serviceTotals, documents } = data;
  const type = vehicleTypeMap[vehicle.vehicleType];
  const u = unitLabel(type?.usageUnit);
  const hk = healthKey(vehicle.healthScore);
  const counts = overview.statusCounts;

  const download = async () => {
    const t = toast.loading('Generating PDF…');
    try {
      await exportApi.vehicleReport(id);
      toast.success('PDF downloaded', { id: t });
    } catch (e) {
      toast.error(getErrorMessage(e), { id: t });
    }
  };

  return (
    <div>
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link to={`/app/vehicles/${id}`} className="inline-flex items-center gap-1 text-sm font-medium text-ink-3 hover:text-ink">
          <ChevronLeft size={16} aria-hidden /> Back to vehicle
        </Link>
        <div className="flex gap-2">
          <Button variant="secondary" leftIcon={FileDown} onClick={download}>
            Download PDF
          </Button>
          <Button leftIcon={Printer} onClick={() => window.print()}>
            Print report
          </Button>
        </div>
      </div>

      <article className="print-sheet mx-auto max-w-[860px] rounded-2xl border border-line bg-white p-8 text-slate-900 shadow-card sm:p-10" style={{ colorScheme: 'light' }}>
        <header className="flex items-start justify-between gap-6 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            <LogoMark size={40} />
            <div>
              <p className="text-lg font-bold tracking-tight">
                AutoCare<span className="text-brand-600">360</span>
              </p>
              <p className="text-xs text-slate-500">Vehicle maintenance report</p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Generated {formatDate(new Date(), 'd MMMM yyyy, h:mm a')}</p>
            <p className="mt-0.5 font-mono">{vehicle.registrationNumber}</p>
          </div>
        </header>

        <div className="mt-6 grid gap-6 sm:grid-cols-[220px_1fr]">
          <VehicleVisual vehicle={vehicle} illustration={type?.illustration} className="aspect-[4/3] w-full p-3" artClassName="w-full" />
          <div>
            <h1 className="text-2xl font-bold">{vehicleName(vehicle)}</h1>
            <p className="text-sm text-slate-600">
              {vehicle.make} {vehicle.model} {vehicle.variant} {vehicle.year ? `· ${vehicle.year}` : ''}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              {[
                ['Type', type?.name],
                ['Fuel', [fuelTypeMap[vehicle.fuelType]?.name, fuelTypeMap[vehicle.secondaryFuelType]?.name].filter(Boolean).join(' + ')],
                ['Transmission', TRANSMISSIONS[vehicle.transmission]],
                [type?.usageUnit === 'hours' ? 'Hour meter' : 'Odometer', `${formatNumber(vehicle.odometer)} ${u}`],
                ['VIN', vehicle.vin || '—'],
                ['Purchased', formatDate(vehicle.purchaseDate)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] uppercase tracking-wide text-slate-500">{k}</dt>
                  <dd className="font-medium">{v || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Health score', `${vehicle.healthScore}/100`, HEALTH[hk].label],
            ['Overdue items', counts.overdue || 0, `${counts.due || 0} due now`],
            ['Service spend', formatCurrency(serviceTotals?.total || 0), `${serviceTotals?.count || 0} visits`],
            ['Running costs', formatCurrency(overview.totals.expenses), overview.totals.runningCostPerKm ? `₹${overview.totals.runningCostPerKm}/${u}` : ''],
          ].map(([label, value, sub]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-1 text-lg font-bold">{value}</p>
              <p className="text-xs text-slate-500">{sub}</p>
            </div>
          ))}
        </div>

        <Section title="Maintenance schedule" caption="Due by date or reading — whichever comes first">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <Th>Item</Th>
                <Th>Category</Th>
                <Th>Due date</Th>
                <Th right>Due at</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.map((t) => (
                <tr key={t._id}>
                  <Td className="font-medium text-slate-900">{t.name}</Td>
                  <Td>{t.category?.name}</Td>
                  <Td>{formatDate(t.nextDueDate)}</Td>
                  <Td right>{t.nextDueOdometer ? `${formatNumber(t.nextDueOdometer)} ${u}` : '—'}</Td>
                  <Td className={`font-semibold ${STATUS_TEXT[t.status]}`}>{TASK_STATUS[t.status]?.label}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Service history" caption={`${serviceTotals?.count || 0} records`}>
          {services.length ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <Th>Date</Th>
                  <Th right>Reading</Th>
                  <Th>Service centre</Th>
                  <Th>Work done</Th>
                  <Th right>Total</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {services.map((s) => (
                  <tr key={s._id}>
                    <Td>{formatDate(s.serviceDate)}</Td>
                    <Td right>{formatNumber(s.odometer)}</Td>
                    <Td>{s.serviceCenter}</Td>
                    <Td className="max-w-[260px]">{s.maintenanceItems.map((i) => i.name).join(', ') || '—'}</Td>
                    <Td right className="font-semibold text-slate-900">{formatCurrency(s.totalCost)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-slate-500">No service records.</p>
          )}
        </Section>

        <div className="grid gap-x-8 sm:grid-cols-2">
          <Section title="Expenses by category">
            <table className="w-full">
              <tbody className="divide-y divide-slate-100">
                {overview.expenseByCategory.map((c) => (
                  <tr key={c.category}>
                    <Td>{EXPENSE_CATEGORIES[c.category]?.label || c.category}</Td>
                    <Td right className="font-semibold text-slate-900">{formatCurrency(c.total)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
          <Section title="Documents">
            <table className="w-full">
              <tbody className="divide-y divide-slate-100">
                {documents.map((d) => (
                  <tr key={d._id}>
                    <Td>
                      <span className="font-medium text-slate-900">{d.name}</span>
                      <span className="block text-[11px] text-slate-500">{DOCUMENT_TYPES[d.type]?.label}</span>
                    </Td>
                    <Td right>
                      {d.expiryDate ? formatDate(d.expiryDate) : 'No expiry'}
                      <span className={`block text-[11px] font-semibold ${d.expiry?.status === 'expired' ? 'text-red-600' : d.expiry?.status === 'expiring_soon' ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {EXPIRY_STATUS[d.expiry?.status]?.label}
                      </span>
                    </Td>
                  </tr>
                ))}
                {!documents.length && (
                  <tr>
                    <Td>No documents stored.</Td>
                  </tr>
                )}
              </tbody>
            </table>
          </Section>
        </div>

        <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-[11px] text-slate-400">
          Intervals are recommendations generated by AutoCare360 for this vehicle’s type, fuel and powertrain. Always follow the manufacturer’s service manual.
        </footer>
      </article>
    </div>
  );
}

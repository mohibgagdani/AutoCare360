import { useMemo } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  Gauge,
  Pencil,
  History,
  Wallet,
  Printer,
  FileDown,
  Trash2,
  LayoutDashboard,
  Wrench,
  FileText,
  BellRing,
  StickyNote,
  Fuel,
  Zap,
  Calendar,
  Camera,
} from 'lucide-react';
import { Card, Button, Tabs, Menu, Badge, HealthBadge, ErrorState, Skeleton, useConfirm } from '@/components/ui';
import { VehicleVisual, RegPlate } from '@/components/vehicles/VehicleVisual';
import { OdometerModal } from '@/features/vehicles/OdometerModal';
import { NotesPanel } from '@/features/vehicles/NotesPanel';
import { OverviewTab, MaintenanceTab, ServicesTab, ExpensesTab, DocumentsTab, RemindersTab } from '@/features/vehicles/VehicleTabs';
import { useTaskActions } from '@/features/maintenance/useTaskActions';
import { useReminderActions } from '@/features/reminders/useReminderActions';
import { useRecordActions } from '@/features/records/useRecordActions';
import { vehicleApi, exportApi } from '@/services';
import { useFetch } from '@/hooks/useFetch';
import { useDisclosure, useDocumentTitle, useMeta } from '@/hooks/common';
import { formatNumber, formatRelative } from '@/utils/format';
import { unitLabel, vehicleName } from '@/utils/vehicle';
import { emitChange } from '@/utils/events';
import { getErrorMessage } from '@/utils/errors';

export default function VehicleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const { vehicleTypeMap, fuelTypeMap } = useMeta();
  const odometer = useDisclosure();

  const { data: vehicle, error, refetch, initialLoading } = useFetch((signal) => vehicleApi.get(id, { signal }), [id], {
    refreshOn: ['vehicles', 'maintenance', 'services'],
  });
  useDocumentTitle(vehicle ? vehicleName(vehicle) : 'Vehicle');

  const vehicles = useMemo(() => (vehicle ? [vehicle] : []), [vehicle]);
  const taskActions = useTaskActions({ vehicles, defaultVehicle: id });
  const reminderActions = useReminderActions({ vehicles, defaultVehicle: id });
  const records = useRecordActions({ vehicles, defaultVehicle: id });

  const tab = searchParams.get('tab') || 'overview';
  const setTab = (value, status) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', value);
    if (status) next.set('status', status);
    else next.delete('status');
    setSearchParams(next, { replace: true });
  };

  if (error) {
    return (
      <Card>
        <ErrorState error={error} onRetry={refetch} title={error.response?.status === 404 ? 'Vehicle not found' : undefined} />
      </Card>
    );
  }
  if (initialLoading || !vehicle) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-56 rounded-3xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  const type = vehicleTypeMap[vehicle.vehicleType];
  const fuel = fuelTypeMap[vehicle.fuelType];
  const unit = type?.usageUnit || 'km';
  const u = unitLabel(unit);
  const counts = vehicle.openTaskCounts || {};

  const removeVehicle = () =>
    confirm({
      title: `Delete ${vehicleName(vehicle)}?`,
      message: 'This permanently deletes the vehicle with its maintenance schedule, service history, expenses, documents and reminders.',
      confirmLabel: 'Delete vehicle',
      action: async () => {
        try {
          const res = await vehicleApi.remove(vehicle._id);
          toast.success(res.message);
          emitChange('vehicles', 'maintenance', 'expenses');
          navigate('/app/vehicles', { replace: true });
        } catch (e) {
          toast.error(getErrorMessage(e));
          throw e;
        }
      },
    });

  const uploadPhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) return toast.error('Please choose an image under 5 MB');
      try {
        await vehicleApi.uploadImage(vehicle._id, file);
        toast.success('Vehicle photo updated');
        refetch({ silent: true });
      } catch (e) {
        toast.error(getErrorMessage(e));
      }
      return undefined;
    };
    input.click();
  };

  const downloadReport = async () => {
    const t = toast.loading('Generating PDF report…');
    try {
      await exportApi.vehicleReport(vehicle._id);
      toast.success('Report downloaded', { id: t });
    } catch (e) {
      toast.error(getErrorMessage(e), { id: t });
    }
  };

  const tabs = [
    { value: 'overview', label: 'Overview', icon: LayoutDashboard },
    { value: 'maintenance', label: 'Maintenance', icon: Wrench, count: counts.overdue || undefined, countTone: 'red' },
    { value: 'services', label: 'Service history', icon: History },
    { value: 'expenses', label: 'Expenses', icon: Wallet },
    { value: 'documents', label: 'Documents', icon: FileText },
    { value: 'reminders', label: 'Reminders', icon: BellRing },
    { value: 'notes', label: 'Notes', icon: StickyNote, count: vehicle.noteEntries?.length || undefined },
  ];

  return (
    <>
      <Link to="/app/vehicles" className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-ink-3 transition hover:text-ink">
        <ChevronLeft size={15} aria-hidden /> Vehicles
      </Link>

      <Card className="relative mb-6 overflow-hidden">
        <div className="grid gap-0 md:grid-cols-[minmax(0,340px)_1fr]">
          <div className="group relative">
            <VehicleVisual
              vehicle={vehicle}
              illustration={type?.illustration}
              rounded="rounded-none"
              className="aspect-[16/10] h-full w-full px-8 py-6 md:aspect-auto md:min-h-[220px]"
              artClassName="w-full max-w-[320px]"
            />
            <button
              type="button"
              onClick={uploadPhoto}
              className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-medium text-slate-700 opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100 focus:opacity-100 dark:bg-navy-900/80 dark:text-slate-200"
            >
              <Camera size={13} aria-hidden /> {vehicle.image ? 'Change photo' : 'Add photo'}
            </button>
          </div>
          <div className="flex flex-col justify-between gap-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand">{type?.name}</Badge>
                  <Badge tone={fuel?.powertrain === 'ev' ? 'green' : 'gray'} icon={fuel?.powertrain === 'ev' ? Zap : Fuel}>
                    {[fuel?.name, fuelTypeMap[vehicle.secondaryFuelType]?.name].filter(Boolean).join(' + ')}
                  </Badge>
                  <HealthBadge score={vehicle.healthScore} />
                  {vehicle.status !== 'active' && <Badge tone="yellow">{vehicle.status}</Badge>}
                </div>
                <h1 className="mt-3 font-display text-2xl font-bold text-ink sm:text-3xl">{vehicleName(vehicle)}</h1>
                <p className="mt-1 text-sm text-ink-3">
                  {vehicle.make} {vehicle.model} {vehicle.variant} {vehicle.year ? `· ${vehicle.year}` : ''}
                </p>
              </div>
              <RegPlate number={vehicle.registrationNumber} fuelType={vehicle.fuelType} group={type?.group} size="lg" />
            </div>

            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-ink-3">
                  <Gauge size={13} aria-hidden /> {unit === 'hours' ? 'Hour meter' : 'Odometer'}
                </dt>
                <dd className="mt-0.5 text-lg font-semibold text-ink tabular">
                  {formatNumber(vehicle.odometer)} <span className="text-sm font-medium text-ink-3">{u}</span>
                </dd>
                <dd className="text-[11px] text-ink-3">updated {formatRelative(vehicle.odometerUpdatedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-3">Health score</dt>
                <dd className="mt-0.5 text-lg font-semibold text-ink tabular">
                  {vehicle.healthScore}
                  <span className="text-sm font-medium text-ink-3">/100</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-3">Overdue items</dt>
                <dd className={`mt-0.5 text-lg font-semibold tabular ${counts.overdue ? 'text-red-600 dark:text-red-400' : 'text-ink'}`}>{counts.overdue || 0}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-ink-3">
                  <Calendar size={13} aria-hidden /> Next up
                </dt>
                <dd className="mt-0.5 truncate text-sm font-semibold text-ink">{vehicle.nextService?.name || 'Nothing due'}</dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" leftIcon={Gauge} onClick={() => odometer.open(vehicle)}>
                Update {unit === 'hours' ? 'hours' : 'odometer'}
              </Button>
              <Button size="sm" variant="secondary" leftIcon={History} onClick={records.actions.createService}>
                Log service
              </Button>
              <Button size="sm" variant="secondary" leftIcon={Wallet} onClick={records.actions.createExpense}>
                Add expense
              </Button>
              <Button size="sm" variant="secondary" leftIcon={Pencil} to={`/app/vehicles/${vehicle._id}/edit`}>
                Edit
              </Button>
              <Menu
                label="More vehicle actions"
                triggerClassName="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 hover:bg-surface-2"
                items={[
                  { label: 'Printable report', icon: Printer, onClick: () => navigate(`/app/vehicles/${vehicle._id}/report`) },
                  { label: 'Download PDF report', icon: FileDown, onClick: downloadReport },
                  { label: vehicle.image ? 'Change photo' : 'Add photo', icon: Camera, onClick: uploadPhoto },
                  { divider: true },
                  { label: 'Delete vehicle', icon: Trash2, danger: true, onClick: removeVehicle },
                ]}
              />
            </div>
          </div>
        </div>
      </Card>

      <Tabs tabs={tabs} value={tab} onChange={(v) => setTab(v)} className="mb-6" />

      <div role="tabpanel" aria-label={tabs.find((t) => t.value === tab)?.label}>
        {tab === 'overview' && <OverviewTab vehicle={vehicle} taskActions={taskActions.actions} onTab={setTab} />}
        {tab === 'maintenance' && <MaintenanceTab vehicle={vehicle} taskActions={taskActions.actions} initialStatus={searchParams.get('status')} />}
        {tab === 'services' && <ServicesTab vehicle={vehicle} onOpen={records.actions.openService} onCreate={records.actions.createService} />}
        {tab === 'expenses' && (
          <ExpensesTab vehicle={vehicle} onCreate={records.actions.createExpense} onEdit={records.actions.editExpense} onDelete={records.actions.deleteExpense} />
        )}
        {tab === 'documents' && (
          <DocumentsTab vehicle={vehicle} onCreate={records.actions.createDocument} onEdit={records.actions.editDocument} onDelete={records.actions.deleteDocument} />
        )}
        {tab === 'reminders' && <RemindersTab vehicle={vehicle} reminderActions={reminderActions.actions} />}
        {tab === 'notes' && <NotesPanel vehicle={vehicle} onChange={() => refetch({ silent: true })} />}
      </div>

      {taskActions.element}
      {reminderActions.element}
      {records.element}
      <OdometerModal open={odometer.isOpen} vehicle={odometer.payload} unit={unit} onClose={odometer.close} />
    </>
  );
}

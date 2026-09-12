import { useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { History, Plus, Trash2, Star, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal, Button, Field, Input, Select, Textarea, DatePicker, FileDropzone, StatusBadge, Skeleton, Callout } from '@/components/ui';
import { CategoryIcon } from '@/components/maintenance/MaintenanceBits';
import { maintenanceApi, serviceRecordApi } from '@/services';
import { serviceRecordSchema, toPayload } from '@/validations';
import { useMeta } from '@/hooks/common';
import { applyServerErrors, getErrorMessage } from '@/utils/errors';
import { emitChange } from '@/utils/events';
import { SERVICE_TYPES, PAYMENT_METHODS, TASK_STATUS } from '@/utils/constants';
import { formatCurrency, toInputDate } from '@/utils/format';
import { unitLabel, vehicleName } from '@/utils/vehicle';
import { cn } from '@/utils/cn';

const num = (v) => (v === '' || v === undefined || v === null ? 0 : Number(v) || 0);

function RatingInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Service rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(value === n ? 0 : n)}
          className="rounded p-0.5 transition hover:scale-110"
        >
          <Star size={20} className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-line-strong'} />
        </button>
      ))}
    </div>
  );
}

/**
 * Log or edit a service visit. Selecting open maintenance items completes them
 * and schedules their next occurrence automatically.
 */
export function ServiceRecordFormModal({ open, onClose, record, vehicles = [], defaultVehicle }) {
  const { vehicleTypeMap } = useMeta();
  const editing = Boolean(record);
  const [invoice, setInvoice] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [openTasks, setOpenTasks] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setError,
    setValue,
    formState: { errors },
  } = useForm({ resolver: zodResolver(serviceRecordSchema) });
  const parts = useFieldArray({ control, name: 'partsReplaced' });
  const custom = useFieldArray({ control, name: 'customItems' });

  useEffect(() => {
    if (!open) return;
    setInvoice([]);
    setPhotos([]);
    const v = record?.vehicle?._id || record?.vehicle || defaultVehicle || vehicles[0]?._id || '';
    const vehicleObj = vehicles.find((x) => x._id === v);
    reset(
      record
        ? {
            vehicle: v,
            serviceDate: toInputDate(record.serviceDate),
            odometer: record.odometer,
            serviceType: record.serviceType,
            serviceCenter: record.serviceCenter || '',
            serviceCenterLocation: record.serviceCenterLocation || '',
            mechanic: record.mechanic || '',
            laborCost: record.laborCost ?? '',
            partsCost: record.partsReplaced?.length ? '' : record.partsCost ?? '',
            taxes: record.taxes ?? '',
            discount: record.discount ?? '',
            paymentMethod: record.expense?.paymentMethod || 'upi',
            rating: record.rating || 0,
            notes: record.notes || '',
            customItems: record.maintenanceItems.filter((i) => !i.task).map((i) => ({ name: i.name })),
            partsReplaced: record.partsReplaced.map((p) => ({ name: p.name, partNumber: p.partNumber || '', quantity: p.quantity, unitPrice: p.unitPrice })),
          }
        : {
            vehicle: v,
            serviceDate: toInputDate(new Date()),
            odometer: vehicleObj?.odometer ?? '',
            serviceType: 'periodic_service',
            serviceCenter: '',
            serviceCenterLocation: '',
            mechanic: '',
            laborCost: '',
            partsCost: '',
            taxes: '',
            discount: '',
            paymentMethod: 'upi',
            rating: 0,
            notes: '',
            customItems: [],
            partsReplaced: [],
          }
    );
    setSelected(new Set(record ? record.maintenanceItems.filter((i) => i.task).map((i) => String(i.task?._id || i.task)) : []));
  }, [open, record, defaultVehicle, vehicles, reset]);

  const vehicleId = watch('vehicle');
  const vehicle = vehicles.find((v) => v._id === vehicleId) || record?.vehicle;
  const u = unitLabel(vehicleTypeMap[vehicle?.vehicleType]?.usageUnit);

  // Open maintenance items for the chosen vehicle.
  useEffect(() => {
    if (!open || !vehicleId) return undefined;
    let cancelled = false;
    setOpenTasks(null);
    maintenanceApi
      .list({ vehicle: vehicleId, limit: 100, sort: 'urgency' })
      .then((res) => !cancelled && setOpenTasks(res.data))
      .catch(() => !cancelled && setOpenTasks([]));
    if (!editing) {
      const v = vehicles.find((x) => x._id === vehicleId);
      if (v) setValue('odometer', v.odometer);
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vehicleId]);

  const toggle = (id) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectAttention = () => setSelected(new Set((openTasks || []).filter((t) => ['overdue', 'due', 'due_soon'].includes(t.status)).map((t) => t._id)));

  const [labor, partsCostField, taxes, discount, partsList] = watch(['laborCost', 'partsCost', 'taxes', 'discount', 'partsReplaced']);
  const partsFromList = useMemo(() => (partsList || []).reduce((s, p) => s + num(p.quantity || 1) * num(p.unitPrice), 0), [partsList]);
  const partsTotal = partsFromList > 0 ? partsFromList : num(partsCostField);
  const total = Math.max(0, num(labor) + partsTotal + num(taxes) - num(discount));

  const suggestedCost = useMemo(
    () => (openTasks || []).filter((t) => selected.has(t._id)).reduce((s, t) => s + (t.estimatedCost || 0), 0),
    [openTasks, selected]
  );

  const onSubmit = async (form) => {
    setSubmitting(true);
    try {
      const { customItems = [], partsReplaced = [], ...rest } = form;
      const linkedExisting = editing ? record.maintenanceItems.filter((i) => i.task).map((i) => ({ task: String(i.task?._id || i.task), name: i.name })) : [];
      const taskItems = (openTasks || []).filter((t) => selected.has(t._id)).map((t) => ({ task: t._id, name: t.name }));
      const itemMap = new Map([...linkedExisting, ...taskItems].filter((i) => selected.has(i.task)).map((i) => [i.task, i]));
      const payload = toPayload({
        ...rest,
        rating: rest.rating || undefined,
        partsCost: partsFromList > 0 ? undefined : rest.partsCost,
        maintenanceItems: [...itemMap.values(), ...customItems.filter((c) => c.name?.trim()).map((c) => ({ name: c.name.trim() }))],
        partsReplaced: partsReplaced
          .filter((p) => p.name?.trim())
          .map((p) => ({ name: p.name.trim(), partNumber: p.partNumber || undefined, quantity: num(p.quantity) || 1, unitPrice: num(p.unitPrice) })),
      });
      const files = { invoice: invoice[0], photos };
      const res = editing ? await serviceRecordApi.update(record._id, payload, files) : await serviceRecordApi.create(payload, files);
      toast.success(res.message);
      emitChange('services', 'maintenance', 'vehicles', 'expenses', 'reminders');
      onClose(res.data);
    } catch (error) {
      applyServerErrors(error, setError);
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const attention = (openTasks || []).filter((t) => ['overdue', 'due', 'due_soon'].includes(t.status));
  const others = (openTasks || []).filter((t) => !['overdue', 'due', 'due_soon'].includes(t.status));

  const TaskRow = ({ t }) => (
    <label className={cn('flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition', selected.has(t._id) ? 'border-brand-400 bg-brand-50/60 dark:bg-brand-500/10' : 'border-line hover:bg-surface-2')}>
      <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={selected.has(t._id)} onChange={() => toggle(t._id)} />
      <CategoryIcon category={t.category} size={28} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{t.name}</span>
        <span className="block truncate text-xs text-ink-3">{t.category?.name}</span>
      </span>
      <StatusBadge status={t.status} size="xs" />
    </label>
  );

  return (
    <Modal
      open={open}
      onClose={() => onClose()}
      size="xl"
      icon={History}
      title={editing ? 'Edit service record' : 'Log a service'}
      description={editing ? `${vehicleName(vehicle)} · ${record?.serviceCenter || ''}` : 'Items you tick are marked complete and their next occurrence is scheduled.'}
      footer={
        <>
          <div className="mr-auto hidden items-baseline gap-2 sm:flex">
            <span className="text-sm text-ink-3">Total</span>
            <span className="text-lg font-semibold text-ink tabular">{formatCurrency(total)}</span>
          </div>
          <Button variant="secondary" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={submitting} leftIcon={CheckCircle2}>
            {editing ? 'Save changes' : 'Save service record'}
          </Button>
        </>
      }
    >
      <form className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-4">
          <Field label="Vehicle" htmlFor="sr-vehicle" required error={errors.vehicle?.message}>
            <Select
              id="sr-vehicle"
              aria-readonly={editing || undefined}
              tabIndex={editing ? -1 : undefined}
              className={editing ? 'pointer-events-none bg-surface-2 text-ink-2' : undefined}
              invalid={!!errors.vehicle}
              placeholder="Choose a vehicle"
              {...register('vehicle')}
            >
              {(editing && record?.vehicle?._id ? [record.vehicle] : vehicles).map((v) => (
                <option key={v._id} value={v._id}>
                  {vehicleName(v)} · {v.registrationNumber}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Service date" htmlFor="sr-date" required error={errors.serviceDate?.message}>
              <DatePicker id="sr-date" max={toInputDate(new Date())} invalid={!!errors.serviceDate} {...register('serviceDate')} />
            </Field>
            <Field label={u === 'hrs' ? 'Hour meter' : 'Odometer'} htmlFor="sr-odo" required error={errors.odometer?.message}>
              <Input id="sr-odo" type="number" inputMode="numeric" suffix={u} invalid={!!errors.odometer} {...register('odometer')} />
            </Field>
            <Field label="Service type" htmlFor="sr-type">
              <Select id="sr-type" {...register('serviceType')}>
                {Object.entries(SERVICE_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Mechanic" htmlFor="sr-mech">
              <Input id="sr-mech" placeholder="Technician name" {...register('mechanic')} />
            </Field>
            <Field label="Service centre" htmlFor="sr-center" error={errors.serviceCenter?.message}>
              <Input id="sr-center" placeholder="e.g. Toyota Authorised Service" {...register('serviceCenter')} />
            </Field>
            <Field label="Location" htmlFor="sr-loc">
              <Input id="sr-loc" placeholder="Area, city" {...register('serviceCenterLocation')} />
            </Field>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-ink">Parts replaced</p>
              <Button size="xs" variant="ghost" leftIcon={Plus} onClick={() => parts.append({ name: '', partNumber: '', quantity: 1, unitPrice: '' })}>
                Add part
              </Button>
            </div>
            {parts.fields.length ? (
              <div className="space-y-2">
                {parts.fields.map((f, i) => (
                  <div key={f.id} className="grid grid-cols-[1fr_64px_96px_32px] gap-2">
                    <Input size="sm" placeholder="Part name" aria-label="Part name" invalid={!!errors.partsReplaced?.[i]?.name} {...register(`partsReplaced.${i}.name`)} />
                    <Input size="sm" type="number" placeholder="Qty" aria-label="Quantity" {...register(`partsReplaced.${i}.quantity`)} />
                    <Input size="sm" type="number" placeholder="Price" prefix="₹" aria-label="Unit price" {...register(`partsReplaced.${i}.unitPrice`)} />
                    <button type="button" onClick={() => parts.remove(i)} className="flex items-center justify-center rounded-lg text-ink-3 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" aria-label="Remove part">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-line px-3 py-2.5 text-xs text-ink-3">No parts listed — enter a total parts cost below instead.</p>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-surface-2/60 p-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Labour" htmlFor="sr-labor" error={errors.laborCost?.message}>
                <Input id="sr-labor" type="number" inputMode="decimal" prefix="₹" size="sm" {...register('laborCost')} />
              </Field>
              <Field label="Parts" htmlFor="sr-parts" hint={partsFromList > 0 ? `From parts list: ${formatCurrency(partsFromList)}` : undefined}>
                <Input id="sr-parts" type="number" inputMode="decimal" prefix="₹" size="sm" disabled={partsFromList > 0} {...register('partsCost')} />
              </Field>
              <Field label="Taxes (GST)" htmlFor="sr-tax">
                <Input id="sr-tax" type="number" inputMode="decimal" prefix="₹" size="sm" {...register('taxes')} />
              </Field>
              <Field label="Discount" htmlFor="sr-disc">
                <Input id="sr-disc" type="number" inputMode="decimal" prefix="₹" size="sm" {...register('discount')} />
              </Field>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
              <span className="text-sm text-ink-2">
                Total {suggestedCost > 0 && <span className="text-xs text-ink-3">· items estimate {formatCurrency(suggestedCost)}</span>}
              </span>
              <span className="text-lg font-semibold text-ink tabular">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Paid via" htmlFor="sr-pay">
              <Select id="sr-pay" {...register('paymentMethod')}>
                {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Your rating">
              <Controller control={control} name="rating" render={({ field }) => <RatingInput value={field.value || 0} onChange={field.onChange} />} />
            </Field>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-ink">Maintenance performed</p>
              {attention.length > 0 && (
                <Button size="xs" variant="subtle" onClick={selectAttention}>
                  Select all due ({attention.length})
                </Button>
              )}
            </div>
            {openTasks === null ? (
              <div className="space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="scrollbar-thin max-h-80 space-y-1.5 overflow-y-auto pr-1">
                {editing &&
                  record.maintenanceItems
                    .filter((i) => i.task && !(openTasks || []).some((t) => t._id === String(i.task?._id || i.task)))
                    .map((i) => (
                      <div key={String(i.task?._id || i.task)} className="flex items-center gap-3 rounded-xl border border-brand-300 bg-brand-50/50 px-3 py-2 dark:bg-brand-500/10">
                        <CheckCircle2 size={16} className="text-brand-600" />
                        <span className="flex-1 truncate text-sm text-ink">{i.name}</span>
                        <span className="text-xs text-ink-3">{TASK_STATUS.completed.label}</span>
                      </div>
                    ))}
                {attention.map((t) => (
                  <TaskRow key={t._id} t={t} />
                ))}
                {others.length > 0 && <p className="px-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Other scheduled items</p>}
                {others.map((t) => (
                  <TaskRow key={t._id} t={t} />
                ))}
                {!openTasks.length && !editing && <Callout tone="info">No open maintenance items for this vehicle.</Callout>}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-ink">Other work done</p>
              <Button size="xs" variant="ghost" leftIcon={Plus} onClick={() => custom.append({ name: '' })}>
                Add item
              </Button>
            </div>
            <div className="space-y-2">
              {custom.fields.map((f, i) => (
                <div key={f.id} className="flex gap-2">
                  <Input size="sm" placeholder="e.g. Car wash, headlight restoration" aria-label="Work item" {...register(`customItems.${i}.name`)} />
                  <button type="button" onClick={() => custom.remove(i)} className="rounded-lg px-2 text-ink-3 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" aria-label="Remove item">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Field label="Notes" htmlFor="sr-notes">
            <Textarea id="sr-notes" rows={3} placeholder="Observations, recommendations from the workshop…" {...register('notes')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Invoice" hint={editing && record?.invoice ? 'Uploading replaces the current invoice' : undefined}>
              <FileDropzone kind="document" files={invoice} onChange={setInvoice} compact />
            </Field>
            <Field label="Photos">
              <FileDropzone kind="image" files={photos} onChange={setPhotos} multiple maxFiles={8} maxSizeMb={10} compact />
            </Field>
          </div>
        </div>
      </form>
    </Modal>
  );
}

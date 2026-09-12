import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, CalendarClock, SkipForward, Wrench } from 'lucide-react';
import { Modal, Button, Field, Input, Textarea, Select, DatePicker, Checkbox, Callout, OptionCards } from '@/components/ui';
import { maintenanceApi } from '@/services';
import { completeTaskSchema, rescheduleSchema, taskSchema, toPayload } from '@/validations';
import { useAction, useMeta } from '@/hooks/common';
import { applyServerErrors } from '@/utils/errors';
import { emitChange } from '@/utils/events';
import { toInputDate, formatNumber, formatDate } from '@/utils/format';
import { unitLabel, vehicleName } from '@/utils/vehicle';
import { PRIORITY, SERVICE_MODE } from '@/utils/constants';
import { intervalText } from '@/components/maintenance/MaintenanceBits';

const changed = () => emitChange('maintenance', 'vehicles', 'reminders', 'expenses');

export function CompleteTaskModal({ task, unit = 'km', open, onClose, onDone }) {
  const u = unitLabel(unit);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm({ resolver: zodResolver(completeTaskSchema) });

  useEffect(() => {
    if (open && task) {
      reset({
        date: toInputDate(new Date()),
        odometer: task.vehicle?.odometer ?? '',
        cost: task.estimatedCost || '',
        notes: '',
        logExpense: task.estimatedCost > 0,
      });
    }
  }, [open, task, reset]);

  const [complete, pending] = useAction((values) => maintenanceApi.complete(task._id, toPayload(values)), {
    onSuccess: (res) => {
      changed();
      onDone?.(res);
      onClose();
    },
    onError: (err) => applyServerErrors(err, setError),
  });

  const cost = watch('cost');
  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={CheckCircle2}
      title="Mark as completed"
      description={task ? `${task.name} · ${vehicleName(task.vehicle)}` : ''}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(complete)} loading={pending} leftIcon={CheckCircle2}>
            Complete
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(complete)} noValidate>
        {task?.isRecurring && (task.intervalKm || task.intervalMonths) && (
          <Callout tone="info" className="py-2.5">
            The next occurrence will be scheduled automatically · {intervalText(task, unit).toLowerCase()}.
          </Callout>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Completed on" htmlFor="c-date" required error={errors.date?.message}>
            <DatePicker id="c-date" max={toInputDate(new Date())} invalid={!!errors.date} {...register('date')} />
          </Field>
          <Field label={`${u === 'hrs' ? 'Hour meter' : 'Odometer'} reading`} htmlFor="c-odo" error={errors.odometer?.message}>
            <Input id="c-odo" type="number" inputMode="numeric" suffix={u} invalid={!!errors.odometer} {...register('odometer')} />
          </Field>
        </div>
        <Field label="Cost" htmlFor="c-cost" error={errors.cost?.message} hint={task?.estimatedCost ? `Estimated ₹${formatNumber(task.estimatedCost)}` : undefined}>
          <Input id="c-cost" type="number" inputMode="decimal" prefix="₹" invalid={!!errors.cost} {...register('cost')} />
        </Field>
        <Field label="Notes" htmlFor="c-notes">
          <Textarea id="c-notes" rows={2} placeholder="Oil grade used, parts brand, workshop…" {...register('notes')} />
        </Field>
        <Checkbox label="Log this cost as a maintenance expense" description="Adds an entry to Expenses so running costs stay accurate." disabled={!Number(cost)} {...register('logExpense')} />
      </form>
    </Modal>
  );
}

export function RescheduleModal({ task, unit = 'km', open, onClose }) {
  const u = unitLabel(unit);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(rescheduleSchema) });

  useEffect(() => {
    if (open && task) reset({ nextDueDate: toInputDate(task.nextDueDate), nextDueOdometer: task.nextDueOdometer ?? '', reason: '' });
  }, [open, task, reset]);

  const [save, pending] = useAction((values) => maintenanceApi.reschedule(task._id, toPayload(values)), {
    onSuccess: () => {
      changed();
      onClose();
    },
    onError: (err) => applyServerErrors(err, setError),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={CalendarClock}
      title="Reschedule maintenance"
      description={task?.name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(save)} loading={pending}>
            Save new due point
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(save)} noValidate>
        <p className="text-sm text-ink-3">The item becomes due on the date or at the reading — whichever comes first.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New due date" htmlFor="r-date" error={errors.nextDueDate?.message}>
            <DatePicker id="r-date" invalid={!!errors.nextDueDate} {...register('nextDueDate')} />
          </Field>
          <Field label={`New due reading`} htmlFor="r-odo" error={errors.nextDueOdometer?.message}>
            <Input id="r-odo" type="number" inputMode="numeric" suffix={u} invalid={!!errors.nextDueOdometer} {...register('nextDueOdometer')} />
          </Field>
        </div>
        <Field label="Reason (optional)" htmlFor="r-reason">
          <Input id="r-reason" placeholder="e.g. Booked service for next month" {...register('reason')} />
        </Field>
      </form>
    </Modal>
  );
}

export function SkipModal({ task, open, onClose }) {
  const { register, handleSubmit, reset } = useForm({ defaultValues: { reason: '' } });
  useEffect(() => {
    if (open) reset({ reason: '' });
  }, [open, reset]);

  const [skip, pending] = useAction((values) => maintenanceApi.skip(task._id, values), {
    onSuccess: () => {
      changed();
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={SkipForward}
      title="Skip this occurrence?"
      description={task?.name}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(skip)} loading={pending} variant="dark">
            Skip occurrence
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-2">
        The schedule restarts from today’s date and current reading. Skipped items stay in the maintenance history.
      </p>
      <Field label="Reason (optional)" htmlFor="s-reason" className="mt-4">
        <Textarea id="s-reason" rows={2} placeholder="e.g. Inspected at last service — no work needed" {...register('reason')} />
      </Field>
    </Modal>
  );
}

/** Create a custom maintenance item, or edit an existing one. */
export function TaskFormModal({ open, onClose, task, vehicles = [], defaultVehicle }) {
  const { categories, vehicleTypeMap } = useMeta();
  const editing = Boolean(task);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    control,
    formState: { errors },
  } = useForm({ resolver: zodResolver(taskSchema) });

  useEffect(() => {
    if (!open) return;
    reset(
      task
        ? {
            vehicle: task.vehicle?._id || task.vehicle,
            name: task.name,
            category: task.category?._id || task.category,
            description: task.description || '',
            priority: task.priority,
            serviceMode: task.serviceMode,
            intervalKm: task.intervalKm ?? '',
            intervalMonths: task.intervalMonths ?? '',
            nextDueDate: toInputDate(task.nextDueDate),
            nextDueOdometer: task.nextDueOdometer ?? '',
            estimatedCost: task.estimatedCost ?? '',
            notes: task.notes || '',
          }
        : {
            vehicle: defaultVehicle || vehicles[0]?._id || '',
            name: '',
            category: '',
            description: '',
            priority: 'medium',
            serviceMode: 'professional',
            intervalKm: '',
            intervalMonths: '',
            nextDueDate: '',
            nextDueOdometer: '',
            estimatedCost: '',
            notes: '',
          }
    );
  }, [open, task, defaultVehicle, vehicles, reset]);

  const vehicleId = watch('vehicle');
  const vehicle = useMemo(() => vehicles.find((v) => v._id === vehicleId) || task?.vehicle, [vehicles, vehicleId, task]);
  const u = unitLabel(vehicleTypeMap[vehicle?.vehicleType]?.usageUnit);

  const [save, pending] = useAction(
    (values) => {
      const payload = toPayload(values, { nullable: editing ? ['intervalKm', 'intervalMonths', 'nextDueDate', 'nextDueOdometer'] : [] });
      if (editing) {
        delete payload.vehicle;
        // Only send an explicit due point when the user changed it.
        if (toInputDate(task.nextDueDate) === values.nextDueDate) delete payload.nextDueDate;
        if (String(task.nextDueOdometer ?? '') === String(values.nextDueOdometer)) delete payload.nextDueOdometer;
        return maintenanceApi.update(task._id, payload);
      }
      return maintenanceApi.create(payload);
    },
    {
      onSuccess: () => {
        changed();
        onClose();
      },
      onError: (err) => applyServerErrors(err, setError),
    }
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      icon={Wrench}
      title={editing ? 'Edit maintenance item' : 'Add custom maintenance'}
      description={editing ? `${task.name}${task.isCustom ? '' : ' · changes apply to this vehicle only'}` : 'Track anything that isn’t in the standard schedule.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(save)} loading={pending}>
            {editing ? 'Save changes' : 'Add item'}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(save)} noValidate>
        {!editing && (
          <Field label="Vehicle" htmlFor="t-vehicle" required error={errors.vehicle?.message}>
            <Select id="t-vehicle" invalid={!!errors.vehicle} placeholder="Choose a vehicle" {...register('vehicle')}>
              {vehicles.map((v) => (
                <option key={v._id} value={v._id}>
                  {vehicleName(v)} · {v.registrationNumber}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="t-name" required error={errors.name?.message}>
            <Input id="t-name" placeholder="e.g. Ceramic coating refresh" invalid={!!errors.name} {...register('name')} />
          </Field>
          <Field label="Category" htmlFor="t-cat" required error={errors.category?.message}>
            <Select id="t-cat" invalid={!!errors.category} placeholder="Choose a category" {...register('category')}>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Priority">
          <Controller
            control={control}
            name="priority"
            render={({ field }) => (
              <OptionCards columns={4} value={field.value} onChange={field.onChange} options={Object.entries(PRIORITY).map(([value, m]) => ({ value, label: m.label }))} />
            )}
          />
        </Field>
        <div className="rounded-xl border border-line bg-surface-2/60 p-4">
          <p className="text-sm font-semibold text-ink">Recurring interval</p>
          <p className="text-xs text-ink-3">Leave empty for a one-off item. Whichever comes first triggers the next due point.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Every" htmlFor="t-km" error={errors.intervalKm?.message}>
              <Input id="t-km" type="number" inputMode="numeric" suffix={u} placeholder="10000" invalid={!!errors.intervalKm} {...register('intervalKm')} />
            </Field>
            <Field label="Or every" htmlFor="t-mo" error={errors.intervalMonths?.message}>
              <Input id="t-mo" type="number" inputMode="numeric" suffix="months" placeholder="12" invalid={!!errors.intervalMonths} {...register('intervalMonths')} />
            </Field>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Next due date" htmlFor="t-due" error={errors.nextDueDate?.message} hint={editing && task?.nextDueDate ? `Currently ${formatDate(task.nextDueDate)}` : undefined}>
            <DatePicker id="t-due" invalid={!!errors.nextDueDate} {...register('nextDueDate')} />
          </Field>
          <Field label="Next due reading" htmlFor="t-dueodo" error={errors.nextDueOdometer?.message}>
            <Input id="t-dueodo" type="number" inputMode="numeric" suffix={u} invalid={!!errors.nextDueOdometer} {...register('nextDueOdometer')} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Estimated cost" htmlFor="t-cost" error={errors.estimatedCost?.message}>
            <Input id="t-cost" type="number" inputMode="decimal" prefix="₹" invalid={!!errors.estimatedCost} {...register('estimatedCost')} />
          </Field>
          <Field label="Who does it" htmlFor="t-mode">
            <Select id="t-mode" {...register('serviceMode')}>
              {Object.entries(SERVICE_MODE).map(([value, m]) => (
                <option key={value} value={value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Description" htmlFor="t-desc">
          <Textarea id="t-desc" rows={2} {...register('description')} />
        </Field>
        <Field label="Notes" htmlFor="t-notes">
          <Textarea id="t-notes" rows={2} {...register('notes')} />
        </Field>
      </form>
    </Modal>
  );
}

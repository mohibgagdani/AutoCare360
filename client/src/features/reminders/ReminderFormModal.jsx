import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BellRing } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal, Button, Field, Input, Select, Textarea, DatePicker, OptionCards, Switch, Callout } from '@/components/ui';
import { reminderApi } from '@/services';
import { reminderSchema, toPayload } from '@/validations';
import { applyServerErrors, getErrorMessage } from '@/utils/errors';
import { emitChange } from '@/utils/events';
import { REMINDER_TYPES, MANUAL_REMINDER_TYPES, REMINDER_TIMING } from '@/utils/constants';
import { toInputDate } from '@/utils/format';
import { vehicleName } from '@/utils/vehicle';
import { useSelector } from 'react-redux';

const TIMING_OPTIONS = [...REMINDER_TIMING.map((t) => ({ value: String(t.value), label: t.label })), { value: 'custom', label: 'Custom' }];

/** Create/edit a reminder with 7 / 15 / 30 / custom-day notification timing. */
export function ReminderFormModal({ open, onClose, reminder, vehicles = [], defaultVehicle }) {
  const editing = Boolean(reminder);
  const managed = reminder && reminder.source !== 'manual';
  const defaultDays = useSelector((s) => s.auth.user?.preferences?.reminderDaysBefore ?? 15);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(reminderSchema) });

  useEffect(() => {
    if (!open) return;
    const days = reminder?.remindBeforeDays ?? defaultDays;
    const preset = REMINDER_TIMING.some((t) => t.value === days);
    reset({
      title: reminder?.title || '',
      description: reminder?.description || '',
      type: reminder?.type || 'custom',
      vehicle: reminder?.vehicle?._id || reminder?.vehicle || defaultVehicle || '',
      dueDate: toInputDate(reminder?.dueDate),
      timing: preset ? String(days) : 'custom',
      customDays: preset ? '' : days,
      repeat: reminder?.repeat || 'none',
      notifyByEmail: reminder?.notifyByEmail ?? true,
    });
  }, [open, reminder, defaultVehicle, defaultDays, reset]);

  const timing = watch('timing');

  const onSubmit = async (form) => {
    try {
      const { timing: t, customDays, ...rest } = form;
      const payload = toPayload({ ...rest, remindBeforeDays: t === 'custom' ? Number(customDays || 0) : Number(t) }, { nullable: ['vehicle'] });
      if (managed) {
        delete payload.dueDate;
        delete payload.type;
      }
      const res = editing ? await reminderApi.update(reminder._id, payload) : await reminderApi.create(payload);
      toast.success(res.message);
      emitChange('reminders');
      onClose(res.data);
    } catch (error) {
      applyServerErrors(error, setError);
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => onClose()}
      icon={BellRing}
      title={editing ? 'Edit reminder' : 'New reminder'}
      description="We’ll notify you in-app (and by email if enabled) before it’s due."
      footer={
        <>
          <Button variant="secondary" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {editing ? 'Save reminder' : 'Create reminder'}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {managed && (
          <Callout tone="info">
            {reminder.source === 'document' ? 'This reminder follows its document’s expiry date.' : 'This reminder follows the maintenance schedule.'} You can still change the timing and notes.
          </Callout>
        )}
        <Field label="Title" htmlFor="rm-title" required error={errors.title?.message}>
          <Input id="rm-title" placeholder="e.g. Renew driving licence" invalid={!!errors.title} {...register('title')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type" htmlFor="rm-type">
            <Select id="rm-type" className={managed ? 'pointer-events-none bg-surface-2' : undefined} tabIndex={managed ? -1 : undefined} {...register('type')}>
              {(managed ? [reminder.type] : MANUAL_REMINDER_TYPES).map((t) => (
                <option key={t} value={t}>
                  {REMINDER_TYPES[t]?.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Vehicle" htmlFor="rm-vehicle" hint="Optional">
            <Select id="rm-vehicle" placeholder="Not vehicle specific" {...register('vehicle')}>
              {vehicles.map((v) => (
                <option key={v._id} value={v._id}>
                  {vehicleName(v)} · {v.registrationNumber}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Due date" htmlFor="rm-due" required error={errors.dueDate?.message}>
            <DatePicker id="rm-due" readOnly={managed} invalid={!!errors.dueDate} {...register('dueDate')} />
          </Field>
          <Field label="Repeat" htmlFor="rm-repeat">
            <Select id="rm-repeat" {...register('repeat')}>
              <option value="none">Does not repeat</option>
              <option value="monthly">Every month</option>
              <option value="yearly">Every year</option>
            </Select>
          </Field>
        </div>
        <Field label="Remind me">
          <Controller control={control} name="timing" render={({ field }) => <OptionCards columns={4} options={TIMING_OPTIONS} value={field.value} onChange={field.onChange} />} />
        </Field>
        {timing === 'custom' && (
          <Field label="Days before due date" htmlFor="rm-days" error={errors.customDays?.message}>
            <Input id="rm-days" type="number" inputMode="numeric" suffix="days" {...register('customDays')} />
          </Field>
        )}
        <Field label="Notes" htmlFor="rm-desc">
          <Textarea id="rm-desc" rows={2} {...register('description')} />
        </Field>
        <Controller
          control={control}
          name="notifyByEmail"
          render={({ field }) => <Switch checked={field.value} onChange={field.onChange} label="Email me as well" description="Sent when due and when overdue (if email is configured)." />}
        />
      </form>
    </Modal>
  );
}

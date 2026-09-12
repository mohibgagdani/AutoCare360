import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Gauge } from 'lucide-react';
import { Modal, Button, Field, Input, DatePicker } from '@/components/ui';
import { vehicleApi } from '@/services';
import { odometerSchema } from '@/validations';
import { useAction } from '@/hooks/common';
import { applyServerErrors } from '@/utils/errors';
import { emitChange } from '@/utils/events';
import { formatNumber, formatRelative, toInputDate } from '@/utils/format';
import { unitLabel, vehicleName } from '@/utils/vehicle';

/** Quick odometer / hour-meter update — refreshes statuses and health instantly. */
export function OdometerModal({ vehicle, unit = 'km', open, onClose }) {
  const u = unitLabel(unit);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(odometerSchema(vehicle?.odometer || 0)) });

  useEffect(() => {
    if (open && vehicle) reset({ odometer: '', date: toInputDate(new Date()) });
  }, [open, vehicle, reset]);

  const [save, pending] = useAction((values) => vehicleApi.updateOdometer(vehicle._id, values), {
    success: (res) => `Reading updated · health score ${res.data.health?.score ?? ''}`,
    onSuccess: () => {
      emitChange('vehicles', 'maintenance');
      onClose();
    },
    onError: (err) => applyServerErrors(err, setError),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      icon={Gauge}
      title={u === 'hrs' ? 'Update hour meter' : 'Update odometer'}
      description={vehicle ? `${vehicleName(vehicle)} · ${vehicle.registrationNumber}` : ''}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(save)} loading={pending}>
            Save reading
          </Button>
        </>
      }
    >
      {vehicle && (
        <div className="mb-4 rounded-xl bg-surface-2 px-4 py-3">
          <p className="text-xs text-ink-3">Current reading · updated {formatRelative(vehicle.odometerUpdatedAt)}</p>
          <p className="text-xl font-semibold text-ink tabular">
            {formatNumber(vehicle.odometer)} <span className="text-sm font-medium text-ink-3">{u}</span>
          </p>
        </div>
      )}
      <form className="space-y-4" onSubmit={handleSubmit(save)} noValidate>
        <Field label="New reading" htmlFor="odo-new" required error={errors.odometer?.message}>
          <Input id="odo-new" type="number" inputMode="numeric" suffix={u} data-autofocus invalid={!!errors.odometer} {...register('odometer')} />
        </Field>
        <Field label="Reading date" htmlFor="odo-date">
          <DatePicker id="odo-date" max={toInputDate(new Date())} {...register('date')} />
        </Field>
      </form>
    </Modal>
  );
}

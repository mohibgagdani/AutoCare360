import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Wallet, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal, Button, Field, Input, Select, Textarea, DatePicker, Checkbox, FileDropzone, Callout } from '@/components/ui';
import { expenseApi } from '@/services';
import { expenseSchema, toPayload } from '@/validations';
import { useMeta } from '@/hooks/common';
import { applyServerErrors, getErrorMessage } from '@/utils/errors';
import { emitChange } from '@/utils/events';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '@/utils/constants';
import { formatCurrency, toInputDate } from '@/utils/format';
import { unitLabel, vehicleName } from '@/utils/vehicle';
import { cn } from '@/utils/cn';

const ENERGY = ['fuel', 'charging'];

export function ExpenseFormModal({ open, onClose, expense, vehicles = [], defaultVehicle }) {
  const { vehicleTypeMap, fuelTypeMap } = useMeta();
  const editing = Boolean(expense);
  const linked = Boolean(expense?.serviceRecord);
  const [receipt, setReceipt] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(expenseSchema) });

  useEffect(() => {
    if (!open) return;
    setReceipt([]);
    reset(
      expense
        ? {
            vehicle: expense.vehicle?._id || expense.vehicle,
            category: expense.category,
            amount: expense.amount,
            date: toInputDate(expense.date),
            odometer: expense.odometer ?? '',
            description: expense.description || '',
            vendor: expense.vendor || '',
            paymentMethod: expense.paymentMethod || 'upi',
            quantity: expense.fuelDetails?.quantity ?? '',
            pricePerUnit: expense.fuelDetails?.pricePerUnit ?? '',
            fullTank: Boolean(expense.fuelDetails?.fullTank),
            notes: expense.notes || '',
          }
        : {
            vehicle: defaultVehicle || vehicles[0]?._id || '',
            category: 'fuel',
            amount: '',
            date: toInputDate(new Date()),
            odometer: '',
            description: '',
            vendor: '',
            paymentMethod: 'upi',
            quantity: '',
            pricePerUnit: '',
            fullTank: true,
            notes: '',
          }
    );
  }, [open, expense, defaultVehicle, vehicles, reset]);

  const [vehicleId, category, quantity, price] = watch(['vehicle', 'category', 'quantity', 'pricePerUnit']);
  const vehicle = vehicles.find((v) => v._id === vehicleId) || expense?.vehicle;
  const isEv = fuelTypeMap[vehicle?.fuelType]?.powertrain === 'ev';
  const energyUnit = category === 'charging' ? 'kWh' : vehicle?.fuelType === 'cng' || vehicle?.secondaryFuelType === 'cng' ? 'kg' : 'L';
  const computed = quantity && price ? Math.round(Number(quantity) * Number(price) * 100) / 100 : null;
  const u = unitLabel(vehicleTypeMap[vehicle?.vehicleType]?.usageUnit);

  // Suggest the right energy category for the chosen vehicle.
  useEffect(() => {
    if (editing || !vehicle) return;
    if (isEv && category === 'fuel') setValue('category', 'charging');
    if (!isEv && category === 'charging') setValue('category', 'fuel');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId]);

  const onSubmit = async (form) => {
    setSubmitting(true);
    try {
      const { quantity: q, pricePerUnit: p, fullTank, ...rest } = form;
      const payload = toPayload(rest, { nullable: editing ? ['odometer'] : [] });
      if (ENERGY.includes(form.category) && (q || p)) {
        payload.fuelDetails = toPayload({ quantity: q, pricePerUnit: p, unit: form.category === 'charging' ? 'kWh' : energyUnit, fullTank });
      }
      if ((payload.amount === undefined || payload.amount === null) && computed) payload.amount = computed;
      if (linked) {
        delete payload.amount;
        delete payload.category;
      }
      const res = editing ? await expenseApi.update(expense._id, payload, receipt[0]) : await expenseApi.create(payload, receipt[0]);
      toast.success(res.message);
      emitChange('expenses', 'vehicles');
      onClose(res.data);
    } catch (error) {
      applyServerErrors(error, setError);
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => onClose()}
      size="lg"
      icon={Wallet}
      title={editing ? 'Edit expense' : 'Add expense'}
      description={vehicle ? `${vehicleName(vehicle)} · ${vehicle.registrationNumber}` : 'Track every cost of ownership'}
      footer={
        <>
          <Button variant="secondary" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={submitting}>
            {editing ? 'Save changes' : 'Add expense'}
          </Button>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        {linked && (
          <Callout tone="info" icon={Info}>
            This expense was created from a service record. Change the amount by editing the service record.
          </Callout>
        )}
        {!editing && (
          <Field label="Vehicle" htmlFor="ex-vehicle" required error={errors.vehicle?.message}>
            <Select id="ex-vehicle" invalid={!!errors.vehicle} placeholder="Choose a vehicle" {...register('vehicle')}>
              {vehicles.map((v) => (
                <option key={v._id} value={v._id}>
                  {vehicleName(v)} · {v.registrationNumber}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Category" required error={errors.category?.message}>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <div role="radiogroup" aria-label="Category" className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {Object.entries(EXPENSE_CATEGORIES).map(([value, meta]) => {
                  const Icon = meta.icon;
                  const active = field.value === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={linked}
                      onClick={() => field.onChange(value)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition disabled:opacity-50',
                        active ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300' : 'border-line text-ink-2 hover:bg-surface-2'
                      )}
                    >
                      <Icon size={17} aria-hidden />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            )}
          />
        </Field>

        {ENERGY.includes(category) && !linked && (
          <div className="rounded-2xl border border-line bg-surface-2/60 p-4">
            <p className="text-sm font-semibold text-ink">{category === 'charging' ? 'Charging session' : 'Fill-up details'}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label="Quantity" htmlFor="ex-qty" error={errors.quantity?.message}>
                <Input id="ex-qty" type="number" inputMode="decimal" suffix={energyUnit} {...register('quantity')} />
              </Field>
              <Field label={`Price per ${energyUnit}`} htmlFor="ex-ppu" error={errors.pricePerUnit?.message}>
                <Input id="ex-ppu" type="number" inputMode="decimal" prefix="₹" {...register('pricePerUnit')} />
              </Field>
              <div className="flex items-end pb-2">
                <Checkbox label={category === 'charging' ? 'Charged to 100%' : 'Full tank'} {...register('fullTank')} />
              </div>
            </div>
            {computed !== null && <p className="mt-2 text-xs text-ink-3">Calculated amount: {formatCurrency(computed)}</p>}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Amount" htmlFor="ex-amount" required={!computed} error={errors.amount?.message}>
            <Input id="ex-amount" type="number" inputMode="decimal" prefix="₹" placeholder={computed ? String(computed) : ''} readOnly={linked} invalid={!!errors.amount} {...register('amount')} />
          </Field>
          <Field label="Date" htmlFor="ex-date" required error={errors.date?.message}>
            <DatePicker id="ex-date" max={toInputDate(new Date())} invalid={!!errors.date} {...register('date')} />
          </Field>
          <Field label="Odometer" htmlFor="ex-odo" error={errors.odometer?.message} hint="Optional — keeps usage accurate">
            <Input id="ex-odo" type="number" inputMode="numeric" suffix={u} {...register('odometer')} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Description" htmlFor="ex-desc">
            <Input id="ex-desc" placeholder={category === 'toll' ? 'e.g. Mumbai–Pune Expressway' : 'Short description'} {...register('description')} />
          </Field>
          <Field label="Vendor" htmlFor="ex-vendor">
            <Input id="ex-vendor" placeholder="Fuel station, shop, insurer…" {...register('vendor')} />
          </Field>
          <Field label="Payment method" htmlFor="ex-pay">
            <Select id="ex-pay" {...register('paymentMethod')}>
              {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Receipt" hint={expense?.receipt ? 'Uploading replaces the current receipt' : undefined}>
            <FileDropzone kind="document" files={receipt} onChange={setReceipt} compact />
          </Field>
        </div>
        <Field label="Notes" htmlFor="ex-notes">
          <Textarea id="ex-notes" rows={2} {...register('notes')} />
        </Field>
      </form>
    </Modal>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Car, ClipboardList, Gauge, Eye, Info, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  PageHeader,
  Card,
  Button,
  Field,
  Input,
  Select,
  Textarea,
  DatePicker,
  FileDropzone,
  Callout,
  Skeleton,
  ErrorState,
  InfoItem,
} from '@/components/ui';
import { VehicleArt } from '@/components/vehicles/VehicleArt';
import { artTint, RegPlate } from '@/components/vehicles/VehicleVisual';
import { ChecklistPreview } from '@/features/vehicles/ChecklistPreview';
import { vehicleApi } from '@/services';
import { vehicleSchema, toPayload } from '@/validations';
import { useDocumentTitle, useMeta } from '@/hooks/common';
import { useOverlayMotion } from '@/hooks/useMotion';
import { applyServerErrors, getErrorMessage } from '@/utils/errors';
import { emitChange } from '@/utils/events';
import { TRANSMISSIONS, VEHICLE_COLORS, VEHICLE_GROUPS } from '@/utils/constants';
import { formatCurrency, formatDate, formatNumber, toInputDate } from '@/utils/format';
import { fileUrl } from '@/utils/files';
import { cn } from '@/utils/cn';

const STEPS = [
  { id: 'type', label: 'Type & fuel', icon: Car, fields: ['vehicleType', 'fuelType', 'secondaryFuelType', 'transmission'] },
  { id: 'details', label: 'Details', icon: ClipboardList, fields: ['make', 'model', 'variant', 'nickname', 'year', 'registrationNumber', 'vin', 'engineNumber', 'color'] },
  { id: 'usage', label: 'Usage & history', icon: Gauge, fields: ['odometer', 'purchaseDate', 'purchasePrice', 'purchaseOdometer', 'lastServiceDate', 'lastServiceOdometer', 'notes'] },
  { id: 'review', label: 'Review', icon: Eye, fields: [] },
];

const DEFAULTS = {
  vehicleType: '',
  make: '',
  model: '',
  variant: '',
  nickname: '',
  year: '',
  registrationNumber: '',
  vin: '',
  engineNumber: '',
  fuelType: '',
  secondaryFuelType: '',
  transmission: 'manual',
  purchaseDate: '',
  purchasePrice: '',
  purchaseOdometer: '',
  odometer: '',
  color: '#2563eb',
  notes: '',
  lastServiceDate: '',
  lastServiceOdometer: '',
};

const BIFUEL = ['cng', 'lpg'];

function StepIndicator({ step, onStep, maxReached }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {STEPS.map((s, i) => {
        const done = i < step;
        const active = i === step;
        const reachable = i <= maxReached;
        return (
          <li key={s.id} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => onStep(i)}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'flex min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 text-left transition',
                reachable && !active && 'hover:bg-surface-3'
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-1 transition',
                  done && 'bg-brand-600 text-white ring-brand-600',
                  active && 'bg-brand-50 text-brand-700 ring-brand-500 dark:bg-brand-500/15 dark:text-brand-300',
                  !done && !active && 'bg-surface text-ink-3 ring-line-strong'
                )}
              >
                {done ? <Check size={15} strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn('hidden truncate text-sm font-medium md:block', active ? 'text-ink' : 'text-ink-3')}>{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <span className={cn('h-px flex-1', done ? 'bg-brand-500' : 'bg-line')} aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

export default function VehicleFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  useDocumentTitle(editing ? 'Edit vehicle' : 'Add vehicle');
  const navigate = useNavigate();
  const { vehicleTypes, fuelTypes, vehicleTypeMap, fuelTypeMap, ready } = useMeta();
  const [step, setStep] = useState(editing ? 1 : 0);
  const [maxReached, setMaxReached] = useState(editing ? STEPS.length - 1 : 0);
  const [image, setImage] = useState([]);
  const [existing, setExisting] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const stepMotion = useOverlayMotion({ opacity: 0, x: 16 }, { opacity: 0, x: -16 });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    reset,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(vehicleSchema), defaultValues: DEFAULTS, mode: 'onTouched' });

  useEffect(() => {
    if (!editing) return;
    vehicleApi
      .get(id)
      .then((res) => {
        const v = res.data;
        setExisting(v);
        reset({
          ...DEFAULTS,
          ...Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, v[k] ?? DEFAULTS[k]])),
          year: v.year ?? '',
          secondaryFuelType: v.secondaryFuelType || '',
          purchaseDate: toInputDate(v.purchaseDate),
          lastServiceDate: toInputDate(v.lastServiceDate),
          purchasePrice: v.purchasePrice ?? '',
          purchaseOdometer: v.purchaseOdometer ?? '',
          lastServiceOdometer: v.lastServiceOdometer ?? '',
        });
      })
      .catch(setLoadError);
  }, [editing, id, reset]);

  const values = watch();
  const type = vehicleTypeMap[values.vehicleType];
  const unit = type?.usageUnit || 'km';
  const u = unit === 'hours' ? 'hrs' : 'km';

  const spec = {
    vehicleType: values.vehicleType,
    fuelType: values.fuelType,
    secondaryFuelType: values.secondaryFuelType || null,
    transmission: values.transmission,
    make: values.make,
    model: values.model,
  };
  const uploadedPreview = useMemo(() => (image[0] ? URL.createObjectURL(image[0]) : null), [image]);
  useEffect(() => () => uploadedPreview && URL.revokeObjectURL(uploadedPreview), [uploadedPreview]);
  const previewImage = uploadedPreview || (existing?.image?.url ? fileUrl(existing.image.url) : null);

  const allowedFuels = useMemo(() => {
    if (!type?.allowedFuelTypes?.length) return fuelTypes;
    return fuelTypes.filter((f) => type.allowedFuelTypes.includes(f.code));
  }, [type, fuelTypes]);

  // Keep fuel & transmission consistent with the chosen type.
  useEffect(() => {
    if (!type) return;
    if (values.fuelType && !allowedFuels.some((f) => f.code === values.fuelType)) setValue('fuelType', '');
    if (type.allowedFuelTypes?.length === 1 && !values.fuelType) setValue('fuelType', type.allowedFuelTypes[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type?.code]);

  useEffect(() => {
    if (!fuelTypeMap[values.fuelType]) return; // catalog not loaded yet, or no fuel chosen
    const powertrain = fuelTypeMap[values.fuelType].powertrain;
    if (powertrain === 'ev' && values.transmission !== 'single_speed') setValue('transmission', 'single_speed');
    if (powertrain !== 'ev' && values.transmission === 'single_speed') setValue('transmission', 'manual');
    if (!['petrol'].includes(values.fuelType) && values.secondaryFuelType) setValue('secondaryFuelType', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.fuelType, fuelTypeMap]);

  const goTo = async (target) => {
    if (target > step) {
      const ok = await trigger(STEPS[step].fields);
      if (!ok) return;
    }
    setStep(target);
    setMaxReached((m) => Math.max(m, target));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async (form) => {
    setSubmitting(true);
    try {
      const payload = toPayload(
        { ...form, registrationNumber: form.registrationNumber.toUpperCase() },
        { nullable: editing ? ['year', 'purchaseDate', 'purchasePrice', 'purchaseOdometer', 'lastServiceDate', 'lastServiceOdometer', 'secondaryFuelType'] : [] }
      );
      if (editing) {
        // Service history owns lastService* once records exist — only send if changed.
        if (toInputDate(existing?.lastServiceDate) === form.lastServiceDate) {
          delete payload.lastServiceDate;
          delete payload.lastServiceOdometer;
        }
        const res = await vehicleApi.update(id, payload, image[0]);
        toast.success(res.message);
        emitChange('vehicles', 'maintenance');
        navigate(`/app/vehicles/${id}`);
      } else {
        const res = await vehicleApi.create(payload, image[0]);
        toast.success(res.message);
        emitChange('vehicles', 'maintenance');
        navigate(`/app/vehicles/${res.data.vehicle._id}`);
      }
    } catch (error) {
      const applied = applyServerErrors(error, setError);
      toast.error(getErrorMessage(error));
      if (applied) {
        const fieldStep = STEPS.findIndex((s) => s.fields.some((f) => error.response?.data?.errors?.some((e) => e.field === f)));
        if (fieldStep >= 0) setStep(fieldStep);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <Card>
        <ErrorState error={loadError} onRetry={() => window.location.reload()} />
      </Card>
    );
  }
  if (!ready || (editing && !existing)) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Skeleton className="h-[520px] rounded-2xl" />
        <Skeleton className="h-[420px] rounded-2xl" />
      </div>
    );
  }

  const scheduleFieldsChanged =
    editing && existing && ['vehicleType', 'fuelType', 'secondaryFuelType', 'transmission', 'make', 'model'].some((k) => String(values[k] || '') !== String(existing[k] || ''));


  return (
    <>
      <PageHeader
        back={{ to: editing ? `/app/vehicles/${id}` : '/app/vehicles', label: editing ? 'Back to vehicle' : 'Vehicles' }}
        title={editing ? `Edit ${existing.nickname || `${existing.make} ${existing.model}`}` : 'Add a vehicle'}
        description={editing ? 'Update details — the maintenance schedule re-syncs automatically when the type, fuel or model changes.' : 'Tell us about your vehicle and we’ll build a maintenance schedule tailored to it.'}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <div className="border-b border-line px-4 py-3 sm:px-6">
            <StepIndicator step={step} onStep={goTo} maxReached={maxReached} />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="p-5 sm:p-6">
              <AnimatePresence mode="wait">
                <motion.div key={step} {...stepMotion} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.18 }}>
                  {step === 0 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-base font-semibold text-ink">What kind of vehicle is it?</h2>
                        <p className="text-sm text-ink-3">The type decides which maintenance items apply.</p>
                        <Controller
                          control={control}
                          name="vehicleType"
                          render={({ field }) => (
                            <div role="radiogroup" aria-label="Vehicle type" className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                              {vehicleTypes.map((t) => {
                                const active = field.value === t.code;
                                return (
                                  <button
                                    key={t.code}
                                    type="button"
                                    role="radio"
                                    aria-checked={active}
                                    onClick={() => field.onChange(t.code)}
                                    className={cn(
                                      'group flex flex-col items-center rounded-2xl border p-3 text-center transition',
                                      active
                                        ? 'border-brand-500 bg-brand-50/70 ring-4 ring-brand-500/10 dark:bg-brand-500/10'
                                        : 'border-line hover:border-line-strong hover:bg-surface-2'
                                    )}
                                  >
                                    <div className="w-full max-w-[120px] px-1">
                                      <VehicleArt illustration={t.illustration} color={active ? values.color : '#94a3b8'} ground={false} />
                                    </div>
                                    <span className={cn('mt-1.5 text-[13px] font-medium', active ? 'text-brand-700 dark:text-brand-300' : 'text-ink')}>{t.name}</span>
                                    <span className="text-[11px] text-ink-3">{VEHICLE_GROUPS[t.group]}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        />
                        {errors.vehicleType && <p className="mt-2 text-xs font-medium text-red-600">{errors.vehicleType.message}</p>}
                      </div>

                      <div>
                        <h2 className="text-base font-semibold text-ink">Fuel / powertrain</h2>
                        <Controller
                          control={control}
                          name="fuelType"
                          render={({ field }) => (
                            <div role="radiogroup" aria-label="Fuel type" className="mt-3 flex flex-wrap gap-2">
                              {allowedFuels.map((f) => {
                                const active = field.value === f.code;
                                return (
                                  <button
                                    key={f.code}
                                    type="button"
                                    role="radio"
                                    aria-checked={active}
                                    onClick={() => field.onChange(f.code)}
                                    className={cn(
                                      'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition',
                                      active
                                        ? 'border-brand-500 bg-brand-600 text-white shadow-sm dark:bg-brand-500'
                                        : 'border-line-strong text-ink-2 hover:border-brand-400 hover:text-ink'
                                    )}
                                  >
                                    {f.powertrain === 'ev' && <Zap size={13} aria-hidden />}
                                    {f.name}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        />
                        {errors.fuelType && <p className="mt-2 text-xs font-medium text-red-600">{errors.fuelType.message}</p>}
                        {fuelTypeMap[values.fuelType]?.powertrain === 'ev' && (
                          <Callout tone="success" icon={Zap} className="mt-3">
                            Electric vehicles get an EV-specific plan — battery health, cooling, charging & firmware — with no oil changes or spark plugs.
                          </Callout>
                        )}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Transmission" htmlFor="transmission" hint="Determines gearbox fluid items (MT / AT / CVT / DCT).">
                          <Select id="transmission" {...register('transmission')}>
                            {Object.entries(TRANSMISSIONS).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </Select>
                        </Field>
                        {values.fuelType === 'petrol' && (
                          <Field label="Secondary fuel (bi-fuel)" htmlFor="secondaryFuelType" hint="Factory or retro-fitted CNG / LPG kit">
                            <Select id="secondaryFuelType" placeholder="None" {...register('secondaryFuelType')}>
                              {fuelTypes
                                .filter((f) => BIFUEL.includes(f.code))
                                .map((f) => (
                                  <option key={f.code} value={f.code}>
                                    {f.name}
                                  </option>
                                ))}
                            </Select>
                          </Field>
                        )}
                      </div>
                    </div>
                  )}

                  {step === 1 && (
                    <div className="space-y-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Make / manufacturer" htmlFor="make" required error={errors.make?.message}>
                          <Input id="make" placeholder="e.g. Toyota" invalid={!!errors.make} {...register('make')} />
                        </Field>
                        <Field label="Model" htmlFor="model" required error={errors.model?.message}>
                          <Input id="model" placeholder="e.g. Glanza" invalid={!!errors.model} {...register('model')} />
                        </Field>
                        <Field label="Variant" htmlFor="variant" error={errors.variant?.message}>
                          <Input id="variant" placeholder="e.g. G CNG" {...register('variant')} />
                        </Field>
                        <Field label="Manufacturing year" htmlFor="year" error={errors.year?.message}>
                          <Input id="year" type="number" inputMode="numeric" placeholder={String(new Date().getFullYear())} invalid={!!errors.year} {...register('year')} />
                        </Field>
                        <Field label="Registration number" htmlFor="registrationNumber" required error={errors.registrationNumber?.message}>
                          <Input id="registrationNumber" placeholder="MH 12 AB 1234" className="uppercase" invalid={!!errors.registrationNumber} {...register('registrationNumber')} />
                        </Field>
                        <Field label="Nickname" htmlFor="nickname" hint="Optional — e.g. “Family car”">
                          <Input id="nickname" {...register('nickname')} />
                        </Field>
                        <Field label="VIN / chassis number" htmlFor="vin" error={errors.vin?.message}>
                          <Input id="vin" className="uppercase" {...register('vin')} />
                        </Field>
                        <Field label="Engine / motor number" htmlFor="engineNumber" error={errors.engineNumber?.message}>
                          <Input id="engineNumber" className="uppercase" {...register('engineNumber')} />
                        </Field>
                      </div>
                      <Field label="Colour" hint="Used for your vehicle’s illustration and cards.">
                        <Controller
                          control={control}
                          name="color"
                          render={({ field }) => (
                            <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Colour">
                              {VEHICLE_COLORS.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  role="radio"
                                  aria-checked={field.value === c}
                                  aria-label={c}
                                  onClick={() => field.onChange(c)}
                                  className={cn(
                                    'h-8 w-8 rounded-full ring-1 ring-black/10 transition hover:scale-110 dark:ring-white/20',
                                    field.value === c && 'ring-2 ring-brand-500 ring-offset-2 ring-offset-surface'
                                  )}
                                  style={{ background: c }}
                                />
                              ))}
                              <label className="relative ml-1 flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong px-3 text-xs font-medium text-ink-2">
                                Custom
                                <input type="color" value={field.value} onChange={(e) => field.onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
                              </label>
                            </div>
                          )}
                        />
                      </Field>
                      <Field label="Vehicle photo" hint="Optional — otherwise we show an illustration.">
                        <FileDropzone kind="image" files={image} onChange={setImage} maxSizeMb={5} compact />
                      </Field>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-6">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={unit === 'hours' ? 'Current hour-meter reading' : 'Current odometer'} htmlFor="odometer" required error={errors.odometer?.message}>
                          <Input id="odometer" type="number" inputMode="numeric" suffix={u} invalid={!!errors.odometer} {...register('odometer')} />
                        </Field>
                        <Field label="Purchase date" htmlFor="purchaseDate" error={errors.purchaseDate?.message}>
                          <DatePicker id="purchaseDate" max={toInputDate(new Date())} invalid={!!errors.purchaseDate} {...register('purchaseDate')} />
                        </Field>
                        <Field label="Purchase price" htmlFor="purchasePrice" error={errors.purchasePrice?.message}>
                          <Input id="purchasePrice" type="number" inputMode="decimal" prefix="₹" invalid={!!errors.purchasePrice} {...register('purchasePrice')} />
                        </Field>
                        <Field label={`Reading at purchase`} htmlFor="purchaseOdometer" hint="0 for a new vehicle" error={errors.purchaseOdometer?.message}>
                          <Input id="purchaseOdometer" type="number" inputMode="numeric" suffix={u} invalid={!!errors.purchaseOdometer} {...register('purchaseOdometer')} />
                        </Field>
                      </div>

                      <div className="rounded-2xl border border-line bg-surface-2/60 p-4 sm:p-5">
                        <div className="flex items-start gap-3">
                          <Info size={18} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
                          <div>
                            <p className="text-sm font-semibold text-ink">Last general service</p>
                            <p className="text-xs text-ink-3">
                              The schedule starts from here. Without it, tracking starts today (or from the purchase date for vehicles bought in the last 6 months). Log past services any time to refine it.
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <Field label="Last service date" htmlFor="lastServiceDate" error={errors.lastServiceDate?.message}>
                            <DatePicker id="lastServiceDate" max={toInputDate(new Date())} invalid={!!errors.lastServiceDate} {...register('lastServiceDate')} />
                          </Field>
                          <Field label="Reading at last service" htmlFor="lastServiceOdometer" error={errors.lastServiceOdometer?.message}>
                            <Input id="lastServiceOdometer" type="number" inputMode="numeric" suffix={u} invalid={!!errors.lastServiceOdometer} {...register('lastServiceOdometer')} />
                          </Field>
                        </div>
                      </div>

                      <Field label="Notes" htmlFor="notes">
                        <Textarea id="notes" rows={3} placeholder="Anything worth remembering — tyre brand, preferred workshop, modifications…" {...register('notes')} />
                      </Field>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-5">
                      <div className="flex flex-col items-center gap-4 rounded-2xl p-5 text-center sm:flex-row sm:text-left vehicle-art-bg" style={artTint(values.color)}>
                        <div className="w-44 shrink-0">
                          {previewImage ? (
                            <img src={previewImage} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
                          ) : (
                            <VehicleArt illustration={type?.illustration} color={values.color} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-wide text-ink-2">{type?.name}</p>
                          <h3 className="text-xl font-semibold text-ink">
                            {values.nickname || `${values.make} ${values.model}`}
                          </h3>
                          <p className="text-sm text-ink-2">
                            {values.make} {values.model} {values.variant} {values.year && `· ${values.year}`}
                          </p>
                          <RegPlate number={(values.registrationNumber || '').toUpperCase()} fuelType={values.fuelType} group={type?.group} size="lg" className="mt-2" />
                        </div>
                      </div>
                      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                        <InfoItem label="Fuel" value={[fuelTypeMap[values.fuelType]?.name, fuelTypeMap[values.secondaryFuelType]?.name].filter(Boolean).join(' + ')} />
                        <InfoItem label="Transmission" value={TRANSMISSIONS[values.transmission]} />
                        <InfoItem label="Current reading" value={values.odometer !== '' ? `${formatNumber(values.odometer)} ${u}` : '—'} />
                        <InfoItem label="Purchased" value={values.purchaseDate ? formatDate(values.purchaseDate) : '—'} />
                        <InfoItem label="Purchase price" value={values.purchasePrice ? formatCurrency(values.purchasePrice) : '—'} />
                        <InfoItem label="Last service" value={values.lastServiceDate ? `${formatDate(values.lastServiceDate)}${values.lastServiceOdometer !== '' ? ` · ${formatNumber(values.lastServiceOdometer)} ${u}` : ''}` : 'Not provided'} />
                      </dl>
                      {scheduleFieldsChanged && (
                        <Callout tone="warning" icon={Info}>
                          You changed the type, fuel, transmission or model. Saving re-syncs the maintenance schedule — history is kept.
                        </Callout>
                      )}
                      <div className="lg:hidden">
                        <ChecklistPreview spec={spec} unit={unit} compact />
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line bg-surface-2/50 px-5 py-4 sm:px-6">
              <Button variant="ghost" leftIcon={ChevronLeft} onClick={() => (step === 0 ? navigate(-1) : goTo(step - 1))}>
                {step === 0 ? 'Cancel' : 'Back'}
              </Button>
              <div className="flex gap-2">
                {editing && step < 3 && (
                  <Button variant="secondary" type="submit" loading={submitting}>
                    Save changes
                  </Button>
                )}
                {step < 3 ? (
                  <Button rightIcon={ChevronRight} onClick={() => goTo(step + 1)}>
                    Continue
                  </Button>
                ) : (
                  <Button type="submit" loading={submitting} leftIcon={Check}>
                    {editing ? 'Save changes' : 'Add vehicle & build schedule'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Card>

        <aside className="hidden space-y-4 lg:sticky lg:top-24 lg:block">
          <Card className="overflow-hidden">
            <div className="vehicle-art-bg px-8 pb-3 pt-6" style={artTint(values.color)}>
              {previewImage ? <img src={previewImage} alt="" className="aspect-[16/9] w-full rounded-xl object-cover" /> : <VehicleArt illustration={type?.illustration || 'sedan'} color={values.color} />}
            </div>
            <div className="p-4">
              <p className="truncate text-base font-semibold text-ink">{values.nickname || [values.make, values.model].filter(Boolean).join(' ') || 'Your vehicle'}</p>
              <p className="text-sm text-ink-3">
                {[type?.name, fuelTypeMap[values.fuelType]?.name, TRANSMISSIONS[values.transmission]].filter(Boolean).join(' · ') || 'Choose a type to begin'}
              </p>
            </div>
          </Card>
          <Card className="p-4">
            <ChecklistPreview spec={spec} unit={unit} />
          </Card>
        </aside>
      </div>
    </>
  );
}

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { UserPlus, UserCog, ListChecks, Layers, Truck, Fuel } from 'lucide-react';
import { Modal, Button, Field, Input, Select, Textarea, Switch, Callout } from '@/components/ui';
import { VehicleArt } from '@/components/vehicles/VehicleArt';
import { adminApi } from '@/services';
import { useMeta } from '@/hooks/common';
import { fetchMeta } from '@/store/metaSlice';
import { useDispatch } from 'react-redux';
import { passwordRule, emailRule } from '@/validations';
import { applyServerErrors, getErrorMessage } from '@/utils/errors';
import { emitChange } from '@/utils/events';
import { PRIORITY, SERVICE_MODE, POWERTRAINS, TRANSMISSIONS, VEHICLE_GROUPS, VEHICLE_ILLUSTRATIONS, CATEGORY_ICONS } from '@/utils/constants';
import { cn } from '@/utils/cn';

/** Toggleable chips for multi-select arrays. */
export function ChipSelect({ options, value = [], onChange, className }) {
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {options.map((o) => {
        const active = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(o.value)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-medium transition',
              active ? 'border-brand-500 bg-brand-600 text-white dark:bg-brand-500' : 'border-line-strong text-ink-2 hover:border-brand-400 hover:text-ink'
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const csv = (s) =>
  String(s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

const optionalNum = z.union([z.literal(''), z.coerce.number().min(0)]).optional();

// ─── Users ───────────────────────────────────────────────────────────────────
export function UserFormModal({ open, onClose, user }) {
  const editing = Boolean(user);
  const schema = z.object({
    name: z.string().trim().min(2, 'Enter a name'),
    email: emailRule,
    phone: z.string().optional(),
    role: z.enum(['user', 'admin']),
    password: editing ? z.union([z.literal(''), passwordRule]).optional() : passwordRule,
    isActive: z.boolean(),
  });
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) reset({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', role: user?.role || 'user', password: '', isActive: user?.isActive ?? true });
  }, [open, user, reset]);

  const onSubmit = async (form) => {
    try {
      const { password, isActive, ...rest } = form;
      const payload = { ...rest, ...(password ? { password } : {}) };
      const res = editing ? await adminApi.users.update(user._id, payload) : await adminApi.users.create({ ...payload, isActive });
      toast.success(res.message);
      emitChange('admin-users');
      onClose(true);
    } catch (e) {
      applyServerErrors(e, setError);
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => onClose()}
      icon={editing ? UserCog : UserPlus}
      title={editing ? 'Edit user' : 'Create user'}
      footer={
        <>
          <Button variant="secondary" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {editing ? 'Save user' : 'Create user'}
          </Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field label="Name" htmlFor="u-name" required error={errors.name?.message}>
          <Input id="u-name" invalid={!!errors.name} {...register('name')} />
        </Field>
        <Field label="Email" htmlFor="u-email" required error={errors.email?.message}>
          <Input id="u-email" type="email" invalid={!!errors.email} {...register('email')} />
        </Field>
        <Field label="Phone" htmlFor="u-phone">
          <Input id="u-phone" {...register('phone')} />
        </Field>
        <Field label="Role" htmlFor="u-role">
          <Select id="u-role" {...register('role')}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
        <Field label={editing ? 'New password (optional)' : 'Password'} htmlFor="u-pass" required={!editing} error={errors.password?.message} className="sm:col-span-2" hint="8+ characters, upper & lower case and a number">
          <Input id="u-pass" type="password" autoComplete="new-password" invalid={!!errors.password} {...register('password')} />
        </Field>
        {!editing && (
          <div className="sm:col-span-2">
            <Controller control={control} name="isActive" render={({ field }) => <Switch checked={field.value} onChange={field.onChange} label="Active" description="Blocked users cannot sign in." />} />
          </div>
        )}
      </form>
    </Modal>
  );
}

// ─── Maintenance templates ───────────────────────────────────────────────────
const templateSchema = z
  .object({
    code: z.string().trim().min(1, 'Code is required').regex(/^[A-Za-z0-9_]+$/, 'Letters, numbers and underscores'),
    name: z.string().trim().min(1, 'Name is required'),
    description: z.string().optional(),
    category: z.string().min(1, 'Choose a category'),
    vehicleTypes: z.array(z.string()),
    vehicleGroups: z.array(z.string()),
    fuelTypes: z.array(z.string()),
    powertrains: z.array(z.string()),
    transmissions: z.array(z.string()),
    makes: z.string().optional(),
    excludeMakes: z.string().optional(),
    models: z.string().optional(),
    intervalKm: optionalNum,
    intervalMonths: optionalNum,
    priority: z.string(),
    serviceMode: z.string(),
    estimatedCost: optionalNum,
    estimatedDurationMinutes: optionalNum,
    notes: z.string().optional(),
    isRecurring: z.boolean(),
    isActive: z.boolean(),
  })
  .refine((d) => d.intervalKm || d.intervalMonths, { path: ['intervalKm'], message: 'Provide a distance and/or time interval' })
  .refine((d) => d.vehicleTypes.length || d.vehicleGroups.length, { path: ['vehicleTypes'], message: 'Select at least one vehicle type or group' });

export function TemplateFormModal({ open, onClose, template }) {
  const { categories, vehicleTypes, fuelTypes } = useMeta();
  const editing = Boolean(template);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(templateSchema) });

  useEffect(() => {
    if (!open) return;
    const t = template || {};
    reset({
      code: t.code || '',
      name: t.name || '',
      description: t.description || '',
      category: t.category?._id || t.category || '',
      vehicleTypes: t.vehicleTypes || [],
      vehicleGroups: t.vehicleGroups || [],
      fuelTypes: t.fuelTypes || [],
      powertrains: t.powertrains || [],
      transmissions: t.transmissions || [],
      makes: (t.makes || []).join(', '),
      excludeMakes: (t.excludeMakes || []).join(', '),
      models: (t.models || []).join(', '),
      intervalKm: t.intervalKm ?? '',
      intervalMonths: t.intervalMonths ?? '',
      priority: t.priority || 'medium',
      serviceMode: t.serviceMode || 'professional',
      estimatedCost: t.estimatedCost ?? '',
      estimatedDurationMinutes: t.estimatedDurationMinutes ?? '',
      notes: t.notes || '',
      isRecurring: t.isRecurring ?? true,
      isActive: t.isActive ?? true,
    });
  }, [open, template, reset]);

  const onSubmit = async (form) => {
    try {
      const payload = {
        ...form,
        code: form.code.toUpperCase(),
        makes: csv(form.makes),
        excludeMakes: csv(form.excludeMakes),
        models: csv(form.models),
        intervalKm: form.intervalKm === '' ? null : Number(form.intervalKm),
        intervalMonths: form.intervalMonths === '' ? null : Number(form.intervalMonths),
        estimatedCost: form.estimatedCost === '' ? 0 : Number(form.estimatedCost),
        estimatedDurationMinutes: form.estimatedDurationMinutes === '' ? 0 : Number(form.estimatedDurationMinutes),
      };
      const res = editing ? await adminApi.templates.update(template._id, payload) : await adminApi.templates.create(payload);
      toast.success(res.message);
      emitChange('admin-templates');
      onClose(res.data);
    } catch (e) {
      applyServerErrors(e, setError);
      toast.error(getErrorMessage(e));
    }
  };

  const chips = (name, options) => <Controller control={control} name={name} render={({ field }) => <ChipSelect options={options} value={field.value} onChange={field.onChange} />} />;

  return (
    <Modal
      open={open}
      onClose={() => onClose()}
      size="xl"
      icon={ListChecks}
      title={editing ? 'Edit maintenance template' : 'New maintenance template'}
      description="Templates decide which maintenance items each vehicle receives. Same code = override (most specific wins)."
      footer={
        <>
          <Button variant="secondary" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {editing ? 'Save template' : 'Create template'}
          </Button>
        </>
      }
    >
      <form className="grid gap-6 lg:grid-cols-2" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code" htmlFor="tp-code" required error={errors.code?.message} hint="e.g. ENGINE_OIL">
              <Input id="tp-code" className="font-mono uppercase" invalid={!!errors.code} {...register('code')} />
            </Field>
            <Field label="Category" htmlFor="tp-cat" required error={errors.category?.message}>
              <Select id="tp-cat" placeholder="Choose…" invalid={!!errors.category} {...register('category')}>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Name" htmlFor="tp-name" required error={errors.name?.message}>
            <Input id="tp-name" invalid={!!errors.name} {...register('name')} />
          </Field>
          <Field label="Description" htmlFor="tp-desc">
            <Textarea id="tp-desc" rows={2} {...register('description')} />
          </Field>
          <div className="rounded-2xl border border-line bg-surface-2/60 p-4">
            <p className="text-sm font-semibold text-ink">Interval — whichever comes first</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Distance / hours" htmlFor="tp-km" error={errors.intervalKm?.message}>
                <Input id="tp-km" type="number" suffix="km/hrs" {...register('intervalKm')} />
              </Field>
              <Field label="Time" htmlFor="tp-mo" error={errors.intervalMonths?.message}>
                <Input id="tp-mo" type="number" step="1" suffix="months" invalid={!!errors.intervalMonths} {...register('intervalMonths')} />
              </Field>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Priority" htmlFor="tp-pri">
              <Select id="tp-pri" {...register('priority')}>
                {Object.entries(PRIORITY).map(([v, m]) => (
                  <option key={v} value={v}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Service mode" htmlFor="tp-mode">
              <Select id="tp-mode" {...register('serviceMode')}>
                {Object.entries(SERVICE_MODE).map(([v, m]) => (
                  <option key={v} value={v}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Estimated cost" htmlFor="tp-cost" error={errors.estimatedCost?.message}>
              <Input id="tp-cost" type="number" prefix="₹" {...register('estimatedCost')} />
            </Field>
            <Field label="Duration" htmlFor="tp-dur" error={errors.estimatedDurationMinutes?.message}>
              <Input id="tp-dur" type="number" step="1" suffix="min" invalid={!!errors.estimatedDurationMinutes} {...register('estimatedDurationMinutes')} />
            </Field>
          </div>
          <div className="space-y-3 rounded-2xl border border-line p-4">
            <Controller control={control} name="isActive" render={({ field }) => <Switch checked={field.value} onChange={field.onChange} label="Active" description="Inactive templates are ignored when building schedules." />} />
            <Controller control={control} name="isRecurring" render={({ field }) => <Switch checked={field.value} onChange={field.onChange} label="Recurring" description="Open the next occurrence after completion." />} />
          </div>
        </div>

        <div className="space-y-5">
          <Field label="Vehicle groups" error={errors.vehicleTypes?.message} hint="New vehicle types in a group inherit its templates automatically.">
            {chips('vehicleGroups', Object.entries(VEHICLE_GROUPS).map(([value, label]) => ({ value, label })))}
          </Field>
          <Field label="Specific vehicle types">{chips('vehicleTypes', vehicleTypes.map((t) => ({ value: t.code, label: t.name })))}</Field>
          <Field label="Fuel types" hint="Empty = any fuel">
            {chips('fuelTypes', fuelTypes.map((f) => ({ value: f.code, label: f.name })))}
          </Field>
          <Field label="Powertrains" hint="Empty = any powertrain">
            {chips('powertrains', Object.entries(POWERTRAINS).map(([value, label]) => ({ value, label })))}
          </Field>
          <Field label="Transmissions" hint="Empty = any transmission">
            {chips('transmissions', Object.entries(TRANSMISSIONS).map(([value, label]) => ({ value, label })))}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Only for makes" htmlFor="tp-makes" hint="Comma-separated">
              <Input id="tp-makes" placeholder="Royal Enfield, Toyota" {...register('makes')} />
            </Field>
            <Field label="Exclude makes" htmlFor="tp-ex" hint="Comma-separated">
              <Input id="tp-ex" {...register('excludeMakes')} />
            </Field>
            <Field label="Only for models" htmlFor="tp-models" hint="Matches partial names" className="sm:col-span-2">
              <Input id="tp-models" placeholder="Classic 350, Nexon EV" {...register('models')} />
            </Field>
          </div>
          <Field label="Notes" htmlFor="tp-notes">
            <Textarea id="tp-notes" rows={2} {...register('notes')} />
          </Field>
          {editing && (
            <Callout tone="info">
              Saving updates the catalog. Use <strong>“Apply to open items”</strong> from the list to push new intervals to existing vehicles.
            </Callout>
          )}
        </div>
      </form>
    </Modal>
  );
}

// ─── Catalog: categories / vehicle types / fuel types ───────────────────────
const CATALOG = {
  categories: {
    title: 'category',
    icon: Layers,
    api: () => adminApi.categories,
    defaults: { code: '', name: '', description: '', icon: 'wrench', color: '#3b6af5', sortOrder: 0, isActive: true },
  },
  vehicleTypes: {
    title: 'vehicle type',
    icon: Truck,
    api: () => adminApi.vehicleTypes,
    defaults: { code: '', name: '', group: 'passenger', illustration: 'sedan', usageUnit: 'km', allowedFuelTypes: [], description: '', sortOrder: 0, isActive: true },
  },
  fuelTypes: {
    title: 'fuel type',
    icon: Fuel,
    api: () => adminApi.fuelTypes,
    defaults: { code: '', name: '', powertrain: 'ice', sortOrder: 0, isActive: true },
  },
};

export function CatalogFormModal({ kind, open, onClose, item }) {
  const dispatch = useDispatch();
  const { fuelTypes } = useMeta();
  const config = CATALOG[kind];
  const editing = Boolean(item);
  const { register, control, handleSubmit, reset, watch, setError, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    if (open) reset({ ...config.defaults, ...(item || {}) });
  }, [open, item, reset, config]);

  const onSubmit = async (form) => {
    try {
      const allowed = Object.keys(config.defaults);
      const payload = Object.fromEntries(Object.entries(form).filter(([k]) => allowed.includes(k)));
      payload.sortOrder = Number(payload.sortOrder || 0);
      payload.code = String(payload.code).trim().toLowerCase();
      const api = config.api();
      const res = editing ? await api.update(item._id, payload) : await api.create(payload);
      toast.success(res.message);
      emitChange(`admin-${kind}`);
      dispatch(fetchMeta(true));
      onClose(true);
    } catch (e) {
      applyServerErrors(e, setError);
      toast.error(getErrorMessage(e));
    }
  };

  const Icon = CATEGORY_ICONS[watch('icon')] || Layers;

  return (
    <Modal
      open={open}
      onClose={() => onClose()}
      icon={config.icon}
      title={`${editing ? 'Edit' : 'New'} ${config.title}`}
      footer={
        <>
          <Button variant="secondary" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            Save
          </Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field label="Code" htmlFor="c-code" required error={errors.code?.message} hint={editing ? 'Codes in use cannot change' : 'lowercase_with_underscores'}>
          <Input id="c-code" className="font-mono" invalid={!!errors.code} {...register('code', { required: 'Code is required' })} />
        </Field>
        <Field label="Name" htmlFor="c-name" required error={errors.name?.message}>
          <Input id="c-name" invalid={!!errors.name} {...register('name', { required: 'Name is required' })} />
        </Field>

        {kind === 'categories' && (
          <>
            <Field label="Icon" htmlFor="c-icon" error={errors.icon?.message}>
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${watch('color')}1a`, color: watch('color') }}>
                  <Icon size={18} />
                </span>
                <Select id="c-icon" {...register('icon')}>
                  {Object.keys(CATEGORY_ICONS).map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </Select>
              </div>
            </Field>
            <Field label="Colour" htmlFor="c-color" error={errors.color?.message}>
              <Input id="c-color" type="color" className="h-10 p-1" {...register('color')} />
            </Field>
            <Field label="Description" htmlFor="c-desc" error={errors.description?.message} className="sm:col-span-2">
              <Textarea id="c-desc" rows={2} {...register('description')} />
            </Field>
          </>
        )}

        {kind === 'vehicleTypes' && (
          <>
            <Field label="Group" htmlFor="c-group" error={errors.group?.message} hint="Inherits all templates targeting this group">
              <Select id="c-group" {...register('group')}>
                {Object.entries(VEHICLE_GROUPS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Usage unit" htmlFor="c-unit" error={errors.usageUnit?.message}>
              <Select id="c-unit" {...register('usageUnit')}>
                <option value="km">Kilometres (odometer)</option>
                <option value="hours">Hours (hour meter)</option>
              </Select>
            </Field>
            <Field label="Illustration" htmlFor="c-illu" error={errors.illustration?.message} className="sm:col-span-2">
              <div className="flex items-center gap-3">
                <div className="w-28 shrink-0 rounded-xl bg-surface-2 p-1">
                  <VehicleArt illustration={watch('illustration')} color="#3b6af5" ground={false} />
                </div>
                <Select id="c-illu" {...register('illustration')}>
                  {VEHICLE_ILLUSTRATIONS.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </Select>
              </div>
            </Field>
            <Field label="Allowed fuels" error={errors.allowedFuelTypes?.message} hint="Empty = all fuels" className="sm:col-span-2">
              <Controller
                control={control}
                name="allowedFuelTypes"
                render={({ field }) => <ChipSelect options={fuelTypes.map((f) => ({ value: f.code, label: f.name }))} value={field.value || []} onChange={field.onChange} />}
              />
            </Field>
            <Field label="Description" htmlFor="c-vdesc" error={errors.description?.message} className="sm:col-span-2">
              <Input id="c-vdesc" {...register('description')} />
            </Field>
          </>
        )}

        {kind === 'fuelTypes' && (
          <Field label="Powertrain" htmlFor="c-pt" error={errors.powertrain?.message} hint="Controls which templates apply (e.g. EVs skip oil changes)">
            <Select id="c-pt" {...register('powertrain')}>
              {Object.entries(POWERTRAINS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Sort order" htmlFor="c-sort" error={errors.sortOrder?.message}>
          <Input id="c-sort" type="number" step="1" invalid={!!errors.sortOrder} {...register('sortOrder')} />
        </Field>
        <div className="flex items-end sm:col-span-2">
          <Controller control={control} name="isActive" render={({ field }) => <Switch checked={Boolean(field.value)} onChange={field.onChange} label="Active" description="Inactive entries are hidden from users." />} />
        </div>
      </form>
    </Modal>
  );
}

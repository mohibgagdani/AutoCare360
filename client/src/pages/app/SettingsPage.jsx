import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { User, Lock, SlidersHorizontal, Sun, Moon, Monitor, Camera, Trash2, Mail, Phone, ShieldCheck, LogOut } from 'lucide-react';
import { PageHeader, Card, CardHeader, Button, Field, Input, Select, Switch, OptionCards, Avatar, Badge } from '@/components/ui';
import { profileApi } from '@/services';
import { setAccessToken } from '@/services/api';
import { setUser, logout } from '@/store/authSlice';
import { setReduceMotion } from '@/store/uiSlice';
import { useTheme } from '@/hooks/useTheme';
import { useDocumentTitle } from '@/hooks/common';
import { profileSchema, changePasswordSchema } from '@/validations';
import { applyServerErrors, getErrorMessage } from '@/utils/errors';
import { setCurrency, formatDate } from '@/utils/format';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Password & security', icon: Lock },
  { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
];

function ProfileSection({ user }) {
  const dispatch = useDispatch();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(profileSchema), defaultValues: { name: user.name, email: user.email, phone: user.phone || '' } });

  useEffect(() => reset({ name: user.name, email: user.email, phone: user.phone || '' }), [user, reset]);

  const save = async (values) => {
    try {
      const res = await profileApi.update(values);
      dispatch(setUser(res.data.user));
      toast.success(res.message);
    } catch (e) {
      applyServerErrors(e, setError);
      toast.error(getErrorMessage(e));
    }
  };

  const onAvatar = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Please choose an image under 5 MB');
    setUploading(true);
    try {
      const res = await profileApi.uploadAvatar(file);
      dispatch(setUser(res.data.user));
      toast.success(res.message);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setUploading(false);
    }
    return undefined;
  };

  const removeAvatar = async () => {
    try {
      const res = await profileApi.removeAvatar();
      dispatch(setUser(res.data.user));
      toast.success(res.message);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <Card id="profile">
      <CardHeader title="Profile" description="How you appear across AutoCare360." icon={User} />
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={user.name} src={user.avatar?.url} size={72} />
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onAvatar(e.target.files?.[0])} />
            <Button size="sm" variant="secondary" leftIcon={Camera} loading={uploading} onClick={() => fileRef.current?.click()}>
              {user.avatar?.url ? 'Change photo' : 'Upload photo'}
            </Button>
            {user.avatar?.url && (
              <Button size="sm" variant="ghost" leftIcon={Trash2} onClick={removeAvatar}>
                Remove
              </Button>
            )}
          </div>
          <div className="ml-auto text-right text-xs text-ink-3">
            <Badge tone={user.role === 'admin' ? 'violet' : 'gray'}>{user.role === 'admin' ? 'Administrator' : 'Member'}</Badge>
            <p className="mt-1.5">Joined {formatDate(user.createdAt, 'MMMM yyyy')}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit(save)} className="mt-6 grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Full name" htmlFor="p-name" error={errors.name?.message}>
            <Input id="p-name" leftIcon={User} invalid={!!errors.name} {...register('name')} />
          </Field>
          <Field label="Phone" htmlFor="p-phone" error={errors.phone?.message}>
            <Input id="p-phone" leftIcon={Phone} placeholder="+91" {...register('phone')} />
          </Field>
          <Field label="Email" htmlFor="p-email" error={errors.email?.message} className="sm:col-span-2">
            <Input id="p-email" type="email" leftIcon={Mail} invalid={!!errors.email} {...register('email')} />
          </Field>
          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
              Save profile
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}

function SecuritySection() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });

  const save = async ({ currentPassword, newPassword }) => {
    try {
      const res = await profileApi.changePassword({ currentPassword, newPassword });
      setAccessToken(res.data.accessToken);
      toast.success(res.message);
      reset();
    } catch (e) {
      if (!applyServerErrors(e, setError)) toast.error(getErrorMessage(e));
    }
  };

  return (
    <Card id="security">
      <CardHeader title="Password & security" description="Changing your password signs out your other devices." icon={Lock} />
      <form onSubmit={handleSubmit(save)} className="grid gap-4 p-5 sm:grid-cols-2" noValidate>
        <Field label="Current password" htmlFor="s-current" error={errors.currentPassword?.message} className="sm:col-span-2">
          <Input id="s-current" type="password" autoComplete="current-password" invalid={!!errors.currentPassword} {...register('currentPassword')} />
        </Field>
        <Field label="New password" htmlFor="s-new" error={errors.newPassword?.message} hint="8+ characters with upper & lower case and a number">
          <Input id="s-new" type="password" autoComplete="new-password" invalid={!!errors.newPassword} {...register('newPassword')} />
        </Field>
        <Field label="Confirm new password" htmlFor="s-confirm" error={errors.confirmPassword?.message}>
          <Input id="s-confirm" type="password" autoComplete="new-password" invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
          <p className="flex items-center gap-1.5 text-xs text-ink-3">
            <ShieldCheck size={14} className="text-emerald-500" aria-hidden /> Passwords are hashed with bcrypt; sessions use rotating refresh tokens.
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              leftIcon={LogOut}
              onClick={async () => {
                await dispatch(logout());
                navigate('/login');
              }}
            >
              Sign out
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Update password
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}

function PreferencesSection({ user }) {
  const dispatch = useDispatch();
  const { theme, setTheme } = useTheme();
  const reduceMotion = useSelector((s) => s.ui.reduceMotion);
  const prefs = user.preferences || {};

  const update = async (patch) => {
    try {
      const res = await profileApi.preferences(patch);
      dispatch(setUser(res.data.user));
      if (patch.currency) setCurrency(patch.currency);
      toast.success('Preferences saved');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <Card id="preferences">
      <CardHeader title="Preferences" description="Personalise how AutoCare360 looks and alerts you." icon={SlidersHorizontal} />
      <div className="space-y-6 p-5">
        <Field label="Appearance">
          <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-3">
            {[
              { value: 'light', label: 'Light', icon: Sun, preview: 'bg-white border-slate-200' },
              { value: 'dark', label: 'Dark', icon: Moon, preview: 'bg-navy-900 border-navy-700' },
              { value: 'system', label: 'System', icon: Monitor, preview: 'bg-gradient-to-r from-white to-navy-900 border-slate-300' },
            ].map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={theme === t.value}
                onClick={() => setTheme(t.value)}
                className={cn(
                  'rounded-2xl border p-3 text-left transition',
                  theme === t.value ? 'border-brand-500 ring-4 ring-brand-500/10' : 'border-line hover:border-line-strong'
                )}
              >
                <span className={cn('mb-2 block h-14 rounded-xl border', t.preview)} aria-hidden />
                <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                  <t.icon size={14} aria-hidden /> {t.label}
                </span>
              </button>
            ))}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Currency" htmlFor="pref-currency">
            <Select id="pref-currency" value={prefs.currency || 'INR'} onChange={(e) => update({ currency: e.target.value })}>
              <option value="INR">Indian Rupee (₹)</option>
              <option value="USD">US Dollar ($)</option>
              <option value="EUR">Euro (€)</option>
              <option value="GBP">British Pound (£)</option>
              <option value="AED">UAE Dirham (AED)</option>
            </Select>
          </Field>
          <Field label="Distance unit" htmlFor="pref-distance" hint="Display preference">
            <Select id="pref-distance" value={prefs.distanceUnit || 'km'} onChange={(e) => update({ distanceUnit: e.target.value })}>
              <option value="km">Kilometres</option>
              <option value="mi">Miles</option>
            </Select>
          </Field>
        </div>

        <Field label="Default reminder timing" hint="Used for new reminders you create.">
          <OptionCards
            columns={3}
            value={String(prefs.reminderDaysBefore ?? 15)}
            onChange={(v) => update({ reminderDaysBefore: Number(v) })}
            options={[
              { value: '7', label: '7 days before' },
              { value: '15', label: '15 days before' },
              { value: '30', label: '30 days before' },
            ]}
          />
        </Field>

        <div className="space-y-4 rounded-2xl border border-line p-4">
          <Switch
            checked={prefs.emailNotifications !== false}
            onChange={(v) => update({ emailNotifications: v })}
            label="Email notifications"
            description="Overdue maintenance and document expiry alerts by email."
          />
          <div className="h-px bg-line" />
          <Switch
            checked={reduceMotion}
            onChange={(v) => dispatch(setReduceMotion(v))}
            label="Reduce motion"
            description="Turn off animations and transitions on this device."
          />
        </div>
      </div>
    </Card>
  );
}

export default function SettingsPage() {
  useDocumentTitle('Settings');
  const user = useSelector((s) => s.auth.user);
  const [active, setActive] = useState('profile');

  return (
    <>
      <PageHeader title="Settings" description="Manage your account, security and preferences." />
      <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="scrollbar-none flex gap-1 overflow-x-auto lg:sticky lg:top-24 lg:flex-col" aria-label="Settings sections">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={() => setActive(s.id)}
              className={cn(
                'flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition',
                active === s.id ? 'bg-surface text-ink shadow-sm ring-1 ring-line' : 'text-ink-3 hover:bg-surface-3 hover:text-ink'
              )}
            >
              <s.icon size={16} aria-hidden />
              {s.label}
            </a>
          ))}
        </nav>
        <div className="max-w-3xl space-y-6">
          <ProfileSection user={user} />
          <SecuritySection />
          <PreferencesSection user={user} />
        </div>
      </div>
    </>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, User, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Field, Input, Checkbox, Callout } from '@/components/ui';
import { register as registerUser } from '@/store/authSlice';
import { registerSchema } from '@/validations';
import { useDocumentTitle } from '@/hooks/common';
import { cn } from '@/utils/cn';

const RULES = [
  { test: (v) => v.length >= 8, label: '8+ characters' },
  { test: (v) => /[A-Z]/.test(v), label: 'Uppercase' },
  { test: (v) => /[a-z]/.test(v), label: 'Lowercase' },
  { test: (v) => /\d/.test(v), label: 'Number' },
];

function PasswordStrength({ value = '' }) {
  const passed = RULES.filter((r) => r.test(value)).length;
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500'];
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {RULES.map((_, i) => (
          <span key={i} className={cn('h-1 flex-1 rounded-full', i < passed ? colors[passed - 1] : 'bg-surface-3')} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {RULES.map((r) => {
          const ok = r.test(value);
          return (
            <li key={r.label} className={cn('inline-flex items-center gap-1 text-[11px]', ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-3')}>
              <Check size={11} strokeWidth={3} className={ok ? 'opacity-100' : 'opacity-30'} aria-hidden />
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function RegisterPage() {
  useDocumentTitle('Create account');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [formError, setFormError] = useState('');
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', terms: false },
  });

  const onSubmit = async ({ name, email, password }) => {
    setFormError('');
    const result = await dispatch(registerUser({ name, email, password }));
    if (registerUser.fulfilled.match(result)) {
      toast.success('Account created — let’s add your first vehicle!');
      navigate('/app/vehicles/new', { replace: true });
    } else {
      const { message, errors: fieldErrors } = result.payload || {};
      fieldErrors?.forEach((e) => setError(e.field, { message: e.message }));
      setFormError(message || 'Unable to create your account');
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ink">Create your account</h1>
      <p className="mt-2 text-sm text-ink-3">Start tracking every vehicle you own in under a minute.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4" noValidate>
        {formError && <Callout tone="danger">{formError}</Callout>}
        <Field label="Full name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" autoComplete="name" leftIcon={User} placeholder="Aditya Kulkarni" invalid={!!errors.name} {...register('name')} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" leftIcon={Mail} placeholder="you@example.com" invalid={!!errors.email} {...register('email')} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="new-password" leftIcon={Lock} placeholder="Create a strong password" invalid={!!errors.password} {...register('password')} />
          <PasswordStrength value={watch('password')} />
        </Field>
        <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
          <Input id="confirmPassword" type="password" autoComplete="new-password" leftIcon={Lock} placeholder="Repeat password" invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
        </Field>
        <div>
          <Checkbox label="I agree to the Terms of Service and Privacy Policy" {...register('terms')} />
          {errors.terms && <p className="mt-1 text-xs font-medium text-red-600">{errors.terms.message}</p>}
        </div>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-3">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          Sign in
        </Link>
      </p>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Field, Input, Callout } from '@/components/ui';
import { login, clearSessionMessage } from '@/store/authSlice';
import { loginSchema } from '@/validations';
import { useDocumentTitle } from '@/hooks/common';

export default function LoginPage() {
  useDocumentTitle('Sign in');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sessionMessage = useSelector((s) => s.auth.sessionMessage);
  const [show, setShow] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = async (values) => {
    setFormError('');
    const result = await dispatch(login(values));
    if (login.fulfilled.match(result)) {
      dispatch(clearSessionMessage());
      toast.success(`Welcome back, ${result.payload.name.split(' ')[0]}!`);
      const redirect = params.get('redirect');
      const safe = redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : result.payload.role === 'admin' ? '/admin' : '/app';
      navigate(safe, { replace: true });
    } else {
      const { message, errors: fieldErrors } = result.payload || {};
      fieldErrors?.forEach((e) => setError(e.field, { message: e.message }));
      setFormError(message || 'Unable to sign in');
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ink">Welcome back</h1>
      <p className="mt-2 text-sm text-ink-3">Sign in to manage your vehicles, maintenance and expenses.</p>

      {sessionMessage && (
        <Callout tone="warning" className="mt-6">
          {sessionMessage}
        </Callout>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        {formError && (
          <Callout tone="danger" className="py-2.5">
            {formError}
          </Callout>
        )}
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" leftIcon={Mail} placeholder="you@example.com" invalid={!!errors.email} {...register('email')} />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
          labelAction={
            <Link to="/forgot-password" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
              Forgot password?
            </Link>
          }
        >
          <div className="relative">
            <Input
              id="password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              leftIcon={Lock}
              placeholder="••••••••"
              invalid={!!errors.password}
              className="pr-10"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-3 hover:text-ink"
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-3">
        New to AutoCare360?{' '}
        <Link to="/register" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          Create an account
        </Link>
      </p>
    </div>
  );
}

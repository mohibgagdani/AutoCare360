import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, MailCheck, ArrowLeft } from 'lucide-react';
import { Button, Field, Input, Callout } from '@/components/ui';
import { authApi } from '@/services';
import { forgotSchema } from '@/validations';
import { getErrorMessage } from '@/utils/errors';
import { useDocumentTitle } from '@/hooks/common';

export default function ForgotPasswordPage() {
  useDocumentTitle('Forgot password');
  const [sent, setSent] = useState(null);
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } });

  const onSubmit = async ({ email }) => {
    setError('');
    try {
      await authApi.forgotPassword({ email });
      setSent(email);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
          <MailCheck size={26} aria-hidden />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold text-ink">Check your inbox</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-3">
          If an account exists for <span className="font-medium text-ink">{sent}</span>, we’ve sent a link to reset your password. It expires in 30 minutes.
        </p>
        <p className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-xs text-ink-3">
          Running locally without SMTP? The reset link is printed in the API server console.
        </p>
        <Button to="/login" variant="secondary" className="mt-6 w-full" leftIcon={ArrowLeft}>
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ink">Forgot password?</h1>
      <p className="mt-2 text-sm text-ink-3">Enter your email and we’ll send you a secure reset link.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4" noValidate>
        {error && <Callout tone="danger">{error}</Callout>}
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" leftIcon={Mail} placeholder="you@example.com" invalid={!!errors.email} {...register('email')} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Send reset link
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-3">
        Remembered it?{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          Sign in
        </Link>
      </p>
    </div>
  );
}

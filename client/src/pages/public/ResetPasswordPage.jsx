import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Field, Input, Callout } from '@/components/ui';
import { authApi } from '@/services';
import { resetSchema } from '@/validations';
import { getErrorMessage } from '@/utils/errors';
import { useDocumentTitle } from '@/hooks/common';

export default function ResetPasswordPage() {
  useDocumentTitle('Reset password');
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(resetSchema), defaultValues: { password: '', confirmPassword: '' } });

  const onSubmit = async ({ password }) => {
    setError('');
    try {
      const res = await authApi.resetPassword(token, { password });
      toast.success(res.message);
      navigate('/login', { replace: true });
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ink">Set a new password</h1>
      <p className="mt-2 text-sm text-ink-3">Choose a strong password you haven’t used before.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4" noValidate>
        {error && (
          <Callout tone="danger">
            {error}{' '}
            <Link to="/forgot-password" className="font-semibold underline">
              Request a new link
            </Link>
          </Callout>
        )}
        <Field label="New password" htmlFor="password" error={errors.password?.message} hint="At least 8 characters with upper & lower case and a number.">
          <Input id="password" type="password" autoComplete="new-password" leftIcon={Lock} invalid={!!errors.password} {...register('password')} />
        </Field>
        <Field label="Confirm new password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
          <Input id="confirmPassword" type="password" autoComplete="new-password" leftIcon={Lock} invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Update password
        </Button>
      </form>
    </div>
  );
}

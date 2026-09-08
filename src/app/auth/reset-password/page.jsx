'use client';

import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import QuirriLogo from '@/components/superadmin/QuirriLogo';
import PasswordInput from '@/components/auth/PasswordInput';
import { resetPasswordSchema, FIELD_RULES } from '@/lib/validation';
import { authApi } from '@/lib/api/auth';
import { getApiErrorMessage } from '@/lib/api/errors';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data) => {
    if (!token) {
      toast.error('This reset link is missing or invalid. Request a new one.');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(token, data.password);
      setDone(true);
      toast.success('Password updated. You can sign in now.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not reset password. Request a new link.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-brand">
            <QuirriLogo size="lg" priority />
          </div>

          {done ? (
            <>
              <h1>Password updated</h1>
              <p className="sub">You can sign in with your new password.</p>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => router.push('/auth/login')}
              >
                Go to sign in
              </button>
            </>
          ) : (
            <>
              <h1>Reset password</h1>
              <p className="sub">Choose a new password for your Quirri account.</p>
              {!token ? (
                <div className="notice err" style={{ marginBottom: 18 }}>
                  <div>
                    <b>Invalid link</b>
                    Open the link from your email, or request a new reset.
                  </div>
                </div>
              ) : null}
              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="field">
                  <label htmlFor="password">New password</label>
                  <PasswordInput
                    id="password"
                    register={register('password')}
                    error={errors.password?.message}
                    maxLength={FIELD_RULES.password.max}
                    autoComplete="new-password"
                  />
                </div>
                <div className="field">
                  <label htmlFor="confirmPassword">Confirm password</label>
                  <PasswordInput
                    id="confirmPassword"
                    register={register('confirmPassword')}
                    error={errors.confirmPassword?.message}
                    maxLength={FIELD_RULES.password.max}
                    autoComplete="new-password"
                  />
                </div>
                <button className="btn btn-primary btn-block" type="submit" disabled={loading || !token}>
                  {loading ? 'Saving…' : 'Save & sign in'}
                </button>
              </form>
              <p style={{ marginTop: 26, paddingTop: 20, borderTop: '1px solid var(--line)', textAlign: 'left' }}>
                <Link className="link" href="/auth/forgot-password">Request a new link</Link>
                {' · '}
                <Link className="link" href="/auth/login">Back to sign in</Link>
              </p>
            </>
          )}
        </div>
        <p className="auth-foot">Access is by invitation from your administrator.</p>
      </div>
    </div>
  );
}

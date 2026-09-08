'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import toast from 'react-hot-toast';
import QuirriLogo from '@/components/superadmin/QuirriLogo';
import { QuirriControlledField } from '@/components/superadmin/quirri-ui';
import { forgotPasswordSchema } from '@/lib/validation';
import { authApi } from '@/lib/api/auth';
import { getApiErrorMessage } from '@/lib/api/errors';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
    defaultValues: { email: '' },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await authApi.forgotPassword(data.email);
      setSent(true);
    } catch (err) {
      // Non-enumerating: still show success-shaped outcome for most failures
      const status = err?.response?.status;
      if (status === 429) {
        toast.error(getApiErrorMessage(err, 'Too many requests. Try again shortly.'));
      } else {
        setSent(true);
      }
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

          {sent ? (
            <>
              <h1>Check your inbox</h1>
              <p className="sub">
                If an account exists for that address, a reset link is on its way.
              </p>
              <div className="notice" style={{ marginBottom: 18 }}>
                <div>
                  <b>Link sent</b>
                  It expires in 30 minutes and can be used once.
                </div>
              </div>
              <Link className="btn btn-primary btn-block" href="/auth/login">
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <h1>Forgot password</h1>
              <p className="sub">
                Enter your institutional email and we&apos;ll send a reset link.
              </p>
              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <Controller
                  control={control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <QuirriControlledField
                      fieldType="email"
                      label="Email"
                      name={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      inputRef={field.ref}
                      error={fieldState.error}
                      placeholder="you@college.edu"
                    />
                  )}
                />
                <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
              <p style={{ marginTop: 26, paddingTop: 20, borderTop: '1px solid var(--line)', textAlign: 'left' }}>
                <Link className="link" href="/auth/login">← Back to sign in</Link>
              </p>
            </>
          )}
        </div>
        <p className="auth-foot">Access is by invitation from your administrator.</p>
      </div>
    </div>
  );
}

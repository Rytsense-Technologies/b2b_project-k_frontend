'use client';

import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import QuirriLogo from '@/components/superadmin/QuirriLogo';
import PasswordInput from '@/components/auth/PasswordInput';
import { resetPasswordSchema, FIELD_RULES } from '@/lib/validation';
import { authApi } from '@/lib/api/auth';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getPostLoginPath } from '@/lib/auth/rbac';

/**
 * Account activation (invite e-mail → {FRONTEND_URL}/activate?token=…).
 * Same auth card as reset password; sets the first password and signs the user in.
 */
export default function ActivatePage() {
  return (
    <Suspense fallback={null}>
      <ActivateForm />
    </Suspense>
  );
}

function ActivateForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [loading, setLoading] = useState(false);

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
      toast.error('This activation link is missing or invalid. Ask your administrator to resend the invite.');
      return;
    }
    setLoading(true);
    try {
      const session = await authApi.activate(token, data.password);
      if (session?.user) {
        try { sessionStorage.setItem('pk_user', JSON.stringify(session.user)); } catch { /* private mode */ }
      }
      toast.success('Your account is ready.');
      // Full navigation so the portal layout hydrates the new session from the cookies.
      window.location.assign(session?.role ? getPostLoginPath(session.role) : '/auth/login');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'This link has expired or was already used. Ask your administrator to resend the invite.'));
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
          <h1>Activate your account</h1>
          <p className="sub">Choose a password to finish setting up your Quirri account.</p>
          {!token ? (
            <div className="notice err" style={{ marginBottom: 18 }}>
              <div>
                <b>Invalid link</b>
                Open the link from your invite e-mail, or ask your administrator to resend it.
              </div>
            </div>
          ) : null}
          <form method="post" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="field">
              <label htmlFor="password">Password</label>
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
              {loading ? 'Activating…' : 'Activate & sign in'}
            </button>
          </form>
          <p style={{ marginTop: 26, paddingTop: 20, borderTop: '1px solid var(--line)', textAlign: 'left' }}>
            <Link className="link" href="/auth/login">Already activated? Sign in</Link>
          </p>
        </div>
        <p className="auth-foot">Access is by invitation from your administrator.</p>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import QuirriLogo from '@/components/superadmin/QuirriLogo';
import PasswordInput from '@/components/auth/PasswordInput';
import { QuirriControlledField } from '@/components/superadmin/quirri-ui';
import { loginSchema } from '@/lib/validations';
import { FIELD_RULES } from '@/lib/validation';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/slices/authSlice';
import { loginWithRbac } from '@/lib/api/auth';
import { getApiErrorMessage, isCredentialFailure } from '@/lib/api/errors';
import { getPostLoginPath } from '@/lib/auth/rbac';
import { getPermissions } from '@/lib/permissions';
import { setSessionCookie, setRoleCookie, setTenantCookie } from '@/lib/tokens';

const DEV_BYPASS_AUTH = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true';

/**
 * Centered Quirri login card — same visual pattern as Super Admin / College Admin.
 * Do not restyle from new_updated_design_four/Login.dc.html.
 */
export default function PortalLoginPage({
  expectedRole,
  homePath,
  lockoutKey,
  footCopy = 'Access is by invitation from your administrator.',
  bypassUser,
}) {
  return (
    <Suspense fallback={null}>
      <LoginForm
        expectedRole={expectedRole}
        homePath={homePath}
        lockoutKey={lockoutKey}
        footCopy={footCopy}
        bypassUser={bypassUser}
      />
    </Suspense>
  );
}

function LoginForm({ expectedRole, homePath, lockoutKey, footCopy, bypassUser }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm(DEV_BYPASS_AUTH ? {} : { resolver: zodResolver(loginSchema), mode: 'onBlur' });

  const getLockoutState = useCallback(() => {
    try {
      const raw = localStorage.getItem(lockoutKey);
      if (!raw) return { count: 0, lockedUntil: 0 };
      return JSON.parse(raw);
    } catch {
      return { count: 0, lockedUntil: 0 };
    }
  }, [lockoutKey]);

  const setLockoutState = useCallback((state) => {
    localStorage.setItem(lockoutKey, JSON.stringify(state));
  }, [lockoutKey]);

  const checkLockout = useCallback(() => {
    const { lockedUntil } = getLockoutState();
    if (lockedUntil > Date.now()) {
      setLockoutRemaining(lockedUntil - Date.now());
      return true;
    }
    setLockoutRemaining(0);
    return false;
  }, [getLockoutState]);

  useEffect(() => {
    checkLockout();
    const id = setInterval(() => {
      const { lockedUntil } = getLockoutState();
      if (lockedUntil > Date.now()) setLockoutRemaining(lockedUntil - Date.now());
      else setLockoutRemaining(0);
    }, 1000);
    return () => clearInterval(id);
  }, [checkLockout, getLockoutState]);

  const isLockedOut = lockoutRemaining > 0;
  const lockoutMinutes = Math.ceil(lockoutRemaining / 60000);

  const onSubmit = async (data) => {
    if (checkLockout()) {
      toast.error(`Too many failed attempts. Try again in ${lockoutMinutes} minutes.`);
      return;
    }

    setLoading(true);
    try {
      let session;
      if (DEV_BYPASS_AUTH) {
        setSessionCookie();
        setRoleCookie(expectedRole);
        setTenantCookie(bypassUser?.tenant_id || 'dev-tenant');
        session = {
          user: bypassUser || {
            id: `dev-${expectedRole}`,
            name: expectedRole,
            email: data.email || `${expectedRole}@quirri.ai`,
          },
          role: expectedRole,
          tenant_id: bypassUser?.tenant_id || 'dev-tenant',
          permissions: getPermissions(expectedRole),
          plan: 'standard',
        };
      } else {
        session = await loginWithRbac(data.email, data.password);
      }

      if (!session?.user?.email) {
        toast.error('Unexpected login response from server.');
        return;
      }

      if (session.role && session.role !== expectedRole) {
        toast.error('This account does not belong to this portal. Use the correct sign-in page.');
        return;
      }

      localStorage.removeItem(lockoutKey);
      setLockoutRemaining(0);

      const { user, role, tenant_id, permissions, plan } = session;
      sessionStorage.setItem('pk_user', JSON.stringify(user));
      sessionStorage.setItem('pk_plan', plan || 'standard');

      dispatch(setCredentials({
        user,
        plan: plan || 'standard',
        role: role || expectedRole,
        tenant_id,
        permissions: permissions?.length ? permissions : getPermissions(expectedRole),
        onboarding_complete: true,
        plan_selected: true,
      }));

      toast.success(`Welcome back, ${user.first_name || user.name || 'there'}!`);
      router.push(homePath || getPostLoginPath(role || expectedRole));
    } catch (err) {
      if (isCredentialFailure(err)) {
        const state = getLockoutState();
        state.count += 1;
        if (state.count >= 3) {
          state.lockedUntil = Date.now() + 15 * 60 * 1000;
          state.count = 0;
        }
        setLockoutState(state);
        checkLockout();
      }
      toast.error(getApiErrorMessage(err, 'Invalid email or password.'));
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
          <h1>Welcome back</h1>
          <p className="sub">Sign in to Quirri</p>

          {isLockedOut ? (
            <>
              <div className="notice err">
                <div>
                  <b>Account temporarily locked</b>
                  Too many failed attempts. Try again in {lockoutMinutes} minute{lockoutMinutes === 1 ? '' : 's'}.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-block"
                onClick={() => {
                  localStorage.removeItem(lockoutKey);
                  setLockoutRemaining(0);
                  toast.success('You can try signing in again.');
                }}
              >
                Try again now
              </button>
            </>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Controller
                control={control}
                name="email"
                defaultValue=""
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
              <div className="field">
                <label htmlFor="password">Password</label>
                <PasswordInput
                  id="password"
                  register={register('password')}
                  error={errors.password?.message}
                  maxLength={FIELD_RULES.password.max}
                />
              </div>
              <div className="auth-row">
                <a className="link" href="#">Forgot password?</a>
              </div>
              <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )}
        </div>
        <p className="auth-foot">{footCopy}</p>
      </div>
    </div>
  );
}

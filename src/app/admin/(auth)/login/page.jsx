'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import QuirriLogo from '@/components/superadmin/QuirriLogo';
import PasswordInput from '@/components/auth/PasswordInput';
import { QuirriControlledField } from '@/components/superadmin/quirri-ui';
import { loginSchema } from '@/lib/validations';
import { FIELD_RULES } from '@/lib/validation';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/slices/authSlice';
import { adminLogin } from '@/lib/api/admin/auth';
import { getApiErrorMessage, isCredentialFailure } from '@/lib/api/errors';
import { getPostLoginPath } from '@/lib/auth/rbac';
import { ROLES, getPermissions } from '@/lib/permissions';
import { setSessionCookie, setRoleCookie, setTenantCookie } from '@/lib/tokens';

const DEV_BYPASS_AUTH = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true';

const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 15 * 60 * 1000;
const LOCKOUT_KEY = 'pk_admin_login_lockout';

function getLockoutState() {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY);
    if (!raw) return { count: 0, lockedUntil: 0 };
    return JSON.parse(raw);
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

function setLockoutState(state) {
  localStorage.setItem(LOCKOUT_KEY, JSON.stringify(state));
}

export default function CollegeAdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  const tenantSlug = searchParams.get('tenant');

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm(DEV_BYPASS_AUTH ? {} : { resolver: zodResolver(loginSchema), mode: 'onBlur' });

  const checkLockout = useCallback(() => {
    const { lockedUntil } = getLockoutState();
    if (lockedUntil > Date.now()) {
      setLockoutRemaining(lockedUntil - Date.now());
      return true;
    }
    setLockoutRemaining(0);
    return false;
  }, []);

  useEffect(() => {
    checkLockout();
    const id = setInterval(() => {
      const { lockedUntil } = getLockoutState();
      if (lockedUntil > Date.now()) {
        setLockoutRemaining(lockedUntil - Date.now());
      } else {
        setLockoutRemaining(0);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [checkLockout]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.search.includes('password=') || window.location.search.includes('email=')) {
      router.replace('/admin/login');
    }
  }, [router]);

  const recordFailure = () => {
    const state = getLockoutState();
    state.count += 1;
    if (state.count >= MAX_ATTEMPTS) {
      state.lockedUntil = Date.now() + LOCKOUT_MS;
      state.count = 0;
    }
    setLockoutState(state);
    checkLockout();
  };

  const clearLockout = () => {
    localStorage.removeItem(LOCKOUT_KEY);
    setLockoutRemaining(0);
  };

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
        setRoleCookie(ROLES.COLLEGE_ADMIN);
        setTenantCookie('dev-college');
        session = {
          user: {
            id: 'dev-college-admin',
            name: 'College Admin',
            email: data.email || 'college.admin@quirri.ai',
            first_name: 'College',
            last_name: 'Admin',
            college_name: 'Demo College',
            university_name: 'Demo University',
            tenant_name: 'Demo College',
            plan: 'standard',
          },
          role: ROLES.COLLEGE_ADMIN,
          tenant_id: 'dev-college',
          permissions: getPermissions(ROLES.COLLEGE_ADMIN),
          plan: 'standard',
          onboarding_complete: true,
          plan_selected: true,
        };
      } else {
        session = await adminLogin(data.email, data.password, tenantSlug);
      }

      if (!session?.user?.email) {
        toast.error('Unexpected login response from server.');
        return;
      }

      clearLockout();

      const { user, role, tenant_id, permissions, plan } = session;

      sessionStorage.setItem('pk_user', JSON.stringify(user));
      sessionStorage.setItem('pk_plan', plan);

      dispatch(setCredentials({
        user,
        plan,
        role,
        tenant_id,
        permissions,
        onboarding_complete: true,
        plan_selected: true,
      }));

      const displayName = user.first_name || user.name || 'there';
      toast.success(`Welcome back, ${displayName}!`);
      router.push(getPostLoginPath(role));
    } catch (err) {
      if (isCredentialFailure(err)) {
        recordFailure();
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
          <p className="sub">
            {tenantSlug
              ? `Sign in to Quirri for ${tenantSlug}`
              : 'Sign in to Quirri'}
          </p>

          {isLockedOut ? (
            <>
              <div className="notice err">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="10" width="16" height="10" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
                <div>
                  <b>Account temporarily locked</b>
                  Too many failed attempts. Try again in {lockoutMinutes} minute{lockoutMinutes === 1 ? '' : 's'},
                  or reset your password to regain access now.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-block"
                onClick={() => {
                  clearLockout();
                  toast.success('You can try signing in again.');
                }}
              >
                Try again now
              </button>
              <a className="btn btn-ghost btn-block" href="#" style={{ marginTop: 8 }}>
                Reset password
              </a>
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

        <p className="auth-foot">
          Access is by invitation from your Super Admin.
        </p>
      </div>
    </div>
  );
}

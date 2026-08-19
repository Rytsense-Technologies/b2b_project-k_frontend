'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loader2, Lock } from 'lucide-react';
import QuirriLogo from '@/components/superadmin/QuirriLogo';
import PasswordInput from '@/components/auth/PasswordInput';
import { loginSchema } from '@/lib/validations';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/slices/authSlice';
import { loginWithRbac } from '@/lib/api/auth';
import { getPostLoginPath, isB2bRole } from '@/lib/auth/rbac';
import { setSessionCookie, setRoleCookie, setTenantCookie } from '@/lib/tokens';
import { ROLES, getPermissions } from '@/lib/permissions';

const DEV_BYPASS_AUTH =
  process.env.NODE_ENV === 'development' ||
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' ||
  (process.env.VERCEL === '1' && process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH !== 'false');

const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 15 * 60 * 1000;
const LOCKOUT_KEY = 'pk_login_lockout';

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

function setOnbCookie(val) {
  document.cookie = `pk_onb=${val}; path=/; max-age=86400; SameSite=Lax`;
}

function getOnbCookie() {
  return document.cookie.split('; ').find((c) => c.startsWith('pk_onb='))?.split('=')[1];
}

export default function LoginPage() {
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
    handleSubmit,
    formState: { errors },
  } = useForm(DEV_BYPASS_AUTH ? {} : { resolver: zodResolver(loginSchema) });

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
      router.replace('/auth/login');
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
  const lockoutSeconds = Math.ceil((lockoutRemaining % 60000) / 1000);

  const onSubmit = async (data) => {
    if (checkLockout()) {
      toast.error(`Too many failed attempts. Try again in ${lockoutMinutes}m ${lockoutSeconds}s.`);
      return;
    }

    setLoading(true);
    try {
      let session;
      if (DEV_BYPASS_AUTH) {
        setSessionCookie();
        setRoleCookie(ROLES.SUPERADMIN);
        setTenantCookie(null);
        session = {
          user: {
            id: 'dev-user',
            name: 'Super Admin',
            email: data.email || 'admin@quirri.ai',
            first_name: 'Super',
            last_name: 'Admin',
            plan: 'standard',
          },
          role: ROLES.SUPERADMIN,
          tenant_id: null,
          permissions: getPermissions(ROLES.SUPERADMIN),
          plan: 'standard',
          onboarding_complete: true,
          plan_selected: true,
        };
      } else {
        session = await loginWithRbac(data.email, data.password, tenantSlug);
      }

      if (!session?.user?.email) {
        toast.error('Unexpected login response from server.');
        return;
      }

      clearLockout();

      const { user, role, tenant_id, permissions, plan } = session;
      const isB2b = isB2bRole(role);

      sessionStorage.setItem('pk_user', JSON.stringify(user));
      sessionStorage.setItem('pk_plan', plan);

      dispatch(setCredentials({
        user,
        plan,
        role,
        tenant_id,
        permissions,
        onboarding_complete: isB2b ? true : (session.onboarding_complete ?? true),
        plan_selected: isB2b ? true : (session.plan_selected ?? true),
      }));

      const displayName = user.first_name || user.name || 'there';
      toast.success(`Welcome back, ${displayName}!`);

      const onbStep = getOnbCookie();
      if (!isB2b && (!onbStep || onbStep === 'done')) {
        setOnbCookie('done');
      }

      router.push(getPostLoginPath(role, onbStep));
    } catch (err) {
      recordFailure();
      const detail = err.response?.data?.detail;
      const msg = err.message ?? (typeof detail === 'string' ? detail : null);
      toast.error(msg && msg !== 'Not Found' ? msg : 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="quirri-auth-wrap quirri-auth-wrap--centered">
      <div className="quirri-auth-panel">
        <div className="quirri-auth-card">
          <QuirriLogo />
          <h2>Sign in</h2>
          <p className="quirri-sub">
            {tenantSlug
              ? `Sign in to your ${tenantSlug} account.`
              : 'Welcome back — enter your credentials to continue.'}
          </p>

          {isLockedOut ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Lock size={32} className="text-red-500" />
              <p className="text-sm text-red-600 font-medium">
                Too many failed login attempts.
              </p>
              <p className="text-xs text-gray-500">
                Try again in {lockoutMinutes}m {String(lockoutSeconds).padStart(2, '0')}s
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col" noValidate>
              <div className="quirri-auth-field">
                <label htmlFor="email">Email address</label>
                <input
                  {...register('email')}
                  id="email"
                  type="email"
                  placeholder="admin@quirri.ai"
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="quirri-auth-field">
                <label htmlFor="password">Password</label>
                <PasswordInput
                  register={register('password')}
                  error={errors.password?.message}
                  inputClassName="w-full px-[14px] py-3 border border-[#dbe4ef] rounded-[10px] text-[13px] font-[inherit]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="quirri-btn quirri-btn-primary w-full mt-2 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Signing in…</>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

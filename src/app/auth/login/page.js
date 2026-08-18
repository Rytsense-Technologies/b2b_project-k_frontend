'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import QuirriLogo from '@/components/superadmin/QuirriLogo';
import PasswordInput from '@/components/auth/PasswordInput';
import { loginSchema } from '@/lib/validations';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/slices/authSlice';
import { loginWithRbac } from '@/lib/api/auth';
import { getPostLoginPath, isB2bRole } from '@/lib/auth/rbac';
import { setSessionCookie, setRoleCookie } from '@/lib/tokens';
import { ROLES, getPermissions } from '@/lib/permissions';

/** UI demo on Vercel before backend is wired — set NEXT_PUBLIC_DEV_BYPASS_AUTH=false when API is live */
const DEV_BYPASS_AUTH =
  process.env.NODE_ENV === 'development' ||
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' ||
  (process.env.VERCEL === '1' && process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH !== 'false');

function setOnbCookie(val) {
  document.cookie = `pk_onb=${val}; path=/; max-age=86400; SameSite=Lax`;
}

function getOnbCookie() {
  return document.cookie.split('; ').find((c) => c.startsWith('pk_onb='))?.split('=')[1];
}

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm(DEV_BYPASS_AUTH ? {} : { resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.search.includes('password=') || window.location.search.includes('email=')) {
      router.replace('/auth/login');
    }
  }, [router]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      let session;
      if (DEV_BYPASS_AUTH) {
        setSessionCookie();
        setRoleCookie(ROLES.SUPERADMIN);
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
        session = await loginWithRbac(data.email, data.password);
      }

      if (!session?.user?.email) {
        toast.error('Unexpected login response from server.');
        return;
      }

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
          <p className="quirri-sub">Welcome back — enter your credentials to continue.</p>

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
        </div>
      </div>
    </div>
  );
  
}


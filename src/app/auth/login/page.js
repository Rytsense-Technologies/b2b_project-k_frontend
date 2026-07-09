'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import Logo from '@/components/shared/Logo';
import PasswordInput from '@/components/auth/PasswordInput';
import { loginSchema } from '@/lib/validations';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/slices/authSlice';
import { loginWithRbac } from '@/lib/api/auth';
import { getPostLoginPath, isB2bRole } from '@/lib/auth/rbac';
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
  } = useForm({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.search.includes('password=') || window.location.search.includes('email=')) {
      router.replace('/auth/login');
    }
  }, [router]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const session = await loginWithRbac(data.email, data.password);
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

      const destination = getPostLoginPath(role, onbStep);
      router.push(destination);
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = err.message ?? (typeof detail === 'string' ? detail : null);
      toast.error(msg && msg !== 'Not Found' ? msg : 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-sm p-8 animate-fade-in">
        <div className="flex justify-center mb-6">
          <Logo size="md" />
        </div>

        <h2 className="text-center text-xl font-bold text-slate-800 mb-1">Welcome back</h2>
        <p className="text-center text-sm text-slate-500 mb-6">
          Sign in to{' '}
          <span className="font-semibold text-slate-700">Project K</span>
        </p>

        <form onSubmit={handleSubmit(onSubmit)} method="post" action="#" className="flex flex-col gap-4" noValidate>
          <div>
            <input
              {...register('email')}
              type="email"
              placeholder="Email address"
              className={`input-base ${errors.email ? 'error' : ''}`}
              autoComplete="email"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div>
            <PasswordInput
              register={register('password')}
              error={errors.password?.message}
            />
          </div>

          <div className="-mt-1">
            <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:underline font-medium">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-1 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Signing in…</>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-blue-600 font-medium hover:underline">
            Create one
          </Link>
          {/* {' '} */}
          {/* <span className="text-slate-400">(students)</span> */}
        </p>
      </div>
    </div>
  );
}

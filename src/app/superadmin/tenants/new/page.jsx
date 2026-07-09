'use client';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { tenantsApi } from '@/lib/api/superadmin/tenants';

const schema = z.object({
  name:       z.string().min(2, 'College name must be at least 2 characters'),
  adminEmail: z.string().email('Enter a valid admin email'),
  adminPhone: z.string().optional().or(z.literal('')),
  plan:       z.enum(['trial', 'standard', 'premium'], { required_error: 'Select a plan' }),
  maxUsers:   z.coerce.number().int().min(1, 'Must be at least 1 user').optional().or(z.literal('')),
});

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default function NewTenantPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values) =>
      tenantsApi.createTenant({
        name:        values.name,
        admin_email: values.adminEmail,
        admin_phone: values.adminPhone || undefined,
        plan:        values.plan,
        max_users:   values.maxUsers   || undefined,
      }),
    onSuccess: () => {
      toast.success('Tenant created successfully');
      router.push('/superadmin/tenants');
    },
    onError: (err) => {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to create tenant');
    },
  });

  return (
    <div className="animate-fade-in max-w-2xl">

      {/* ── Back link ── */}
      <Link
        href="/superadmin/tenants"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to Tenants
      </Link>

      <div className="card p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-1">New Tenant</h2>
        <p className="text-sm text-slate-500 mb-6">Onboard a new college or institution to the platform.</p>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-5">

          <Field label="College Name" required error={errors.name?.message}>
            <input
              {...register('name')}
              type="text"
              placeholder="e.g. Sri Ramanujan College of Engineering"
              className={`input-base ${errors.name ? 'error' : ''}`}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Admin Email" required error={errors.adminEmail?.message}>
              <input
                {...register('adminEmail')}
                type="email"
                placeholder="admin@college.edu"
                autoComplete="off"
                className={`input-base ${errors.adminEmail ? 'error' : ''}`}
              />
            </Field>

            <Field label="Admin Phone" error={errors.adminPhone?.message}>
              <input
                {...register('adminPhone')}
                type="tel"
                placeholder="+91 98765 43210"
                className={`input-base ${errors.adminPhone ? 'error' : ''}`}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Plan" required error={errors.plan?.message}>
              <select
                {...register('plan')}
                className={`input-base ${errors.plan ? 'error' : ''}`}
                defaultValue=""
              >
                <option value="" disabled>Select a plan…</option>
                <option value="trial">Trial</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
              </select>
            </Field>

            <Field label="Max Users" error={errors.maxUsers?.message}>
              <input
                {...register('maxUsers')}
                type="number"
                min={1}
                placeholder="e.g. 500"
                className={`input-base ${errors.maxUsers ? 'error' : ''}`}
              />
            </Field>
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center gap-3 pt-2">
            <Link
              href="/superadmin/tenants"
              className="btn-secondary flex-1 text-center py-2.5 text-sm"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-60"
              style={{ backgroundColor: '#2563eb' }}
            >
              {mutation.isPending
                ? <><Loader2 size={15} className="animate-spin" /> Creating…</>
                : 'Create Tenant'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

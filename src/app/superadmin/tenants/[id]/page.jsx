'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Users, Video, Clock,
  Loader2, Building2,
} from 'lucide-react';
import { tenantsApi } from '@/lib/api/superadmin/tenants';

// ── Schema (edit form) ────────────────────────────────────────────────────────

const editSchema = z.object({
  name:           z.string().min(2, 'College name must be at least 2 characters'),
  adminEmail:     z.string().email('Enter a valid admin email'),
  adminPhone:     z.string().optional().or(z.literal('')),
  plan:           z.enum(['trial', 'standard', 'premium']),
  maxUsers:       z.coerce.number().int().min(1).optional().or(z.literal('')),
  contentEngine:  z.boolean().optional(),
  avatarMode:     z.boolean().optional(),
  bulkUpload:     z.boolean().optional(),
});

// ── Small helpers ─────────────────────────────────────────────────────────────

const STATUS_STYLE = {
  active:    { label: 'Active',    bg: '#f0fdf4', color: '#15803d' },
  suspended: { label: 'Suspended', bg: '#fef2f2', color: '#b91c1c' },
  trial:     { label: 'Trial',     bg: '#fefce8', color: '#a16207' },
};

function StatusBadge({ value }) {
  const s = STATUS_STYLE[value?.toLowerCase()] ?? { label: value ?? '—', bg: '#f1f5f9', color: '#475569' };
  return (
    <span
      className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}18` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-slate-800 tabular-nums mt-0.5">{value ?? '—'}</p>
      </div>
    </div>
  );
}

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

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
          checked ? 'bg-[#2563eb]' : 'bg-slate-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Users', 'Settings'];

// ── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ tenant }) {
  const rows = [
    { label: 'College Name',   value: tenant.name },
    { label: 'Admin Email',    value: tenant.admin_email },
    { label: 'Admin Phone',    value: tenant.admin_phone || '—' },
    { label: 'Plan',           value: <span className="capitalize">{tenant.plan}</span> },
    { label: 'Status',         value: <StatusBadge value={tenant.status} /> },
    { label: 'Max Users',      value: tenant.max_users?.toLocaleString() || 'Unlimited' },
    { label: 'Created',        value: tenant.created_at ? new Date(tenant.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
    { label: 'Last Active',    value: tenant.last_active_at ? new Date(tenant.last_active_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
  ];

  return (
    <div className="card divide-y divide-slate-100">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex items-center justify-between px-5 py-3.5">
          <span className="text-sm text-slate-500 w-36 flex-shrink-0">{label}</span>
          <span className="text-sm font-medium text-slate-800 text-right">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────

function UsersTab({ tenant }) {
  return (
    <div className="card p-6 text-center">
      <Users size={32} className="mx-auto text-slate-300 mb-3" />
      <p className="text-sm font-medium text-slate-600">
        {tenant.user_count ?? 0} users in this tenant
      </p>
      <p className="text-xs text-slate-400 mt-1 mb-4">
        Manage individual users from the Users section.
      </p>
      <Link
        href={`/superadmin/users?tenantId=${tenant.id}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-lg transition-colors"
        style={{ backgroundColor: '#2563eb' }}
      >
        View All Users →
      </Link>
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────

function SettingsTab({ tenant, onSaved }) {
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name:          tenant.name        ?? '',
      adminEmail:    tenant.admin_email ?? '',
      adminPhone:    tenant.admin_phone ?? '',
      plan:          tenant.plan        ?? 'trial',
      maxUsers:      tenant.max_users   ?? '',
      contentEngine: tenant.features?.content_engine ?? false,
      avatarMode:    tenant.features?.avatar_mode    ?? false,
      bulkUpload:    tenant.features?.bulk_upload    ?? false,
    },
  });

  const [contentEngine, avatarMode, bulkUpload] = watch(['contentEngine', 'avatarMode', 'bulkUpload']);

  const mutation = useMutation({
    mutationFn: (values) =>
      tenantsApi.updateTenant(tenant.id, {
        name:        values.name,
        admin_email: values.adminEmail,
        admin_phone: values.adminPhone || undefined,
        plan:        values.plan,
        max_users:   values.maxUsers   || undefined,
        features: {
          content_engine: values.contentEngine,
          avatar_mode:    values.avatarMode,
          bulk_upload:    values.bulkUpload,
        },
      }),
    onSuccess: () => {
      toast.success('Tenant updated');
      qc.invalidateQueries({ queryKey: ['superadmin', 'tenants'] });
      onSaved?.();
    },
    onError: (err) => {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to save changes');
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-5">

      {/* Basic fields */}
      <div className="card p-5 space-y-5">
        <h3 className="text-sm font-semibold text-slate-700">Basic Information</h3>

        <Field label="College Name" required error={errors.name?.message}>
          <input {...register('name')} type="text" className={`input-base ${errors.name ? 'error' : ''}`} />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Admin Email" required error={errors.adminEmail?.message}>
            <input {...register('adminEmail')} type="email" className={`input-base ${errors.adminEmail ? 'error' : ''}`} />
          </Field>
          <Field label="Admin Phone" error={errors.adminPhone?.message}>
            <input {...register('adminPhone')} type="tel" className={`input-base ${errors.adminPhone ? 'error' : ''}`} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Plan" required error={errors.plan?.message}>
            <select {...register('plan')} className={`input-base ${errors.plan ? 'error' : ''}`}>
              <option value="trial">Trial</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </select>
          </Field>
          <Field label="Max Users" error={errors.maxUsers?.message}>
            <input {...register('maxUsers')} type="number" min={1} className={`input-base ${errors.maxUsers ? 'error' : ''}`} />
          </Field>
        </div>
      </div>

      {/* Feature flags */}
      <div className="card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Feature Flags</h3>
        <ToggleRow
          label="Content Engine"
          description="Enable AI content generation from uploaded PDF / PPT materials"
          checked={!!contentEngine}
          onChange={(v) => setValue('contentEngine', v)}
        />
        <ToggleRow
          label="Avatar Mode"
          description="Allow avatar-based video interviews (requires GPU — higher cost per session)"
          checked={!!avatarMode}
          onChange={(v) => setValue('avatarMode', v)}
        />
        <ToggleRow
          label="Bulk Upload"
          description="Allow college admins to import students via CSV (max 100 per batch)"
          checked={!!bulkUpload}
          onChange={(v) => setValue('bulkUpload', v)}
        />
      </div>

      <button
        type="submit"
        disabled={mutation.isPending}
        className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-60"
        style={{ backgroundColor: '#2563eb' }}
      >
        {mutation.isPending
          ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
          : 'Save Changes'
        }
      </button>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TenantDetailPage() {
  const { id } = useParams();
  const router  = useRouter();
  const [activeTab, setActiveTab] = useState('Overview');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['superadmin', 'tenant', id],
    queryFn:  async () => {
      const res = await tenantsApi.getTenant(id);
      return res.data?.tenant ?? res.data;
    },
    staleTime: 30_000,
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-5">
        <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map((i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="card p-10 text-center">
        <Building2 size={32} className="mx-auto text-slate-300 mb-3" />
        <p className="text-sm text-slate-500">Tenant not found.</p>
        <Link href="/superadmin/tenants" className="text-sm text-[#2563eb] mt-2 inline-block">
          ← Back to Tenants
        </Link>
      </div>
    );
  }

  const tenant = data;
  const lastActive = tenant.last_active_at
    ? new Date(tenant.last_active_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Never';

  return (
    <div className="animate-fade-in space-y-5">

      {/* ── Back + title ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/superadmin/tenants"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-2 transition-colors"
          >
            <ArrowLeft size={14} />
            Tenants
          </Link>
          <h2 className="text-xl font-bold text-slate-800">{tenant.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge value={tenant.status} />
            <span className="text-xs text-slate-400 capitalize">{tenant.plan} plan</span>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total Users"      value={(tenant.user_count ?? 0).toLocaleString()} color="#2563eb" />
        <StatCard icon={Video} label="Total Interviews" value={(tenant.interview_count ?? 0).toLocaleString()} color="#0984e3" />
        <StatCard icon={Clock} label="Last Active"      value={lastActive} color="#00b894" />
      </div>

      {/* ── Tabs ── */}
      <div>
        <div className="flex gap-1 border-b border-slate-200 mb-5">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-[#2563eb] text-[#2563eb]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Overview'  && <OverviewTab tenant={tenant} />}
        {activeTab === 'Users'     && <UsersTab    tenant={tenant} />}
        {activeTab === 'Settings'  && <SettingsTab tenant={tenant} onSaved={() => setActiveTab('Overview')} />}
      </div>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2, User, Lock, Bell, ShieldCheck } from 'lucide-react';
import { useAppDispatch } from '@/store/hooks';
import { setUser } from '@/store/slices/authSlice';
import { useAuth } from '@/hooks/useAuth';
import PasswordInput from '@/components/auth/PasswordInput';
import api from '@/lib/axios';
import { SETTINGS_TAB_PANEL_MIN_H } from '@/lib/constants/theme';

const ACCENT = '#2563eb';

// ── Schemas ───────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName:  z.string().min(1, 'Last name is required'),
  email:     z.string().email('Enter a valid email address'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword:     z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path:    ['confirmPassword'],
});

// ── Tiny helpers ──────────────────────────────────────────────────────────────

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

function SaveButton({ loading, accent, label = 'Save Changes', className = '' }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      style={{ backgroundColor: accent }}
    >
      {loading ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : label}
    </button>
  );
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0"
      style={{ backgroundColor: checked ? ACCENT : '#e2e8f0' }}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  );
}

function NotifRow({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  );
}

// ── Profile tab ───────────────────────────────────────────────────────────────

function ProfileTab({ user, dispatch }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.first_name ?? user?.name?.split(' ')?.[0] ?? '',
      lastName:  user?.last_name  ?? user?.name?.split(' ')?.[1] ?? '',
      email:     user?.email      ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values) =>
      api.patch('/superadmin/profile', {
        first_name: values.firstName,
        last_name:  values.lastName,
        email:      values.email,
      }),
    onSuccess: (res, values) => {
      toast.success('Profile updated');
      dispatch(setUser({
        first_name: values.firstName,
        last_name:  values.lastName,
        name:       `${values.firstName} ${values.lastName}`,
        email:      values.email,
      }));
    },
    onError: (err) => {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to update profile');
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-5 w-full h-full flex flex-col">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="First Name" required error={errors.firstName?.message}>
          <input {...register('firstName')} type="text"
            className={`input-base ${errors.firstName ? 'error' : ''}`} />
        </Field>
        <Field label="Last Name" required error={errors.lastName?.message}>
          <input {...register('lastName')} type="text"
            className={`input-base ${errors.lastName ? 'error' : ''}`} />
        </Field>
      </div>
      <Field label="Email Address" required error={errors.email?.message}>
        <input {...register('email')} type="email" autoComplete="off"
          className={`input-base ${errors.email ? 'error' : ''}`} />
      </Field>
      <SaveButton loading={mutation.isPending} accent={ACCENT} className="mt-auto" />
    </form>
  );
}

// ── Security tab ──────────────────────────────────────────────────────────────

function SecurityTab() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  const mutation = useMutation({
    mutationFn: (values) =>
      api.patch('/superadmin/profile/password', {
        current_password: values.currentPassword,
        new_password:     values.newPassword,
      }),
    onSuccess: () => {
      toast.success('Password changed successfully');
      reset();
    },
    onError: (err) => {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to change password');
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-5 w-full h-full flex flex-col">
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 mb-2">
        <ShieldCheck size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500">
          Use a strong password with at least 8 characters, a mix of upper/lowercase, numbers, and symbols.
        </p>
      </div>
      <Field label="Current Password" required>
        <PasswordInput register={register('currentPassword')}
          error={errors.currentPassword?.message} placeholder="Current password"
          autoComplete="current-password" />
      </Field>
      <Field label="New Password" required>
        <PasswordInput register={register('newPassword')}
          error={errors.newPassword?.message} placeholder="New password (min 8 chars)"
          autoComplete="new-password" />
      </Field>
      <Field label="Confirm New Password" required>
        <PasswordInput register={register('confirmPassword')}
          error={errors.confirmPassword?.message} placeholder="Confirm new password"
          autoComplete="new-password" />
      </Field>
      <SaveButton loading={mutation.isPending} accent={ACCENT} label="Change Password" className="mt-auto" />
    </form>
  );
}

// ── Notifications tab ─────────────────────────────────────────────────────────

const SUPERADMIN_NOTIFS = [
  { key: 'new_tenant',        label: 'New Tenant Registered',  description: 'Get notified when a new institution joins the platform'  },
  { key: 'user_threshold',    label: 'User Count Thresholds',  description: 'Alert when a tenant exceeds or approaches its user limit' },
  { key: 'error_alerts',      label: 'Error Alerts',           description: 'Critical system errors and failed operations'             },
];

function NotificationsTab() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['superadmin', 'notification-prefs'],
    queryFn:  async () => { const r = await api.get('/superadmin/notifications/preferences'); return r.data; },
    staleTime: 120_000,
    retry: false,
    // Silently use defaults if endpoint not available
    placeholderData: { new_tenant: true, user_threshold: true, error_alerts: true },
  });

  const [prefs, setPrefs] = useState(null);
  const effective = prefs ?? data ?? {};

  const toggle = (key) => setPrefs((prev) => ({ ...effective, ...(prev ?? {}), [key]: !effective[key] }));

  const mutation = useMutation({
    mutationFn: () => api.patch('/superadmin/notifications/preferences', effective),
    onSuccess: () => {
      toast.success('Notification preferences saved');
      qc.invalidateQueries({ queryKey: ['superadmin', 'notification-prefs'] });
      setPrefs(null);
    },
    onError: () => toast.error('Failed to save preferences'),
  });

  if (isLoading) {
    return (
      <div className="space-y-3 w-full h-full flex flex-col">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse flex-shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full h-full flex flex-col">
      {SUPERADMIN_NOTIFS.map(({ key, label, description }) => (
        <NotifRow key={key} label={label} description={description}
          checked={!!effective[key]} onChange={() => toggle(key)} />
      ))}
      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || prefs === null}
        className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-60 mt-auto self-start"
        style={{ backgroundColor: ACCENT }}
      >
        {mutation.isPending ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : 'Save Preferences'}
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'Profile',       Icon: User   },
  { id: 'Security',      Icon: Lock   },
  { id: 'Notifications', Icon: Bell   },
];

export default function SuperAdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('Profile');
  const dispatch = useAppDispatch();
  const { user }  = useAuth();

  return (
    <div className="animate-fade-in w-full">
      <div className="card overflow-hidden w-full">
        {/* Tab bar */}
        <div className="flex border-b border-slate-200 bg-slate-50/50">
          {TABS.map(({ id, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === id
                  ? 'border-[#2563eb] text-[#2563eb]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={15} />
              {id}
            </button>
          ))}
        </div>

        {/* Tab content — fixed height locked to Security tab */}
        <div className="p-6">
          <div
            className="w-full flex flex-col"
            style={{ minHeight: SETTINGS_TAB_PANEL_MIN_H }}
          >
            {activeTab === 'Profile'       && <ProfileTab       user={user} dispatch={dispatch} />}
            {activeTab === 'Security'      && <SecurityTab />}
            {activeTab === 'Notifications' && <NotificationsTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

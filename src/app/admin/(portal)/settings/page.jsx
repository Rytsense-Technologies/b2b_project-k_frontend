'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import PasswordInput from '@/components/auth/PasswordInput';
import { QuirriRHFField, QuirriField } from '@/components/superadmin/quirri-ui';
import { settingsApi, fetchData } from '@/lib/api/superadmin/modules';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch } from '@/store/hooks';
import { setUser } from '@/store/slices/authSlice';
import {
  settingsProfileSchema,
  settingsPasswordSchema,
  FIELD_RULES,
} from '@/lib/validation';

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
  } = useForm({
    resolver: zodResolver(settingsProfileSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      role: 'College Admin',
    },
    mode: 'onBlur',
  });

  const {
    register: registerPw,
    handleSubmit: handlePwSubmit,
    reset: resetPw,
    formState: { errors: pwErrors },
  } = useForm({
    resolver: zodResolver(settingsPasswordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchData(() => settingsApi.get());
        if (cancelled) return;
        reset({
          first_name: data?.first_name ?? user?.first_name ?? '',
          last_name: data?.last_name ?? user?.last_name ?? '',
          email: data?.email ?? user?.email ?? '',
          phone: data?.phone_number ?? data?.phone ?? data?.mobile ?? user?.phone ?? '',
          role: 'College Admin',
        });
        if (data?.college_name || data?.university_name || data?.tenant_name) {
          dispatch(setUser({
            college_name: data?.college_name ?? data?.tenant_name ?? user?.college_name,
            university_name: data?.university_name ?? user?.university_name,
            tenant_name: data?.tenant_name ?? data?.college_name ?? user?.tenant_name,
          }));
        }
      } catch (err) {
        if (!cancelled) {
          reset({
            first_name: user?.first_name ?? '',
            last_name: user?.last_name ?? '',
            email: user?.email ?? '',
            phone: user?.phone ?? '',
            role: 'College Admin',
          });
          toast.error(err?.message || 'Could not load settings');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once from /auth/me on mount
  }, [reset, dispatch]);

  const onSave = handleSubmit(async (values) => {
    setSaving(true);
    try {
      await fetchData(() => settingsApi.update({
        first_name: values.first_name,
        last_name: values.last_name,
        phone_number: values.phone,
      }));
      dispatch(setUser({
        first_name: values.first_name,
        last_name: values.last_name,
        name: [values.first_name, values.last_name].filter(Boolean).join(' '),
      }));
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  });

  const onPassword = handlePwSubmit(async (values) => {
    setPwSaving(true);
    try {
      await fetchData(() => settingsApi.changePassword(values));
      toast.success('Password updated');
      setPwOpen(false);
      resetPw({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err?.message || 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  });

  return (
    <div className="animate-fade-in">
      <div className="section-head">
        <div>
          <div className="t">Settings</div>
          <div className="d">Your own profile. Role and institution are not self-editable.</div>
        </div>
      </div>

      <div className="card card-p" style={{ maxWidth: 640 }}>
        {loading ? <p style={{ color: 'var(--muted)', marginBottom: 12 }}>Loading settings…</p> : null}
        <form onSubmit={onSave} noValidate>
          <div className="grid2">
            <QuirriRHFField
              control={control}
              name="first_name"
              fieldType="personName"
              label="First name"
            />
            <QuirriRHFField
              control={control}
              name="last_name"
              fieldType="personName"
              label="Last name"
            />
          </div>
          <QuirriRHFField
            control={control}
            name="email"
            fieldType="email"
            label="Email address"
            hint="Email change needs a separate re-verification flow — not available yet."
            disabled
            full
          />
          <QuirriRHFField
            control={control}
            name="phone"
            fieldType="phone"
            label="Phone number"
            full
          />
          <QuirriField
            label="Role"
            hint="Roles are assigned by Super Admin and cannot be changed here."
          >
            <input value="College Admin" disabled style={{ background: 'var(--line-soft)', color: 'var(--muted)' }} readOnly />
          </QuirriField>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button className="btn btn-primary" type="submit" disabled={saving || loading}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setPwOpen(true)}>
              Change password
            </button>
          </div>
        </form>
      </div>

      <QuirriModal
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        title="Change password"
        crumb="Requires your current password, then signs out all other devices."
        footer={(
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setPwOpen(false)}>Cancel</button>
            <div className="right">
              <button type="button" className="btn btn-primary" onClick={onPassword} disabled={pwSaving}>
                {pwSaving ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </>
        )}
      >
        <form onSubmit={onPassword} noValidate>
          <QuirriField label="Current password" htmlFor="ca_current_password" error={pwErrors.current_password?.message}>
            <PasswordInput
              id="ca_current_password"
              register={registerPw('current_password')}
              autoComplete="current-password"
              maxLength={FIELD_RULES.password.max}
            />
          </QuirriField>
          <QuirriField label="New password" htmlFor="ca_new_password" error={pwErrors.new_password?.message}>
            <PasswordInput
              id="ca_new_password"
              register={registerPw('new_password')}
              autoComplete="new-password"
              maxLength={FIELD_RULES.password.max}
            />
          </QuirriField>
          <QuirriField label="Confirm new password" htmlFor="ca_confirm_password" error={pwErrors.confirm_password?.message}>
            <PasswordInput
              id="ca_confirm_password"
              register={registerPw('confirm_password')}
              autoComplete="new-password"
              maxLength={FIELD_RULES.password.max}
            />
          </QuirriField>
        </form>
      </QuirriModal>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import PasswordInput from '@/components/auth/PasswordInput';
import { QuirriRHFField, QuirriField } from '@/components/superadmin/quirri-ui';
import { settingsApi, fetchData } from '@/lib/api/superadmin/modules';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import {
  settingsProfileSchema,
  settingsPasswordSchema,
  FIELD_RULES,
} from '@/lib/validation';

function formatRoleLabel(role) {
  const r = String(role || '').toLowerCase();
  if (r === 'superadmin' || r.includes('super')) return 'Super Admin';
  if (r === 'college_admin' || r.includes('college')) return 'College Admin';
  if (r === 'faculty') return 'Faculty';
  if (r === 'student') return 'Student';
  return role || '—';
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [roleLabel, setRoleLabel] = useState('—');

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
      role: '',
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

  const loadProfile = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchData(() => settingsApi.get());
      const label = formatRoleLabel(data?.role);
      setRoleLabel(label);
      reset({
        first_name: data?.first_name ?? '',
        last_name: data?.last_name ?? '',
        email: data?.email ?? '',
        phone: data?.phone_number ?? data?.phone ?? data?.mobile ?? '',
        role: label,
      });
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Could not load your profile.'));
      setRoleLabel('—');
      reset({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role: '',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const onSave = handleSubmit(async (values) => {
    if (loadError) return;
    setSaving(true);
    try {
      await fetchData(() => settingsApi.update({
        first_name: values.first_name,
        last_name: values.last_name,
        phone_number: values.phone,
      }));
      toast.success('Settings saved');
      await loadProfile();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  });

  const onPassword = handlePwSubmit(async (values) => {
    setPwSaving(true);
    try {
      await fetchData(() => settingsApi.changePassword(values));
      toast.success('Password updated. Other sessions were signed out.');
      setPwOpen(false);
      resetPw({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to change password'));
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

      {loadError ? (
        <div className="notice err" style={{ marginBottom: 12, maxWidth: 640 }}>
          <div>
            <b>Could not load settings</b>
            {loadError}
            <div style={{ marginTop: 10 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={loadProfile}>
                Try again
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card card-p" style={{ maxWidth: 640 }}>
        {loading ? <p style={{ color: 'var(--muted)', marginBottom: 12 }}>Loading settings…</p> : null}
        <form onSubmit={onSave} noValidate>
          <fieldset disabled={Boolean(loadError) || loading} style={{ border: 0, padding: 0, margin: 0 }}>
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
              hint="Roles are assigned by an administrator and cannot be changed here."
            >
              <input
                value={roleLabel}
                disabled
                style={{ background: 'var(--line-soft)', color: 'var(--muted)' }}
                readOnly
              />
            </QuirriField>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button className="btn btn-primary" type="submit" disabled={saving || loading || Boolean(loadError)}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setPwOpen(true)}
                disabled={Boolean(loadError) || loading}
              >
                Change password
              </button>
            </div>
          </fieldset>
        </form>
      </div>

      <QuirriModal
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        title="Change password"
        crumb="Requires your current password. The server revokes other active sessions for this account."
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
          <QuirriField label="Current password" htmlFor="current_password" error={pwErrors.current_password?.message}>
            <PasswordInput
              id="current_password"
              register={registerPw('current_password')}
              autoComplete="current-password"
              maxLength={FIELD_RULES.password.max}
            />
          </QuirriField>
          <QuirriField label="New password" htmlFor="new_password" error={pwErrors.new_password?.message}>
            <PasswordInput
              id="new_password"
              register={registerPw('new_password')}
              autoComplete="new-password"
              maxLength={FIELD_RULES.password.max}
            />
          </QuirriField>
          <QuirriField label="Confirm new password" htmlFor="confirm_password" error={pwErrors.confirm_password?.message}>
            <PasswordInput
              id="confirm_password"
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

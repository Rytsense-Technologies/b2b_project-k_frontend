'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import PasswordInput from '@/components/auth/PasswordInput';
import { QuirriRHFField, QuirriField } from '@/components/superadmin/quirri-ui';
import {
  ModulePage,
  Panel,
  InfoList,
  Icon,
  SectionState,
  initials,
} from '@/components/shared/module-ui';
import { settingsApi, fetchData } from '@/lib/api/superadmin/modules';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import {
  settingsProfileSchema,
  settingsPasswordSchema,
  FIELD_RULES,
} from '@/lib/validation';

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security' },
];

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
  const [tab, setTab] = useState('profile');

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

  const [firstName, lastName, email] = useWatch({ control, name: ['first_name', 'last_name', 'email'] });
  const fullName = [firstName, lastName].filter(Boolean).join(' ');

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

  const accountHead = (
    <div className="pm-account sa-account-h">
      <span className="pm-av-lg">{initials(fullName || email || '', 'S')}</span>
      <div className="sa-account-who">
        <b>{loading ? 'Loading…' : fullName || 'Your profile'}</b>
        <small>{email || '—'}</small>
      </div>
      <span className="sp-pill sp-pill--teal"><Icon name="shield" size={13} /> {roleLabel}</span>
    </div>
  );

  return (
    <ModulePage className="sa-page sa-settings">
      <div className="tabs" role="tablist" aria-label="Settings sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loadError ? (
        <SectionState
          tone="err"
          title="Could not load settings"
          action={(
            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={loadProfile}>
              <Icon name="refresh" size={16} /> Try again
            </button>
          )}
        >
          {loadError}
        </SectionState>
      ) : null}

      <div className="pm-settings">
        {tab === 'profile' ? (
          <section className="sp-panel sa-account">
            {accountHead}
            <form onSubmit={onSave} noValidate className="sa-account-b">
              <fieldset disabled={Boolean(loadError) || loading} className="sa-fieldset">
                <div className="sa-account-sec">
                  <h3>Personal details</h3>
                  <p>Your name and phone number. Email and role are managed by Quirri.</p>
                </div>
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
                <div className="grid2">
                  <QuirriRHFField
                    control={control}
                    name="phone"
                    fieldType="phone"
                    label="Phone number"
                  />
                  <QuirriField
                    label="Role"
                    hint="Assigned by an administrator. Cannot be changed here."
                  >
                    <input
                      value={roleLabel}
                      disabled
                      className="sa-locked"
                      readOnly
                    />
                  </QuirriField>
                </div>
              </fieldset>
              <div className="sa-account-f">
                <button
                  className="sd-btn sd-btn--ghost"
                  type="button"
                  onClick={() => setPwOpen(true)}
                  disabled={Boolean(loadError) || loading}
                >
                  <Icon name="key" size={16} /> Change password
                </button>
                <button className="sd-btn sd-btn--amber" type="submit" disabled={saving || loading || Boolean(loadError)}>
                  <Icon name="tick" size={16} />
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="sp-panel sa-account">
            {accountHead}
            <div className="sa-account-b">
              <div className="sa-account-sec">
                <h3>Sign-in and security</h3>
                <p>Keep your account safe. Changing your password signs you out everywhere else.</p>
              </div>
              <div className="sa-sec-row">
                <span className="sp-row-ic"><Icon name="key" size={18} /></span>
                <div className="sp-row-main">
                  <b>Password</b>
                  <div className="sp-row-meta"><span>Requires your current password.</span></div>
                </div>
                <button
                  className="sd-btn sd-btn--amber sd-btn--sm"
                  type="button"
                  onClick={() => setPwOpen(true)}
                  disabled={Boolean(loadError) || loading}
                >
                  Change password
                </button>
              </div>
              <div className="sa-sec-row">
                <span className="sp-row-ic"><Icon name="mail" size={18} /></span>
                <div className="sp-row-main">
                  <b>Sign-in email</b>
                  <div className="sp-row-meta"><span>{email || '—'}</span></div>
                </div>
                <span className="sp-pill">Locked</span>
              </div>
            </div>
          </section>
        )}

        <Panel title="About your account" sub="What you can and cannot change here.">
          <InfoList
            items={[
              { label: 'Role', value: roleLabel },
              { label: 'Access', value: 'All institutions' },
              { label: 'Email', value: email, full: true },
            ]}
          />
          <ul className="sa-side-list">
            <li><Icon name="tick" size={16} /> Name and phone number are yours to edit.</li>
            <li><Icon name="lock" size={16} /> Role and institution are not self-editable.</li>
            <li><Icon name="shield" size={16} /> A password change signs out your other sessions.</li>
          </ul>
        </Panel>
      </div>

      <QuirriModal
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        title="Change password"
        crumb="Requires your current password. The server revokes other active sessions for this account."
        footer={(
          <>
            <button type="button" className="sd-btn sd-btn--ghost" onClick={() => setPwOpen(false)}>Cancel</button>
            <div className="right">
              <button type="button" className="sd-btn sd-btn--amber" onClick={onPassword} disabled={pwSaving}>
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
    </ModulePage>
  );
}

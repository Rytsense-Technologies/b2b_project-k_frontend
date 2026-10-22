'use client';

import { useEffect, useState } from 'react';
import { useTabParam } from '@/hooks/useUrlState';
import { useForm } from 'react-hook-form';
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
import { titleCase } from '@/lib/student/learning';
import {
  settingsProfileSchema,
  settingsPasswordSchema,
  FIELD_RULES,
  formatIndianPhone,
} from '@/lib/validation';

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security' },
];

function formatRoleLabel(role) {
  const r = String(role || '').toLowerCase();
  if (r === 'superadmin' || r.includes('super')) return 'Super Admin';
  if (r === 'college_admin' || r.includes('college')) return 'College Admin';
  if (r === 'hod') return 'HOD';
  if (r === 'faculty') return 'Faculty';
  if (r === 'student') return 'Student';
  return role || '—';
}

/**
 * Self-service account page (profile + password) shared by every portal.
 * Role and institution are shown read-only; `/auth/me` is the source.
 * `extraTabs` = [{ id, label, render: () => node }] adds portal-specific tabs after Security
 * (Student: Notifications).
 */
export default function AccountSettings({ extraTabs = [] }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [roleLabel, setRoleLabel] = useState('—');
  const [access, setAccess] = useState('—');
  // Tab in ?tab= so Back returns to the previous tab and links can open Security directly.
  const tabs = [...TABS, ...extraTabs];
  const [tab, setTab] = useTabParam(tabs.map((t) => t.id), 'profile');
  const extra = extraTabs.find((t) => t.id === tab);
  // What the server has; the card and side panel show this, not the unsaved draft.
  const [saved, setSaved] = useState({ first_name: '', last_name: '', email: '', phone: '' });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isDirty },
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

  // Save stays off while a required name is empty (last name counts once the account has one).
  const [wFirst, wLast] = watch(['first_name', 'last_name']);
  const missingName = !String(wFirst || '').trim() || (Boolean(String(saved.last_name || '').trim()) && !String(wLast || '').trim());

  // Stored as typed; shown title-cased like the sidebar.
  const fullName = titleCase([saved.first_name, saved.last_name].filter(Boolean).join(' '));
  const { email } = saved;

  const {
    register: registerPw,
    handleSubmit: handlePwSubmit,
    reset: resetPw,
    setError: setPwError,
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
      const raw = await fetchData(() => settingsApi.get());
      // GET /auth/me answers { user: {...} }; PATCH answers the user itself.
      const data = raw?.user ?? raw;
      const role = data?.role ?? raw?.role ?? raw?.user_type;
      const label = formatRoleLabel(role);
      setRoleLabel(label);
      setAccess(String(role || '').toLowerCase() === 'superadmin'
        ? 'All institutions'
        : [data?.tenant_name, data?.department_name || data?.department].filter(Boolean).join(' · ') || '—');
      const profile = {
        first_name: data?.first_name ?? '',
        last_name: data?.last_name ?? '',
        email: data?.email ?? '',
        phone: formatIndianPhone(data?.phone_number ?? data?.phone ?? data?.mobile ?? ''),
      };
      setSaved(profile);
      reset({ ...profile, role: label });
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
    if (loadError || missingName) return;
    setSaving(true);
    try {
      await fetchData(() => settingsApi.update({
        first_name: values.first_name,
        last_name: values.last_name,
        phone_number: values.phone,
      }));
      toast.success('Your changes are saved.');
      await loadProfile();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save your changes. Please try again.'));
    } finally {
      setSaving(false);
    }
  });

  const onPassword = handlePwSubmit(async (values) => {
    setPwSaving(true);
    try {
      await fetchData(() => settingsApi.changePassword(values));
      toast.success("Password updated. You've been signed out on your other devices.");
      setPwOpen(false);
      resetPw({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      const message = apiErrorMessage(err, 'Could not change your password. Please try again.');
      // Show a wrong current password on the field itself, not only in a toast.
      if (/current password/i.test(message)) setPwError('current_password', { type: 'server', message });
      toast.error(message);
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
        {tabs.map((t) => (
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

      {extra ? extra.render() : null}

      <div className="pm-settings" style={extra ? { display: 'none' } : undefined}>
        {tab === 'profile' ? (
          <section className="sp-panel sa-account">
            {accountHead}
            <form onSubmit={onSave} noValidate className="sa-account-b">
              <fieldset disabled={Boolean(loadError) || loading} className="sa-fieldset">
                <div className="sa-account-sec">
                  <h3>Personal details</h3>
                  <p>Your name and phone number. Your email and role are managed by your administrator.</p>
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
                  hint="Contact your administrator to change your email."
                  disabled
                  full
                />
                <div className="grid2">
                  <QuirriRHFField
                    control={control}
                    name="phone"
                    fieldType="phone"
                    label="Phone number"
                    hint="Indian mobile number. +91 is added for you."
                    placeholder="+91 98765 43210"
                  />
                  <QuirriField
                    label="Role"
                    htmlFor="settings-role"
                    hint="Managed by your administrator."
                  >
                    <input
                      id="settings-role"
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
                <button className="sd-btn sd-btn--amber" type="submit" disabled={!isDirty || missingName || saving || loading || Boolean(loadError)}>
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
                <p>Keep your account safe with a strong password you do not use anywhere else.</p>
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

        {/* Students: role / email / phone already show in the header and the form — no repeat card. */}
        {roleLabel === 'Student' ? null : (
        <Panel title="About your account" sub="What you can and cannot change here.">
          <InfoList
            items={[
              { label: 'Role', value: roleLabel },
              { label: 'Access', value: access },
              { label: 'Email', value: email || '—', full: true },
              { label: 'Phone', value: saved.phone && saved.phone !== '+91' ? saved.phone : 'Not added', full: true },
            ]}
          />
          <ul className="sa-side-list">
            <li><Icon name="tick" size={16} /> Name and phone number are yours to edit.</li>
            <li><Icon name="lock" size={16} /> Your email, role and institution are managed by your administrator.</li>
            <li><Icon name="shield" size={16} /> Changing your password signs you out on your other devices.</li>
          </ul>
        </Panel>
        )}
      </div>

      <QuirriModal
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        title="Change password"
        crumb="Enter your current password, then choose a new one. You'll be signed out on your other devices."
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

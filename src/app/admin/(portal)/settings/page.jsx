'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import PasswordInput from '@/components/auth/PasswordInput';
import { QuirriRHFField, QuirriField } from '@/components/superadmin/quirri-ui';
import {
  Icon,
  Panel,
  InfoList,
  SectionState,
  initials,
} from '@/components/shared/module-ui';
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

  const displayName = user?.name
    || [user?.first_name, user?.last_name].filter(Boolean).join(' ')
    || 'College admin';
  const collegeName = user?.college_name || user?.tenant_name || null;

  return (
    <div className="animate-fade-in sp pm-page ad-page">
      <div className="tabs" role="tablist" aria-label="Settings sections">
        {[
          { id: 'profile', label: 'Profile' },
          { id: 'security', label: 'Security' },
        ].map((t) => (
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

      {tab === 'profile' ? (
        <div className="pm-settings">
          <section className="sp-panel ad-set-card" aria-label="Profile">
            <div className="ad-set-h">
              <div className="pm-account">
                <span className="pm-av-lg" aria-hidden="true">{initials(displayName, 'C')}</span>
                <div>
                  <b>{displayName}</b>
                  <small>{user?.email || 'College admin account'}</small>
                </div>
              </div>
              <span className="sp-pill sp-pill--teal">College admin</span>
            </div>

            <div className="ad-set-b">
              {loading ? <SectionState title="Loading settings…" /> : null}
              <form onSubmit={onSave} noValidate>
                <div className="ad-set-sec">
                  <h3>Personal details</h3>
                  <p>Your name and phone number as other people in your college see them.</p>
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
                  <QuirriRHFField
                    control={control}
                    name="email"
                    fieldType="email"
                    label="Email address"
                    hint="Changing your email needs a separate verification step — not available yet."
                    disabled
                  />
                  <QuirriRHFField
                    control={control}
                    name="phone"
                    fieldType="phone"
                    label="Phone number"
                  />
                  <QuirriField
                    label="Role"
                    hint="Roles are assigned by Super Admin and cannot be changed here."
                    full
                  >
                    <input value="College Admin" disabled readOnly />
                  </QuirriField>
                </div>
                <div className="ad-set-foot">
                  <button className="sd-btn sd-btn--amber" type="submit" disabled={saving || loading}>
                    <Icon name="tick" size={16} />
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            </div>
          </section>

          <aside className="ad-set-side">
            <Panel title="Your college" sub="Set by Super Admin. You cannot change these here.">
              <InfoList
                items={[
                  { label: 'College', value: collegeName, full: true },
                  { label: 'University', value: user?.university_name, full: true },
                  { label: 'Role', value: 'College admin' },
                ]}
              />
            </Panel>
            <Panel
              title="Password"
              sub="Change it any time from the Security tab."
              action={(
                <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setTab('security')}>
                  <Icon name="lock" size={14} /> Security
                </button>
              )}
            >
              <p className="ad-muted">Changing your password signs you out on all other devices.</p>
            </Panel>
          </aside>
        </div>
      ) : (
        <div className="pm-settings">
          <section className="sp-panel ad-set-card" aria-label="Security">
            <div className="ad-set-h">
              <div className="pm-account">
                <span className="pm-av-lg ad-av-ic" aria-hidden="true"><Icon name="lock" size={26} /></span>
                <div>
                  <b>Password</b>
                  <small>Use a strong password you don&apos;t use anywhere else.</small>
                </div>
              </div>
            </div>
            <div className="ad-set-b">
              <ul className="ad-set-list">
                <li>
                  <Icon name="key" size={18} />
                  <div>
                    <b>Change password</b>
                    <small>You need your current password. Other devices are signed out afterwards.</small>
                  </div>
                  <button type="button" className="sd-btn sd-btn--amber" onClick={() => setPwOpen(true)}>
                    Change password
                  </button>
                </li>
              </ul>
            </div>
          </section>

          <aside className="ad-set-side">
            <Panel title="Keeping your account safe">
              <ul className="ad-set-tips">
                <li><Icon name="tick" size={16} /> Never share your password, even with Quirri staff.</li>
                <li><Icon name="tick" size={16} /> Sign out on shared computers when you are done.</li>
                <li><Icon name="tick" size={16} /> If something looks wrong, change your password straight away.</li>
              </ul>
            </Panel>
          </aside>
        </div>
      )}

      <QuirriModal
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        title="Change password"
        crumb="Requires your current password, then signs out all other devices."
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

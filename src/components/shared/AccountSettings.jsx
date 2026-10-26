'use client';

import '@/styles/account-settings.css';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useTabParam } from '@/hooks/useUrlState';
import useAccountScope from '@/hooks/useAccountScope';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch } from '@/store/hooks';
import { clearCredentials } from '@/store/slices/authSlice';
import { queryClient } from '@/lib/queryClient';
import { clearTokens } from '@/lib/tokens';
import QuirriModal from '@/components/superadmin/QuirriModal';
import PasswordInput from '@/components/auth/PasswordInput';
import { QuirriRHFField, QuirriField } from '@/components/superadmin/quirri-ui';
import {
  ModulePage,
  TabNav,
  TabPanel,
  Icon,
  SectionState,
  initials,
} from '@/components/shared/module-ui';
import { settingsApi, fetchData } from '@/lib/api/superadmin/modules';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import { syncSessionUser } from '@/lib/auth/syncSessionUser';
import { titleCase } from '@/lib/student/learning';
import {
  settingsProfileSchema,
  settingsPasswordSchema,
  FIELD_RULES,
  formatIndianPhone,
} from '@/lib/validation';

const ROLE_LABEL = {
  superadmin: 'Super Admin',
  college_admin: 'College Admin',
  hod: 'Head of department',
  faculty: 'Faculty',
  student: 'Student',
};

const PASSWORD_HINT = 'At least 8 characters with upper- and lowercase letters and a number.';
const EMPTY_PROFILE = { first_name: '', last_name: '', email: '', phone: '' };

/** superadmin | college_admin | hod | faculty | student (null when unknown). */
function normaliseRole(user) {
  const r = String(user?.role ?? user?.user_type ?? '').toLowerCase();
  if (r === 'faculty' && user?.is_hod) return 'hod';
  if (ROLE_LABEL[r]) return r;
  if (r.includes('super')) return 'superadmin';
  if (r.includes('college')) return 'college_admin';
  return null;
}

/** "22 Oct 2026, 9:14 am" in IST. */
function formatSignInTime(at) {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return 'Not set';
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function avatarInitials(name, email) {
  if (name) return initials(name, '?');
  const local = String(email || '').split('@')[0].replace(/[^a-z0-9]/gi, '');
  return local ? local[0].toUpperCase() : '?';
}

/** SA only: the last sign-ins recorded in the audit log for this account. */
function RecentSignIns({ email }) {
  const [state, setState] = useState({ loading: true, error: null, rows: [] });
  const load = useCallback(async () => {
    if (!email) return;
    setState({ loading: true, error: null, rows: [] });
    try {
      const rows = await settingsApi.recentSignIns(email);
      setState({ loading: false, error: null, rows: Array.isArray(rows) ? rows.slice(0, 10) : [] });
    } catch (err) {
      setState({ loading: false, error: apiErrorMessage(err, 'Could not load your recent sign-ins.'), rows: [] });
    }
  }, [email]);
  useEffect(() => { load(); }, [load]);

  let body;
  if (state.loading) {
    body = <p className="as-state" aria-busy="true">Loading…</p>;
  } else if (state.error) {
    body = (
      <div className="as-state">
        <p>{state.error}</p>
        <button type="button" className="sd-btn sd-btn--ghost" onClick={load}>
          <Icon name="refresh" size={16} /> Try again
        </button>
      </div>
    );
  } else if (!state.rows.length) {
    body = <p className="as-state">No sign-ins recorded yet.</p>;
  } else {
    body = (
      <ul className="as-signins">
        {state.rows.map((r, i) => (
          <li key={`${r.at}-${i}`}>
            <span className="as-signin-when">{formatSignInTime(r.at)}</span>
            <span className="as-signin-ip">{r.ip ? `IP ${r.ip}` : 'IP not recorded'}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="sp-panel as-card" aria-labelledby="as-signins-h">
      <div className="as-card-h">
        <h2 id="as-signins-h">Recent sign-ins</h2>
        <p>Your last 10 sign-ins in the past 30 days. Times in IST.</p>
      </div>
      {body}
    </section>
  );
}

/**
 * Self-service account page shared by every portal (settings-plan.md, 22 Oct 2026).
 * Tabs: Profile · Security · Notifications.
 * - `notificationsTab`: node, or `({ role }) => node` (role = superadmin | college_admin | hod |
 *   faculty | student, null while loading). Adds the Notifications tab after Security.
 * - `extraTabs` = [{ id, label, render: () => node }] still works (added after Notifications).
 */
export default function AccountSettings({ notificationsTab = null, extraTabs = [] }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { logout } = useAuth();
  const [saving, setSaving] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  // What the server has; the header shows this, not the unsaved draft.
  const [saved, setSaved] = useState(EMPTY_PROFILE);
  // One source for the page: GET /auth/me (+ /faculty/me for HOD / Faculty) via the scope hook.
  const scope = useAccountScope();
  const me = scope?.me ?? null;
  const loading = Boolean(scope?.loading) && !me;
  const loadError = scope?.error && !me ? apiErrorMessage(scope.error, 'Could not load your profile.') : null;
  // The hook also reads /faculty/me, so it knows an HOD whose account role is faculty.
  const role = scope?.role || normaliseRole(me);

  const tabs = [
    { value: 'profile', label: 'Profile' },
    { value: 'security', label: 'Security' },
    ...(notificationsTab ? [{ value: 'notifications', label: 'Notifications' }] : []),
    ...extraTabs
      .filter((t) => !(notificationsTab && t.id === 'notifications'))
      .map((t) => ({ value: t.id, label: t.label, render: t.render })),
  ];
  // Tab in ?tab= so Back returns to the previous tab and links can open a tab directly.
  const [tab, setTab] = useTabParam(tabs.map((t) => t.value), 'profile');

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isDirty, isValid },
  } = useForm({
    resolver: zodResolver(settingsProfileSchema),
    defaultValues: EMPTY_PROFILE,
    mode: 'onChange',
  });

  // Save stays off while a required name is empty (last name counts once the account has one).
  const [wFirst, wLast] = watch(['first_name', 'last_name']);
  const missingName = !String(wFirst || '').trim()
    || (Boolean(String(saved.last_name || '').trim()) && !String(wLast || '').trim());

  // Inputs keep the raw value; the header is title-cased like the sidebar so both read the same.
  const fullName = titleCase([saved.first_name, saved.last_name].map((p) => String(p || '').trim()).filter(Boolean).join(' '));
  const { email } = saved;

  const {
    register: registerPw,
    handleSubmit: handlePwSubmit,
    reset: resetPw,
    setError: setPwError,
    formState: { errors: pwErrors },
  } = useForm({
    resolver: zodResolver(settingsPasswordSchema),
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
    mode: 'onBlur',
  });

  const applyUser = (user) => {
    const profile = {
      first_name: user?.first_name ?? '',
      last_name: user?.last_name ?? '',
      email: user?.email ?? '',
      phone: formatIndianPhone(user?.phone_number ?? user?.phone ?? user?.mobile ?? ''),
    };
    setSaved(profile);
    reset(profile);
  };

  // Fill the form when the account loads (and after the silent reload that follows a save).
  useEffect(() => {
    if (me) applyUser(me);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the server copy changes
  }, [me]);

  const retryLoad = () => { scope?.reload?.().catch(() => {}); };

  /** After a password change the server has already ended this session: clear it here and open login. */
  const signOutHere = () => {
    clearTokens();
    dispatch(clearCredentials());
    queryClient.clear();
    router.replace('/auth/login');
  };

  const onSave = handleSubmit(async (values) => {
    if (loadError || missingName) return;
    setSaving(true);
    try {
      const raw = await fetchData(() => settingsApi.update({
        first_name: values.first_name,
        last_name: values.last_name,
        phone_number: values.phone,
      }));
      const user = raw?.user ?? raw;
      if (user && typeof user === 'object') {
        applyUser({ ...saved, ...user, email: user.email ?? saved.email });
        syncSessionUser(user);
      }
      toast.success('Your changes are saved.');
      scope?.reload?.({ silent: true }).catch(() => {});
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save your changes. Please try again.'));
    } finally {
      setSaving(false);
    }
  });

  const closePw = () => {
    if (pwSaving) return;
    setPwOpen(false);
    resetPw({ current_password: '', new_password: '', confirm_password: '' });
  };

  // PasswordInput spreads `register` onto the input, so the a11y attributes ride along with it.
  const pwRegister = (name) => ({
    ...registerPw(name),
    'aria-invalid': Boolean(pwErrors[name]),
    'aria-describedby': pwErrors[name] ? `${name}-error` : undefined,
  });

  const onPassword = handlePwSubmit(async (values) => {
    setPwSaving(true);
    try {
      await fetchData(() => settingsApi.changePassword(values));
      setPwOpen(false);
      toast.success('Password changed. Sign in again with your new password.');
      // The server ended every session, this one included.
      signOutHere();
    } catch (err) {
      const message = apiErrorMessage(err, 'Could not change your password. Please try again.');
      // Show a wrong current password on the field itself, not only in a toast.
      if (/current password/i.test(message)) setPwError('current_password', { type: 'server', message });
      toast.error(message);
    } finally {
      setPwSaving(false);
    }
  });

  const onSignOut = async () => {
    setSigningOut(true);
    // POST /auth/logout, clear local state, go to login.
    await logout();
  };

  const busy = loading || Boolean(loadError);
  const roleLabel = role ? ROLE_LABEL[role] : '';
  const extra = tabs.find((t) => t.value === tab && t.render);
  const notificationsNode = typeof notificationsTab === 'function'
    ? notificationsTab({ role: scope?.loading ? null : role })
    : notificationsTab;

  return (
    <ModulePage className="sa-page sa-settings as-page">
      <TabNav tabs={tabs} value={tab} onChange={setTab} label="Settings sections" idBase="settings" />

      {loadError ? (
        <SectionState
          tone="err"
          title="Could not load your profile"
          action={(
            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={retryLoad}>
              <Icon name="refresh" size={16} /> Try again
            </button>
          )}
        >
          {loadError}
        </SectionState>
      ) : null}

      <TabPanel value="profile" current={tab} idBase="settings">
        <div className="as-stack">
          <section className="sp-panel as-card as-head" aria-label="Your account">
            <span className="as-avatar" aria-hidden="true">{loading ? '' : avatarInitials(fullName, email)}</span>
            <div className="as-who">
              <b>{loading ? 'Loading…' : fullName || email || 'Your account'}</b>
              {/* A name like 'Super Admin' already says the role. */}
              {roleLabel && roleLabel.toLowerCase() !== fullName.toLowerCase() ? <span className="as-role">{roleLabel}</span> : null}
            </div>
          </section>

          <section className="sp-panel as-card" aria-labelledby="as-details-h">
            <div className="as-card-h">
              <h2 id="as-details-h">Personal details</h2>
            </div>
            <form onSubmit={onSave} noValidate>
              <fieldset disabled={busy} className="as-fieldset">
                <div className="as-grid">
                  <QuirriRHFField control={control} name="first_name" fieldType="personName" label="First name" />
                  <QuirriRHFField control={control} name="last_name" fieldType="personName" label="Last name" />
                  <QuirriRHFField
                    control={control}
                    name="phone"
                    fieldType="phone"
                    label="Phone number"
                    hint="Indian mobile number"
                    placeholder="+91 98765 43210"
                  />
                  <QuirriRHFField
                    control={control}
                    name="email"
                    fieldType="email"
                    label="Email address"
                    hint="Your sign-in email can't be changed."
                    disabled
                  />
                </div>
              </fieldset>
              <div className="as-actions">
                <button
                  className="sd-btn sd-btn--amber"
                  type="submit"
                  disabled={!isDirty || !isValid || missingName || saving || busy}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </section>

          <section className="sp-panel as-card" aria-labelledby="as-access-h" aria-busy={scope?.loading || undefined}>
            <div className="as-card-h">
              <h2 id="as-access-h">Your access</h2>
            </div>
            {scope?.loading ? (
              <p className="as-state">Loading…</p>
            ) : (
              <>
                <dl className="as-dl">
                  {(scope?.rows || []).map((r) => (
                    <div key={r.label}>
                      <dt>{r.label}</dt>
                      <dd>{r.value == null || r.value === '' ? 'Not set' : r.value}</dd>
                    </div>
                  ))}
                </dl>
                {scope?.note ? <p className="as-note">{scope.note}</p> : null}
              </>
            )}
          </section>
        </div>
      </TabPanel>

      <TabPanel value="security" current={tab} idBase="settings">
        <div className="as-stack">
          <section className="sp-panel as-card" aria-labelledby="as-security-h">
            <div className="as-card-h">
              <h2 id="as-security-h">Sign-in and security</h2>
            </div>
            <div className="as-rows">
              <div className="as-row">
                <span className="as-row-ic" aria-hidden="true"><Icon name="key" size={18} /></span>
                <div className="as-row-main">
                  <b>Password</b>
                  <span>Changing it signs you out on every device, including this one.</span>
                </div>
                <button className="sd-btn sd-btn--amber" type="button" onClick={() => setPwOpen(true)} disabled={busy}>
                  Change password
                </button>
              </div>
              <div className="as-row">
                <span className="as-row-ic" aria-hidden="true"><svg className="as-ic-logout" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <path d="M16 17l5-5-5-5M21 12H9" />
                  </svg></span>
                <div className="as-row-main">
                  <b>Sign out of this device</b>
                  <span>Ends your session in this browser only.</span>
                </div>
                <button className="sd-btn sd-btn--ghost" type="button" onClick={onSignOut} disabled={signingOut}>
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </div>
          </section>

          {role === 'superadmin' && email ? <RecentSignIns email={email} /> : null}
        </div>
      </TabPanel>

      {notificationsTab ? (
        <TabPanel value="notifications" current={tab} idBase="settings">{notificationsNode}</TabPanel>
      ) : null}

      {extra ? (
        <TabPanel value={extra.value} current={tab} idBase="settings">{extra.render()}</TabPanel>
      ) : null}

      <QuirriModal
        open={pwOpen}
        onClose={closePw}
        busy={pwSaving}
        title="Change password"
        crumb="After changing it you'll sign in again on every device, including this one."
        footer={(
          <>
            <button type="button" className="sd-btn sd-btn--ghost" onClick={closePw} disabled={pwSaving}>Cancel</button>
            <div className="right">
              <button type="button" className="sd-btn sd-btn--amber" onClick={onPassword} disabled={pwSaving}>
                {pwSaving ? 'Changing…' : 'Change password'}
              </button>
            </div>
          </>
        )}
      >
        <form onSubmit={onPassword} noValidate className="as-pw-form">
          <QuirriField label="Current password" htmlFor="current_password">
            <PasswordInput
              id="current_password"
              register={pwRegister('current_password')}
              autoComplete="current-password"
              inputClassName={pwErrors.current_password ? 'invalid' : ''}
              maxLength={FIELD_RULES.password.max}
            />
            {pwErrors.current_password ? (
              <div id="current_password-error" className="hint field-error" role="alert">{pwErrors.current_password.message}</div>
            ) : null}
          </QuirriField>
          <QuirriField label="New password" htmlFor="new_password"
            hint={pwErrors.new_password ? undefined : PASSWORD_HINT}>
            <PasswordInput
              id="new_password"
              register={pwRegister('new_password')}
              autoComplete="new-password"
              inputClassName={pwErrors.new_password ? 'invalid' : ''}
              maxLength={FIELD_RULES.password.max}
            />
            {pwErrors.new_password ? (
              <div id="new_password-error" className="hint field-error" role="alert">{pwErrors.new_password.message}</div>
            ) : null}
          </QuirriField>
          <QuirriField label="Confirm new password" htmlFor="confirm_password">
            <PasswordInput
              id="confirm_password"
              register={pwRegister('confirm_password')}
              autoComplete="new-password"
              inputClassName={pwErrors.confirm_password ? 'invalid' : ''}
              maxLength={FIELD_RULES.password.max}
            />
            {pwErrors.confirm_password ? (
              <div id="confirm_password-error" className="hint field-error" role="alert">{pwErrors.confirm_password.message}</div>
            ) : null}
          </QuirriField>
          <p className="as-forgot">
            <Link href="/auth/forgot-password">Forgot your current password?</Link>
          </p>
          {/* Enter submits from any field. */}
          <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
        </form>
      </QuirriModal>
    </ModulePage>
  );
}

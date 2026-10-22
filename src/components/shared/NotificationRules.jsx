'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Switch from '@/components/shared/Switch';
import { Icon } from '@/components/student/ui';
import { notificationRulesApi } from '@/lib/api/notificationRules';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import { isInterviewOff } from '@/lib/product/interviewOff';
import '@/styles/notification-rules.css';

/** One-line card descriptions when the API sends none (group ids / names from notification_catalog.py). */
const GROUP_DESCRIPTION = {
  'account & security': 'Sign-in, password and account status emails.',
  'people & roles': 'When a role, subjects or a student’s placement change.',
  'content pipeline': 'Chapter videos, from generation to review and publishing.',
  assessments: 'Chapter assessments, from approval to results.',
};

const CHANNEL_LABEL = { email: 'Email', whatsapp: 'WhatsApp', sms: 'SMS' };

const MANDATORY_TEXT = 'Always on — needed for sign-in and security';

/** "A new account is created" → "Sends when a new account is created" (keeps "HOD", "OTP" etc.). */
function sendsWhen(trigger) {
  const t = String(trigger || '').trim();
  if (!t) return '';
  if (/^sends when\b/i.test(t)) return t;
  const lower = /^[A-Z][a-z\s']/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
  return `Sends when ${lower}`;
}

function recipientsLine(ev) {
  const raw = String(ev.recipients || '').trim();
  // "The new user" → "To the new user"; acronyms ("HOD …") stay as they are.
  const who = /^[A-Z][a-z]/.test(raw) ? raw.charAt(0).toLowerCase() + raw.slice(1) : raw;
  const channels = (Array.isArray(ev.channels) && ev.channels.length ? ev.channels : ['email'])
    .map((c) => CHANNEL_LABEL[String(c).toLowerCase()] || c)
    .join(', ');
  return [who ? `To ${who}` : '', channels].filter(Boolean).join(' · ');
}

function groupDescription(group) {
  if (group.description) return group.description;
  const key = String(group.name || group.id || '').toLowerCase().replace(/_/g, ' ').replace(/\band\b/, '&');
  return GROUP_DESCRIPTION[key] || GROUP_DESCRIPTION[String(group.name || '').toLowerCase()] || null;
}

function errorCopy(err) {
  const status = err?.response?.status;
  if (status === 404) {
    return ['Notification rules are not available yet', 'This page will show every email and its switch as soon as the service is ready.'];
  }
  if (status === 403) return ['You can’t view these rules', apiErrorMessage(err, 'Your role does not allow it.')];
  return ['Could not load notification rules', apiErrorMessage(err, 'Please try again.')];
}

function Skeleton() {
  return (
    <div className="nr-stack" aria-busy="true" aria-label="Loading notification rules">
      {[0, 1].map((g) => (
        <section key={g} className="nr-card">
          <div className="nr-skel nr-skel--title" />
          <div className="nr-skel nr-skel--sub" />
          <ul className="nr-rows">
            {[0, 1, 2].map((r) => (
              <li key={r} className="nr-row">
                <div className="nr-row-main">
                  <div className="nr-skel nr-skel--name" />
                  <div className="nr-skel nr-skel--line" />
                </div>
                <div className="nr-skel nr-skel--switch" />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * Notification rules for one scope (notifications-plan.md § Frontend):
 *   platform (SA) · tenant (CA, or SA with a college) · department (HOD) · personal (Faculty / Student).
 * Each group is a white card; each event a row with its trigger, recipients and a switch.
 * Mandatory events read "Always on"; events switched off above show the reason and a disabled switch.
 * Toggles are optimistic and roll back (with a toast) if the server refuses.
 *
 * Props: scope / scopeId (omit both for the caller's default scope), canTest (SA / CA / HOD),
 * intro (one muted line above the cards; defaults per scope).
 */
export default function NotificationRules({ scope, scopeId, canTest = false, intro }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [testing, setTesting] = useState('');
  const reqRef = useRef(0);

  const load = useCallback(async () => {
    const req = ++reqRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await notificationRulesApi.list({ scope, scopeId });
      if (req === reqRef.current) setData(res);
    } catch (err) {
      if (req === reqRef.current) { setError(err); setData(null); }
    } finally {
      if (req === reqRef.current) setLoading(false);
    }
  }, [scope, scopeId]);

  useEffect(() => { setData(null); load(); }, [load]);

  const patchEvent = (eventId, patch) => {
    setData((prev) => (prev ? {
      ...prev,
      groups: (prev.groups || []).map((g) => ({
        ...g,
        events: (g.events || []).map((e) => (e.id === eventId ? { ...e, ...patch } : e)),
      })),
    } : prev));
  };

  const activeScope = data?.scope || scope;
  const activeScopeId = data?.scope_id || scopeId;

  const toggle = async (ev, next) => {
    const before = { enabled: ev.enabled, effective: ev.effective };
    patchEvent(ev.id, { enabled: next, effective: next });
    setSaving((s) => ({ ...s, [ev.id]: true }));
    try {
      const row = await notificationRulesApi.update(ev.id, { scope: activeScope, scopeId: activeScopeId, enabled: next });
      if (row && typeof row === 'object' && row.id === ev.id) patchEvent(ev.id, row);
      const where = data?.scope_label && activeScope !== 'personal' ? ` for ${data.scope_label}` : '';
      toast.success(`${ev.name} ${next ? 'turned on' : 'turned off'}${where}`);
    } catch (err) {
      patchEvent(ev.id, before);
      const status = err?.response?.status;
      const fallback = status === 409 ? 'This email is turned off at a higher level.' : 'Could not save this change.';
      toast.error(apiErrorMessage(err, fallback));
    } finally {
      setSaving((s) => { const n = { ...s }; delete n[ev.id]; return n; });
    }
  };

  const sendTest = async (ev) => {
    setTesting(ev.id);
    try {
      const row = await notificationRulesApi.sendTest(ev.id, { scope: activeScope, scopeId: activeScopeId });
      const status = row?.status_key || row?.status;
      if (status === 'failed') toast.error(row?.error || 'The test email could not be sent.');
      else if (status === 'skipped') toast.error(row?.error || 'The test was skipped because this email is turned off.');
      else if (status === 'log_only') toast.success('Test recorded — email sending is not connected yet');
      else toast.success(`Test “${ev.name}” email sent to you`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not send the test email.'));
    } finally {
      setTesting('');
    }
  };

  if (loading && !data) return <Skeleton />;

  if (error) {
    const [title, body] = errorCopy(error);
    return (
      <div className="nr-stack">
        <section className="nr-card nr-state" role={error?.response?.status === 404 ? 'status' : 'alert'}>
          <span className="nr-state-ic" aria-hidden="true"><Icon name="bell" size={20} /></span>
          <b>{title}</b>
          <p>{body}</p>
          <button type="button" className="nr-btn" onClick={load}>
            <Icon name="refresh" size={16} /> Try again
          </button>
        </section>
      </div>
    );
  }

  const groups = (data?.groups || [])
    .map((g) => ({
      ...g,
      events: (g.events || []).filter((e) => !isInterviewOff(`${e.id || ''} ${e.name || ''} ${e.group || ''}`)),
    }))
    .filter((g) => (g.events || []).length);
  const canEdit = data?.can_edit !== false;
  const defaultIntro = activeScope === 'personal'
    ? 'Choose which emails Quirri sends you. Security emails are always on.'
    : data?.scope_label
      ? `Emails Quirri sends for ${data.scope_label}. Changes apply straight away.`
      : null;
  const lead = intro === undefined ? defaultIntro : intro;

  return (
    <div className="nr-stack">
      {lead || !canEdit ? (
        <p className="nr-intro">
          {lead}
          {!canEdit ? <span className="nr-viewonly"> View only — you can’t change these rules.</span> : null}
        </p>
      ) : null}

      {!groups.length ? (
        <section className="nr-card nr-state" role="status">
          <span className="nr-state-ic" aria-hidden="true"><Icon name="bell" size={20} /></span>
          <b>No emails to manage here</b>
          <p>There are no notifications you can switch for this scope.</p>
        </section>
      ) : null}

      {groups.map((g) => {
        const gid = `nr-g-${g.id || g.name}`.replace(/[^a-zA-Z0-9_-]/g, '-');
        const desc = groupDescription(g);
        return (
          <section key={g.id || g.name} className="nr-card" aria-labelledby={`${gid}-h`}>
            <div className="nr-card-h">
              <h3 id={`${gid}-h`}>{g.name}</h3>
              {desc ? <p>{desc}</p> : null}
            </div>
            <ul className="nr-rows">
              {g.events.map((ev) => {
                const rid = `${gid}-${ev.id}`.replace(/[^a-zA-Z0-9_-]/g, '-');
                const locked = !ev.mandatory && (Boolean(ev.locked_reason) || ev.editable === false || !canEdit);
                const checked = locked ? Boolean(ev.effective ?? ev.enabled) : Boolean(ev.enabled);
                const showTest = canTest && ev.testable !== false;
                return (
                  <li key={ev.id} className={`nr-row${locked ? ' is-locked' : ''}`}>
                    <div className="nr-row-main">
                      <b id={`${rid}-name`}>{ev.name}</b>
                      {ev.trigger ? <span id={`${rid}-when`} className="nr-when">{sendsWhen(ev.trigger)}</span> : null}
                      <span className="nr-meta">
                        {recipientsLine(ev)}
                        {showTest ? (
                          <>
                            <span aria-hidden="true"> · </span>
                            <button
                              type="button"
                              className="nr-test"
                              onClick={() => sendTest(ev)}
                              disabled={Boolean(testing)}
                              aria-label={`Send a test “${ev.name}” email to yourself`}
                            >
                              {testing === ev.id ? 'Sending…' : 'Send test'}
                            </button>
                          </>
                        ) : null}
                      </span>
                      {locked && ev.locked_reason ? (
                        <span className="nr-locked" id={`${rid}-lock`}>
                          <Icon name="lock" size={14} /> {ev.locked_reason}
                        </span>
                      ) : null}
                    </div>
                    <div className="nr-row-side">
                      {ev.mandatory ? (
                        <span className="nr-always"><i className="nr-dot" aria-hidden="true" />{MANDATORY_TEXT}</span>
                      ) : (
                        <Switch
                          checked={checked}
                          disabled={locked}
                          busy={Boolean(saving[ev.id])}
                          labelledBy={`${rid}-name`}
                          describedBy={[ev.trigger ? `${rid}-when` : '', locked && ev.locked_reason ? `${rid}-lock` : ''].filter(Boolean).join(' ') || undefined}
                          onChange={(next) => toggle(ev, next)}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

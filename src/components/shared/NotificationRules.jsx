'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Switch from '@/components/shared/Switch';
import { Icon } from '@/components/student/ui';
import { useQuirriTip } from '@/components/superadmin/QuirriTooltip';
import { notificationRulesApi } from '@/lib/api/notificationRules';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import { isInterviewOff } from '@/lib/product/interviewOff';
import '@/styles/notification-rules.css';

/* Personal scope (Faculty / Student, Settings → Notifications). */
const PERSONAL_HIDDEN = new Set(['account_activation']);
const PERSONAL_GROUP = {
  account_security: 'Account & security',
  people_roles: 'Your account',
  content_pipeline: 'Chapters',
  assessments: 'Assessments',
};

function errorCopy(err) {
  const status = err?.response?.status;
  if (status === 403) return ['You can’t view these rules', apiErrorMessage(err, 'Your role does not allow it.')];
  return ['Could not load notification rules', apiErrorMessage(err, 'Please try again.')];
}

function Skeleton() {
  return (
    <div className="nr-stack" aria-busy="true" aria-label="Loading notification rules">
      {[0, 1].map((g) => (
        <section key={g} className="nr-card">
          <div className="nr-skel nr-skel--title" />
          <ul className="nr-rows">
            {[0, 1, 2].map((r) => (
              <li key={r} className="nr-row">
                <div className="nr-skel nr-skel--name" />
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
 * Notification rules for one scope:
 *   platform (SA) · tenant (CA, or SA with a college) · department (HOD) · personal (Faculty / Student).
 * Each group is a white card; each event a name + switch.
 * Mandatory / locked rows keep the switch on (or as inherited) and disabled.
 * Toggles are optimistic and roll back if the server refuses.
 *
 * Props: scope / scopeId (omit both for the caller’s default), canTest (SA / CA / HOD).
 */
export default function NotificationRules({ scope, scopeId, canTest = false }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [testing, setTesting] = useState('');
  const reqRef = useRef(0);
  const { show: showTip, hide: hideTip, TipLayer } = useQuirriTip();

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

  const personal = activeScope === 'personal';
  const groups = (data?.groups || [])
    .map((g) => ({
      ...g,
      events: (g.events || []).filter((e) => !isInterviewOff(`${e.id || ''} ${e.name || ''} ${e.group || ''}`)
        && !(personal && PERSONAL_HIDDEN.has(e.id))),
    }))
    .filter((g) => (g.events || []).length);
  const canEdit = data?.can_edit !== false;

  return (
    <div className="nr-stack">
      {!canEdit ? <p className="nr-intro">View only — you can’t change these rules.</p> : null}

      {!groups.length ? (
        <section className="nr-card nr-state" role="status">
          <span className="nr-state-ic" aria-hidden="true"><Icon name="bell" size={20} /></span>
          <b>No emails to manage here</b>
        </section>
      ) : null}

      {groups.map((g) => {
        const gid = `nr-g-${g.id || g.name}`.replace(/[^a-zA-Z0-9_-]/g, '-');
        const groupName = (personal && PERSONAL_GROUP[g.id]) || g.name;
        return (
          <section key={g.id || g.name} className="nr-card" aria-labelledby={`${gid}-h`}>
            <div className="nr-card-h">
              <h3 id={`${gid}-h`}>{groupName}</h3>
            </div>
            <ul className="nr-rows">
              {g.events.map((ev) => {
                const rid = `${gid}-${ev.id}`.replace(/[^a-zA-Z0-9_-]/g, '-');
                const locked = !ev.mandatory && (Boolean(ev.locked_reason) || ev.editable === false || !canEdit);
                const frozen = Boolean(ev.mandatory) || locked;
                const checked = ev.mandatory ? true : (locked ? Boolean(ev.effective ?? ev.enabled) : Boolean(ev.enabled));
                const showTest = canTest && ev.testable !== false;
                const freezeTip = ev.mandatory ? 'Always on' : (locked ? (ev.locked_reason || 'You can’t change this') : '');
                return (
                  <li key={ev.id} className={`nr-row${frozen ? ' is-locked' : ''}`}>
                    <div className="nr-row-main">
                      <b id={`${rid}-name`}>{ev.name}</b>
                    </div>
                    <div className="nr-row-side">
                      {showTest ? (
                        <button
                          type="button"
                          className="nr-iconbtn"
                          onClick={() => sendTest(ev)}
                          disabled={Boolean(testing)}
                          aria-label={`Send a test “${ev.name}” email to yourself`}
                          onMouseEnter={(e) => showTip(e, 'Send a test to you', 'top')}
                          onMouseLeave={hideTip}
                          onFocus={(e) => showTip(e, 'Send a test to you', 'top')}
                          onBlur={hideTip}
                        >
                          <Icon name={testing === ev.id ? 'refresh' : 'send'} size={16} />
                        </button>
                      ) : null}
                      <span
                        className="nr-switch-wrap"
                        onMouseEnter={freezeTip ? (e) => showTip(e, freezeTip, 'top') : undefined}
                        onMouseLeave={freezeTip ? hideTip : undefined}
                        onFocus={freezeTip ? (e) => showTip(e, freezeTip, 'top') : undefined}
                        onBlur={freezeTip ? hideTip : undefined}
                      >
                        <Switch
                          checked={checked}
                          disabled={frozen}
                          busy={Boolean(saving[ev.id])}
                          labelledBy={`${rid}-name`}
                          onChange={(next) => toggle(ev, next)}
                        />
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <TipLayer />
    </div>
  );
}

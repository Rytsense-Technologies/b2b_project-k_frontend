'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/student/ui';
import { useQuirriTip } from '@/components/superadmin/QuirriTooltip';
import { useSystemNotifications } from '@/hooks/useSystemNotifications';
import { alertHref, eventLabel, inboxHref, timeOf } from '@/lib/notifications/scenarios';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import '@/styles/system-notifications.css';

function createdMs(row) {
  const t = Date.parse(row?.created_at || '');
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Top-bar inbox for every portal. Polls GET /notifications/mine.
 * Desktop alerts require an in-UI grant (the OS permission dialog cannot be skipped).
 */
export default function SystemNotificationBell({ portal = 'superadmin' }) {
  const router = useRouter();
  const panelId = useId();
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const seenAtOpen = useRef('');
  const { items, unread, seenAt, loading, error, desktop, reload, markSeen, requestDesktop } = useSystemNotifications();
  const { show, hide, TipLayer } = useQuirriTip();
  const inbox = inboxHref(portal);
  const preview = items.slice(0, 8);
  const seenCut = Date.parse((open ? seenAtOpen.current : seenAt) || '') || 0;

  useEffect(() => {
    if (!open) return undefined;
    hide();
    seenAtOpen.current = seenAt;
    markSeen();
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open, markSeen, hide]);

  const go = (row) => {
    const href = alertHref(row.event, portal) || inbox;
    setOpen(false);
    if (href) router.push(href);
  };

  return (
    <div className="sn-bell" ref={wrapRef}>
      <button
        type="button"
        className="sn-bell-btn"
        aria-label={unread ? `Alerts, ${unread} new` : 'Alerts'}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          hide();
          setOpen((v) => !v);
        }}
        onMouseEnter={(e) => { if (!open) show(e, 'Alerts', 'bottom'); }}
        onMouseLeave={hide}
        onFocus={(e) => { if (!open) show(e, 'Alerts', 'bottom'); }}
        onBlur={hide}
      >
        <Icon name="bell" size={18} />
        {unread ? <span className="sn-bell-dot" aria-hidden="true" /> : null}
      </button>
      {open ? (
        <div className="sn-panel" id={panelId} role="region" aria-label="Your alerts">
          <div className="sn-panel-h">
            <div>
              <b>Alerts</b>
              <span>{unread ? `${unread} new` : 'Caught up'}</span>
            </div>
            {inbox ? <Link href={inbox} onClick={() => setOpen(false)}>Open all</Link> : null}
          </div>
          {desktop === 'default' ? (
            <button type="button" className="sn-grant" onClick={() => requestDesktop()}>
              Allow desktop alerts
            </button>
          ) : null}
          {error ? (
            <div className="sn-empty" role="alert">
              <b>Could not load alerts</b>
              <p>{apiErrorMessage(error, 'Please try again.')}</p>
              <button type="button" className="sn-grant" onClick={() => reload().catch(() => {})}>Try again</button>
            </div>
          ) : null}
          {!error && loading && !items.length ? (
            <div className="sn-empty" role="status"><b>Loading…</b></div>
          ) : null}
          {!error && !loading && !preview.length ? (
            <div className="sn-empty" role="status">
              <b>No alerts yet</b>
              <p>Messages Quirri emails you also appear here.</p>
            </div>
          ) : null}
          {preview.length ? (
            <ul className="sn-list">
              {preview.map((row) => {
                const href = alertHref(row.event, portal) || inbox;
                const unreadRow = !seenCut || createdMs(row) > seenCut;
                const label = eventLabel(row.event, row.event_label);
                const meta = [timeOf(row.created_at), row.subject].filter(Boolean).join(' · ');
                const inner = (
                  <>
                    <span className="sn-ic" aria-hidden="true"><Icon name="bell" size={16} /></span>
                    <span className="sn-row-main">
                      <b>{label}</b>
                      {meta ? <small>{meta}</small> : null}
                    </span>
                  </>
                );
                return (
                  <li key={row.id}>
                    {href ? (
                      <Link className={`sn-row${unreadRow ? ' is-unread' : ''}`} href={href} onClick={() => setOpen(false)}>
                        {inner}
                      </Link>
                    ) : (
                      <button type="button" className={`sn-row${unreadRow ? ' is-unread' : ''}`} onClick={() => go(row)}>
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
      <TipLayer />
    </div>
  );
}

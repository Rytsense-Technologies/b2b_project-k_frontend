'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/student/ui';
import { useQuirriTip } from '@/components/superadmin/QuirriTooltip';
import { useSystemNotifications } from '@/hooks/useSystemNotifications';
import { inboxHref, inboxItemHref, timeOf } from '@/lib/notifications/scenarios';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import '@/styles/system-notifications.css';

function loadError(err) {
  if (err?.response?.status === 404) return 'Could not load alerts. Please try again.';
  return apiErrorMessage(err, 'Please try again.');
}

/**
 * Top-bar inbox for every portal.
 * Badge: GET /notifications/inbox/unread-count. List loads when the panel opens.
 * Desktop alerts require an in-UI grant (the OS permission dialog cannot be skipped).
 */
export default function SystemNotificationBell({ portal = 'superadmin' }) {
  const router = useRouter();
  const panelId = useId();
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const {
    items,
    unread,
    loading,
    error,
    desktop,
    loadInbox,
    markRead,
    markAllRead,
    requestDesktop,
  } = useSystemNotifications();
  const { show, hide, TipLayer } = useQuirriTip();
  const inbox = inboxHref(portal);

  useEffect(() => {
    if (!open) return undefined;
    hide();
    const openedAt = new Date().toISOString();
    loadInbox({ openedAt }).catch(() => {});
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
  }, [open, loadInbox, hide]);

  const go = async (row) => {
    setOpen(false);
    if (row?.id && !row.is_read) {
      try { await markRead(row.id); } catch { /* still open the page */ }
    }
    const href = inboxItemHref(row, portal);
    if (href) router.push(href);
  };

  const markAll = async () => {
    try { await markAllRead(); } catch { /* panel keeps current rows */ }
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
            <div className="sn-panel-actions">
              {unread ? (
                <button type="button" className="sn-mark" onClick={markAll}>
                  Mark all as read
                </button>
              ) : null}
              {inbox ? <Link href={inbox} onClick={() => setOpen(false)}>Open all</Link> : null}
            </div>
          </div>
          {desktop === 'default' ? (
            <button type="button" className="sn-grant" onClick={() => requestDesktop()}>
              Allow desktop alerts
            </button>
          ) : null}
          {error ? (
            <div className="sn-empty" role="alert">
              <b>Could not load alerts</b>
              <p>{loadError(error)}</p>
              <button type="button" className="sn-grant" onClick={() => loadInbox().catch(() => {})}>Try again</button>
            </div>
          ) : null}
          {!error && loading && !items.length ? (
            <div className="sn-empty" role="status"><b>Loading…</b></div>
          ) : null}
          {!error && !loading && !items.length ? (
            <div className="sn-empty" role="status">
              <b>No alerts yet</b>
              <p>You’ll see one when a chapter is ready, published, or an assessment opens.</p>
            </div>
          ) : null}
          {items.length ? (
            <ul className="sn-list">
              {items.map((row) => {
                const unreadRow = !row.is_read;
                const meta = [timeOf(row.created_at), row.body].filter(Boolean).join(' · ');
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={`sn-row${unreadRow ? ' is-unread' : ''}`}
                      onClick={() => go(row)}
                    >
                      <span className="sn-ic" aria-hidden="true"><Icon name="bell" size={16} /></span>
                      <span className="sn-row-main">
                        <b>{row.title || row.event_label || 'Alert'}</b>
                        {meta ? <small>{meta}</small> : null}
                      </span>
                    </button>
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

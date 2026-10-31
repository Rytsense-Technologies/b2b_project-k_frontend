'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/slices/authSlice';
import { myNotificationsApi } from '@/lib/api/notificationRules';
import { asList } from '@/lib/api/superadmin/http';
import { isInterviewOff } from '@/lib/product/interviewOff';
import { isWhatsApp } from '@/lib/product/whatsappOff';
import { ALERTS_REFRESH, eventLabel } from '@/lib/notifications/scenarios';

const POLL_MS = 45000;
const PAGE_SIZE = 25;

function seenKey(userId) {
  return `quirri.alerts.seen.${userId || 'anon'}`;
}

function readSeen(userId) {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(seenKey(userId)) || '';
  } catch {
    return '';
  }
}

function writeSeen(userId, iso) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(seenKey(userId), iso);
  } catch {
    /* quota / private mode */
  }
}

function isInboxRow(row) {
  if (!row) return false;
  if (isWhatsApp(row.channel)) return false;
  return !isInterviewOff(`${row.event || ''} ${row.event_label || ''} ${row.subject || ''}`);
}

function createdMs(row) {
  const t = Date.parse(row?.created_at || '');
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Polls GET /notifications/mine for the signed-in person.
 * Unread is local (API has no read_at): anything newer than last-seen counts.
 * Desktop alerts use the browser Notification API after an in-UI grant.
 */
export function useSystemNotifications() {
  const user = useAppSelector(selectUser);
  const userId = user?.id || '';
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [seenAt, setSeenAt] = useState('');
  const [desktop, setDesktop] = useState('unsupported');
  const knownIds = useRef(new Set());
  const primed = useRef(false);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    setSeenAt(readSeen(userId));
    knownIds.current = new Set();
    primed.current = false;
  }, [userId]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      setDesktop('unsupported');
      return undefined;
    }
    const sync = () => setDesktop(Notification.permission);
    sync();
    const onVis = () => { if (document.visibilityState === 'visible') sync(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const notifyNew = useCallback((rows) => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    if (document.visibilityState === 'visible') return;
    rows.slice(0, 3).forEach((row) => {
      const title = eventLabel(row.event, row.event_label);
      const body = row.subject ? String(row.subject) : 'Open Quirri to read this message.';
      try {
        const n = new Notification(title, { body, tag: `quirri-${row.id}`, silent: false });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      } catch {
        /* some browsers throw if the service worker is missing */
      }
    });
  }, []);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await myNotificationsApi.list({ page: 1, pageSize: PAGE_SIZE, days: 90 });
      const rows = asList(data, []).filter(isInboxRow);
      const nextIds = new Set(rows.map((r) => r.id).filter(Boolean));
      if (primed.current) {
        const fresh = rows.filter((r) => r.id && !knownIds.current.has(r.id));
        if (fresh.length) notifyNew(fresh);
      }
      knownIds.current = nextIds;
      primed.current = true;
      setItems(rows);
      setTotal(typeof data?.total === 'number' ? data.total : rows.length);
      setError(null);
      return rows;
    } catch (err) {
      if (!silent) setError(err);
      throw err;
    } finally {
      if (!silent) setLoading(false);
    }
  }, [notifyNew]);

  useEffect(() => {
    let cancelled = false;
    load().catch(() => {});
    const tick = () => {
      if (cancelled) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      load({ silent: true }).catch(() => {});
    };
    const id = window.setInterval(tick, POLL_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    const onRefresh = () => { load({ silent: true }).catch(() => {}); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener(ALERTS_REFRESH, onRefresh);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener(ALERTS_REFRESH, onRefresh);
    };
  }, [load, userId]);

  const unread = useMemo(() => {
    if (!seenAt) return items.length;
    const cut = Date.parse(seenAt);
    if (Number.isNaN(cut)) return items.length;
    return items.filter((r) => createdMs(r) > cut).length;
  }, [items, seenAt]);

  const markSeen = useCallback(() => {
    const iso = new Date().toISOString();
    writeSeen(userIdRef.current, iso);
    setSeenAt(iso);
  }, []);

  const requestDesktop = useCallback(async () => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      setDesktop('unsupported');
      return 'unsupported';
    }
    try {
      const next = await Notification.requestPermission();
      setDesktop(next);
      return next;
    } catch {
      setDesktop(Notification.permission);
      return Notification.permission;
    }
  }, []);

  return {
    items,
    total,
    unread,
    seenAt,
    loading,
    error,
    desktop,
    reload: load,
    markSeen,
    requestDesktop,
  };
}

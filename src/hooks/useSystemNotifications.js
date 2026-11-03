'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { inboxNotificationsApi } from '@/lib/api/notificationRules';
import { asList } from '@/lib/api/superadmin/http';
import { isInterviewOff } from '@/lib/product/interviewOff';
import { ALERTS_REFRESH } from '@/lib/notifications/scenarios';

const POLL_MS = 45000;
const PAGE_SIZE = 25;

function isInboxRow(row) {
  if (!row) return false;
  return !isInterviewOff(`${row.event || ''} ${row.event_label || ''} ${row.title || ''}`);
}

function createdMs(row) {
  const t = Date.parse(row?.created_at || '');
  return Number.isNaN(t) ? 0 : t;
}

function unreadOf(data, fallback = 0) {
  const n = Number(data?.unread_count);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * Bell + desktop alerts from GET /notifications/inbox*.
 * Badge polls unread-count; the list loads when the panel opens.
 * Desktop alerts use the browser Notification API after an in-UI grant.
 */
export function useSystemNotifications() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [desktop, setDesktop] = useState('unsupported');
  const openedAtRef = useRef('');
  const lastUnread = useRef(0);
  const primed = useRef(false);

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
      const title = row.title || row.event_label || 'Quirri alert';
      const body = row.body ? String(row.body) : 'Open Quirri to read this message.';
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

  const pollBadge = useCallback(async () => {
    try {
      const data = await inboxNotificationsApi.unreadCount();
      const n = unreadOf(data, 0);
      if (primed.current && n > lastUnread.current) {
        try {
          const fresh = await inboxNotificationsApi.list({ page: 1, pageSize: 3, unreadOnly: true });
          notifyNew(asList(fresh, []).filter(isInboxRow));
        } catch {
          /* badge still updates */
        }
      }
      lastUnread.current = n;
      primed.current = true;
      setUnread(n);
    } catch {
      /* keep the last badge; the panel shows load errors */
    }
  }, [notifyNew]);

  const loadInbox = useCallback(async ({ silent = false, openedAt } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await inboxNotificationsApi.list({ page: 1, pageSize: PAGE_SIZE });
      const rows = asList(data, []).filter(isInboxRow);
      setItems(rows);
      setTotal(typeof data?.total === 'number' ? data.total : rows.length);
      setUnread(unreadOf(data, lastUnread.current));
      lastUnread.current = unreadOf(data, lastUnread.current);
      primed.current = true;
      if (openedAt) openedAtRef.current = openedAt;
      else if (!openedAtRef.current) openedAtRef.current = new Date().toISOString();
      setError(null);
      return data;
    } catch (err) {
      if (!silent) setError(err);
      throw err;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    pollBadge();
    const tick = () => {
      if (cancelled) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      pollBadge();
    };
    const id = window.setInterval(tick, POLL_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    const onRefresh = () => { pollBadge(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener(ALERTS_REFRESH, onRefresh);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener(ALERTS_REFRESH, onRefresh);
    };
  }, [pollBadge]);

  const markRead = useCallback(async (id) => {
    if (!id) return null;
    const data = await inboxNotificationsApi.markRead(id);
    setItems((prev) => prev.map((row) => (
      row.id === id ? { ...row, is_read: true, read_at: data?.read_at || row.read_at } : row
    )));
    setUnread(unreadOf(data, Math.max(0, lastUnread.current - 1)));
    lastUnread.current = unreadOf(data, Math.max(0, lastUnread.current - 1));
    return data;
  }, []);

  const markAllRead = useCallback(async () => {
    const before = openedAtRef.current || new Date().toISOString();
    const data = await inboxNotificationsApi.markAllRead({ before });
    const cut = Date.parse(before);
    setItems((prev) => prev.map((row) => (
      !Number.isNaN(cut) && createdMs(row) <= cut ? { ...row, is_read: true } : row
    )));
    const n = unreadOf(data, 0);
    lastUnread.current = n;
    setUnread(n);
    return data;
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
    loading,
    error,
    desktop,
    openedAt: openedAtRef.current,
    pollBadge,
    loadInbox,
    markRead,
    markAllRead,
    requestDesktop,
  };
}

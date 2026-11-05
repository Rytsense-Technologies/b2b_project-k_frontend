'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { inboxNotificationsApi } from '@/lib/api/notificationRules';
import { asList } from '@/lib/api/superadmin/http';
import {
  POLL_MS,
  createBadgePoller,
  isInboxRow,
  pollIsDue,
  showDesktopAlerts,
  unreadOf,
} from '@/lib/notifications/inboxPoller';
import { ALERTS_REFRESH, inboxItemHref, requestAlertsRefresh } from '@/lib/notifications/scenarios';

const PAGE_SIZE = 25;

function createdMs(row) {
  const t = Date.parse(row?.created_at || '');
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Bell + desktop alerts from GET /notifications/inbox*.
 * Badge polls unread-count; the list loads when the panel opens.
 * Desktop alerts use the browser Notification API after an in-UI grant, so polling
 * continues (more slowly) while the tab is hidden; that is when they are shown.
 * @param {string} portal  portal key, for the deep link a desktop alert opens
 * @param {(href: string) => void} [navigate]
 */
export function useSystemNotifications(portal = 'superadmin', navigate = null) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [desktop, setDesktop] = useState('unsupported');
  const openedAtRef = useRef('');
  const portalRef = useRef(portal);
  portalRef.current = portal;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const pollerRef = useRef(null);
  if (!pollerRef.current) {
    pollerRef.current = createBadgePoller({
      api: inboxNotificationsApi,
      onCount: setUnread,
      notify: (rows) => showDesktopAlerts(rows, {
        Ctor: typeof Notification === 'undefined' ? null : Notification,
        hidden: () => document.visibilityState !== 'visible',
        hrefFor: (row) => inboxItemHref(row, portalRef.current),
        open: (href) => {
          if (navigateRef.current) navigateRef.current(href);
          else window.location.assign(href);
        },
        focus: () => window.focus(),
      }),
    });
  }

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

  const pollBadge = useCallback(async () => {
    try {
      await pollerRef.current.poll();
    } catch {
      /* keep the last badge; the panel shows load errors */
    }
  }, []);

  const loadInbox = useCallback(async ({ silent = false, openedAt } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await inboxNotificationsApi.list({ page: 1, pageSize: PAGE_SIZE });
      const rows = asList(data, []).filter(isInboxRow);
      setItems(rows);
      setTotal(typeof data?.total === 'number' ? data.total : rows.length);
      const n = unreadOf(data, pollerRef.current.count());
      setUnread(n);
      pollerRef.current.sync(n);
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
    let lastPoll = Date.now();
    pollBadge();
    const tick = () => {
      if (cancelled) return;
      const permission = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
      const hidden = document.visibilityState === 'hidden';
      if (!pollIsDue({ hidden, permission, sinceLast: Date.now() - lastPoll })) return;
      lastPoll = Date.now();
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
    const n = unreadOf(data, Math.max(0, pollerRef.current.count() - 1));
    pollerRef.current.sync(n);
    setUnread(n);
    requestAlertsRefresh();
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
    pollerRef.current.sync(n);
    setUnread(n);
    requestAlertsRefresh();
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

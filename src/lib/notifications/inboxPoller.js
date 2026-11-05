import { asList } from '@/lib/api/superadmin/http';
import { isInterviewEvent } from '@/lib/product/interviewOff';

export const POLL_MS = 45000;
/** Browsers throttle hidden tabs anyway; this keeps background traffic low on top of that. */
export const HIDDEN_POLL_MS = 120000;
const MAX_DESKTOP_ALERTS = 3;

export function isInboxRow(row) {
  return Boolean(row) && !isInterviewEvent(row.event);
}

export function unreadOf(data, fallback = 0) {
  const n = Number(data?.unread_count);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** A hidden tab polls only if a desktop alert could actually be shown. */
export function pollIsDue({ hidden, permission, sinceLast }) {
  if (!hidden) return true;
  return permission === 'granted' && sinceLast >= HIDDEN_POLL_MS;
}

export function showDesktopAlerts(rows, {
  Ctor, hidden, hrefFor, open, focus = () => {},
}) {
  if (!Ctor || Ctor.permission !== 'granted' || !hidden()) return;
  rows.slice(0, MAX_DESKTOP_ALERTS).forEach((row) => {
    const title = row.title || row.event_label || 'Quirri alert';
    const body = row.body ? String(row.body) : 'Open Quirri to read this message.';
    try {
      const n = new Ctor(title, { body, tag: `quirri-${row.id}`, silent: false });
      n.onclick = () => {
        focus();
        const href = hrefFor(row);
        if (href) open(href);
        n.close();
      };
    } catch {
      /* some browsers throw if the service worker is missing */
    }
  });
}

/**
 * Unread badge state. The first poll only primes the count; after that, a rise fetches
 * the newest unread rows and hands exactly that many to `notify`.
 */
export function createBadgePoller({ api, notify, onCount }) {
  let last = 0;
  let primed = false;
  let inflight = null;

  const run = async () => {
    const n = unreadOf(await api.unreadCount(), 0);
    const risen = primed ? n - last : 0;
    last = n;
    primed = true;
    onCount(n);
    if (risen <= 0) return;
    try {
      const count = Math.min(risen, MAX_DESKTOP_ALERTS);
      const fresh = await api.list({ page: 1, pageSize: count, unreadOnly: true });
      notify(asList(fresh, []).filter(isInboxRow).slice(0, count));
    } catch {
      /* the badge has already updated */
    }
  };

  return {
    poll() {
      if (!inflight) inflight = run().finally(() => { inflight = null; });
      return inflight;
    },
    /** The panel or a mark-read call learned the count first. */
    sync(n) {
      last = n;
      primed = true;
    },
    count: () => last,
  };
}

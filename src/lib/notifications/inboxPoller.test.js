// FE-004: a new alert while the tab is hidden produces one desktop notification.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HIDDEN_POLL_MS,
  createBadgePoller,
  pollIsDue,
  showDesktopAlerts,
} from './inboxPoller';

class FakeNotification {
  static made = [];

  constructor(title, opts) {
    this.title = title;
    this.opts = opts;
    this.close = vi.fn();
    FakeNotification.made.push(this);
  }
}

const row = (id, event = 'content_published') => ({
  id, event, title: `Alert ${id}`, resource_type: 'edu_video_job', resource_id: `job-${id}`,
});

function setup({ counts, rows, hidden = true }) {
  const queue = [...counts];
  const api = {
    unreadCount: vi.fn(async () => ({ unread_count: queue.shift() })),
    list: vi.fn(async () => ({ items: rows })),
  };
  const notify = (fresh) => showDesktopAlerts(fresh, {
    Ctor: Object.assign(FakeNotification, { permission: 'granted' }),
    hidden: () => hidden,
    hrefFor: (r) => `/href/${r.id}`,
    open: vi.fn(),
  });
  const onCount = vi.fn();
  return { api, onCount, poller: createBadgePoller({ api, notify, onCount }) };
}

beforeEach(() => { FakeNotification.made = []; });

describe('pollIsDue', () => {
  it('polls on every tick while visible', () => {
    expect(pollIsDue({ hidden: false, permission: 'default', sinceLast: 0 })).toBe(true);
  });

  it('keeps polling at a slower pace while hidden when alerts are allowed', () => {
    expect(pollIsDue({ hidden: true, permission: 'granted', sinceLast: 1000 })).toBe(false);
    expect(pollIsDue({ hidden: true, permission: 'granted', sinceLast: HIDDEN_POLL_MS })).toBe(true);
  });

  it('stays quiet while hidden when alerts are not allowed', () => {
    expect(pollIsDue({ hidden: true, permission: 'default', sinceLast: HIDDEN_POLL_MS })).toBe(false);
    expect(pollIsDue({ hidden: true, permission: 'unsupported', sinceLast: HIDDEN_POLL_MS })).toBe(false);
  });
});

describe('createBadgePoller', () => {
  it('fires exactly one notification for one new alert while hidden', async () => {
    const { poller, onCount } = setup({ counts: [2, 3], rows: [row('new'), row('old-1'), row('old-2')] });
    await poller.poll();
    expect(FakeNotification.made).toHaveLength(0);
    await poller.poll();
    expect(FakeNotification.made.map((n) => n.title)).toEqual(['Alert new']);
    expect(onCount).toHaveBeenLastCalledWith(3);
  });

  it('caps a burst at three', async () => {
    const { poller } = setup({ counts: [0, 9], rows: [row(1), row(2), row(3), row(4)] });
    await poller.poll();
    await poller.poll();
    expect(FakeNotification.made).toHaveLength(3);
  });

  it('does not repeat an alert when two polls overlap', async () => {
    const { poller, api } = setup({ counts: [0, 1, 1], rows: [row(1)] });
    await poller.poll();
    await Promise.all([poller.poll(), poller.poll()]);
    expect(FakeNotification.made).toHaveLength(1);
    expect(api.unreadCount).toHaveBeenCalledTimes(2);
  });

  it('stays silent while the tab is visible', async () => {
    const { poller } = setup({ counts: [0, 1], rows: [row(1)], hidden: false });
    await poller.poll();
    await poller.poll();
    expect(FakeNotification.made).toHaveLength(0);
  });

  it('a count already synced from the panel does not alert again', async () => {
    const { poller } = setup({ counts: [0, 1], rows: [row(1)] });
    await poller.poll();
    poller.sync(1);
    await poller.poll();
    expect(FakeNotification.made).toHaveLength(0);
  });
});

describe('showDesktopAlerts', () => {
  it('opens the alert deep link on click', () => {
    const focus = vi.fn();
    const open = vi.fn();
    showDesktopAlerts([row(7)], {
      Ctor: Object.assign(FakeNotification, { permission: 'granted' }),
      hidden: () => true,
      hrefFor: (r) => `/student/subjects?chapter=${r.resource_id}`,
      open,
      focus,
    });
    FakeNotification.made[0].onclick();
    expect(focus).toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith('/student/subjects?chapter=job-7');
    expect(FakeNotification.made[0].close).toHaveBeenCalled();
  });

  it('does nothing without permission', () => {
    showDesktopAlerts([row(1)], {
      Ctor: Object.assign(FakeNotification, { permission: 'denied' }),
      hidden: () => true,
      hrefFor: () => '',
      open: vi.fn(),
    });
    expect(FakeNotification.made).toHaveLength(0);
  });
});

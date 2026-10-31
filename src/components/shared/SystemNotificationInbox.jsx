'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FilterField,
  Icon,
  Pager,
  Panel,
  SectionState,
  SegTabs,
  countLabel,
} from '@/components/shared/module-ui';
import { inboxNotificationsApi } from '@/lib/api/notificationRules';
import { apiErrorMessage, asList } from '@/lib/api/superadmin/http';

function loadError(err) {
  if (err?.response?.status === 404) return 'Could not load alerts. Please try again.';
  return apiErrorMessage(err, 'Please try again.');
}
import { useAsyncResource } from '@/hooks/useAsyncResource';
import {
  ALERTS_REFRESH,
  groupAlertsByDay,
  inboxItemHref,
  timeOf,
} from '@/lib/notifications/scenarios';

const PAGE_SIZE = 25;

const FILTERS = [
  { value: 'all', label: 'All messages' },
  { value: 'review', label: 'Review alerts' },
  { value: 'other', label: 'Other messages' },
];

const REVIEW_EVENTS = new Set(['content_ready_for_review', 'mcq_ready_for_review']);

function isReview(event) {
  return REVIEW_EVENTS.has(event);
}

const EMPTY = {
  superadmin: ['No alerts yet', 'You’ll see one when a video finishes or a review needs you.'],
  admin: ['No alerts yet', 'You’ll see one when a video finishes or a review needs you.'],
  faculty: ['No messages yet', 'You’ll get one when a chapter in your scope is sent for review.'],
  student: ['No messages yet', 'You’ll get one when a chapter is published or an assessment opens.'],
};

/**
 * Personal in-app inbox from GET /notifications/inbox —
 * Super Admin, College Admin, HOD/Faculty, Student.
 */
export default function SystemNotificationInbox({
  portal = 'faculty',
  emptyTitle,
  emptyBody,
  showReviewFilter = false,
}) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState('all');
  const openedAtRef = useRef(new Date().toISOString());
  const { data, setData, loading, error, reload } = useAsyncResource(
    () => inboxNotificationsApi.list({ page, pageSize: PAGE_SIZE }),
    [page],
  );
  const rows = useMemo(() => asList(data, []), [data]);
  const first = loading && !data;
  const shown = showReviewFilter
    ? rows.filter((r) => kind === 'all' || isReview(r.event) === (kind === 'review'))
    : rows;
  const reviewCount = rows.filter((r) => isReview(r.event)).length;
  const kindCount = { all: rows.length, review: reviewCount, other: rows.length - reviewCount };
  const groups = useMemo(() => groupAlertsByDay(shown), [shown]);
  const [emptyH, emptyP] = EMPTY[portal] || EMPTY.faculty;
  const unreadCount = Number(data?.unread_count) || 0;
  const tools = (showReviewFilter || unreadCount > 0) ? (
    <>
      {showReviewFilter ? (
        <FilterField label="Show" grow="status">
          <SegTabs
            label="Show"
            value={kind}
            onChange={setKind}
            options={FILTERS.map((f) => ({ ...f, count: countLabel(kindCount[f.value]) }))}
          />
        </FilterField>
      ) : null}
      {unreadCount > 0 ? (
        <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={markAll}>
          Mark all as read
        </button>
      ) : null}
    </>
  ) : null;

  const openRow = async (row) => {
    if (row?.id && !row.is_read) {
      try {
        const next = await inboxNotificationsApi.markRead(row.id);
        setData((prev) => {
          if (!prev) return prev;
          const items = asList(prev, []).map((r) => (
            r.id === row.id ? { ...r, is_read: true, read_at: next?.read_at || r.read_at } : r
          ));
          return { ...prev, items, unread_count: Number(next?.unread_count) ?? Math.max(0, unreadCount - 1) };
        });
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(ALERTS_REFRESH));
      } catch {
        /* still open the page */
      }
    }
    const href = inboxItemHref(row, portal);
    if (href) router.push(href);
  };

  const markAll = async () => {
    try {
      const next = await inboxNotificationsApi.markAllRead({ before: openedAtRef.current });
      const cut = Date.parse(openedAtRef.current);
      setData((prev) => {
        if (!prev) return prev;
        const items = asList(prev, []).map((r) => {
          const t = Date.parse(r.created_at || '');
          return !Number.isNaN(cut) && !Number.isNaN(t) && t <= cut ? { ...r, is_read: true } : r;
        });
        return { ...prev, items, unread_count: Number(next?.unread_count) || 0 };
      });
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(ALERTS_REFRESH));
    } catch {
      /* keep current rows */
    }
  };

  return (
    <Panel
      className="sn-inbox"
      title="Your alerts"
      sub={data ? `${countLabel(data.total ?? rows.length)} · newest first` : 'Newest first'}
      bodyClassName={null}
      toolbar={tools}
    >
      {error ? (
        <div className="sp-panel-b">
          <SectionState
            tone="err"
            title="Could not load notifications"
            action={<button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload()}>Try again</button>}
          >
            {loadError(error)}
          </SectionState>
        </div>
      ) : null}
      {first ? <div className="sp-panel-b"><SectionState title="Loading…" /></div> : null}
      {data && !rows.length ? (
        <div className="sp-panel-b">
          <SectionState title={emptyTitle || emptyH}>{emptyBody || emptyP}</SectionState>
        </div>
      ) : null}
      {rows.length && !shown.length ? (
        <div className="sp-panel-b">
          <SectionState title={kind === 'review' ? 'No review alerts' : 'No other messages'}>
            {kind === 'review' ? 'Nothing was sent for your review.' : 'Only review alerts are in this inbox.'}
          </SectionState>
        </div>
      ) : null}
      {groups.map((g) => (
        <section key={g.key} className="fa-day" aria-label={g.label}>
          <h4 className="fa-day-h">{g.label}</h4>
          <ul className="fa-notes">
            {g.rows.map((r) => {
              const review = isReview(r.event);
              const href = inboxItemHref(r, portal);
              return (
                <li key={r.id} className={r.is_read ? undefined : 'is-unread'}>
                  <span className={`sp-row-ic fa-kind fa-kind--${review ? 'video' : 'other'}`} aria-hidden="true">
                    <Icon name={review ? 'video' : 'bell'} size={18} />
                  </span>
                  <div className="fa-note-main">
                    <b>{r.title || r.event_label || 'Alert'}</b>
                    {r.body ? <small>{r.body}</small> : null}
                    <small className="fa-note-meta">{timeOf(r.created_at)}</small>
                  </div>
                  {href ? (
                    <button type="button" className="sp-link" onClick={() => openRow(r)}>
                      Open <Icon name="arrow" size={14} />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {rows.length && (shown.length || (data?.total ?? rows.length) > PAGE_SIZE) ? (
        <Pager page={page} pageSize={PAGE_SIZE} total={data?.total ?? rows.length} shown={rows.length} onPage={setPage} noun="messages" />
      ) : null}
    </Panel>
  );
}

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FilterField,
  Icon,
  Pager,
  Panel,
  SectionState,
  SegTabs,
  countLabel,
} from '@/components/shared/module-ui';
import { myNotificationsApi } from '@/lib/api/notificationRules';
import { apiErrorMessage, asList } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import {
  ALERTS_REFRESH,
  alertHref,
  eventLabel,
  groupAlertsByDay,
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
  superadmin: ['No alerts yet', 'Test sends and messages addressed to you appear here.'],
  admin: ['No alerts yet', 'Test sends and messages addressed to you appear here.'],
  faculty: ['No messages yet', 'You’ll get one when a chapter in your scope is sent for review.'],
  student: ['No messages yet', 'You’ll get one when a chapter is published or an assessment opens.'],
};

/**
 * Personal inbox from GET /notifications/mine — Super Admin, College Admin, HOD/Faculty, Student.
 */
export default function SystemNotificationInbox({
  portal = 'faculty',
  emptyTitle,
  emptyBody,
  showReviewFilter = false,
}) {
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState('all');
  const { data, loading, error, reload } = useAsyncResource(
    () => myNotificationsApi.list({ page, pageSize: PAGE_SIZE, days: 90 }),
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

  return (
    <Panel
      className="sn-inbox"
      title="Your alerts"
      sub={data ? `${countLabel(data.total ?? rows.length)} in the last 90 days · newest first` : 'Newest first'}
      bodyClassName={null}
      toolbar={showReviewFilter ? (
        <FilterField label="Show" grow="status">
          <SegTabs
            label="Show"
            value={kind}
            onChange={setKind}
            options={FILTERS.map((f) => ({ ...f, count: countLabel(kindCount[f.value]) }))}
          />
        </FilterField>
      ) : null}
    >
      {error ? (
        <div className="sp-panel-b">
          <SectionState
            tone="err"
            title="Could not load notifications"
            action={<button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload()}>Try again</button>}
          >
            {apiErrorMessage(error, 'Please try again.')}
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
            {kind === 'review' ? 'Nothing was sent for your review in the last 90 days.' : 'Only review alerts arrived in the last 90 days.'}
          </SectionState>
        </div>
      ) : null}
      {groups.map((g) => (
        <section key={g.key} className="fa-day" aria-label={g.label}>
          <h4 className="fa-day-h">{g.label}</h4>
          <ul className="fa-notes">
            {g.rows.map((r) => {
              const review = isReview(r.event);
              const href = alertHref(r.event, portal);
              const label = eventLabel(r.event, r.event_label);
              return (
                <li key={r.id}>
                  <span className={`sp-row-ic fa-kind fa-kind--${review ? 'video' : 'other'}`} aria-hidden="true">
                    <Icon name={review ? 'video' : 'bell'} size={18} />
                  </span>
                  <div className="fa-note-main">
                    <b>{label}</b>
                    {r.subject ? <small>{r.subject}</small> : null}
                    <small className="fa-note-meta">
                      {[timeOf(r.created_at), r.channel === 'email' ? 'Email' : null].filter(Boolean).join(' · ')}
                      {r.status_key === 'failed' || r.status === 'failed' ? (
                        <span className="sp-pill sp-pill--off"><i className="un-dot" aria-hidden="true" />Not delivered</span>
                      ) : null}
                    </small>
                  </div>
                  {href ? (
                    <Link className="sp-link" href={href} onClick={() => {
                      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(ALERTS_REFRESH));
                    }}>
                      Open <Icon name="arrow" size={14} />
                    </Link>
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

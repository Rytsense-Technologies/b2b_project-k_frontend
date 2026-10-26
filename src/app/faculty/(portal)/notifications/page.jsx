'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FilterField,
  Icon,
  ModulePage,
  Pager,
  Panel,
  SectionState,
  SegTabs,
  TabNav,
  TabPanel,
  countLabel,
} from '@/components/shared/module-ui';
import { myNotificationsApi } from '@/lib/api/faculty/directory';
import { apiErrorMessage, asList } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useTabParam } from '@/hooks/useUrlState';
import { useFacultyScope } from '@/hooks/useFacultyScope';
import NotificationRules from '@/components/shared/NotificationRules';

const PAGE_SIZE = 25;
const KINDS = ['all', 'review', 'other'];
const SECTIONS = ['messages', 'rules'];
const REVIEW_EVENT = 'content_ready_for_review';
const CHANNEL = { email: 'Email', whatsapp: 'WhatsApp' };
const FILTERS = [
  { value: 'all', label: 'All messages' },
  { value: 'review', label: 'Review alerts' },
  { value: 'other', label: 'Other messages' },
];

const TZ = 'Asia/Kolkata';

function dayKey(iso) {
  const d = new Date(iso || '');
  return Number.isNaN(d.getTime()) ? 'unknown' : d.toLocaleDateString('en-CA', { timeZone: TZ });
}

function dayHeading(iso) {
  const d = new Date(iso || '');
  if (Number.isNaN(d.getTime())) return 'Earlier';
  const key = dayKey(iso);
  const today = dayKey(new Date().toISOString());
  const yest = dayKey(new Date(Date.now() - 86400000).toISOString());
  if (key === today) return 'Today';
  if (key === yest) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
}

function timeOf(iso) {
  const d = new Date(iso || '');
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ }).toLowerCase();
}

/**
 * Messages Quirri sent this HOD / Faculty member (review alerts and more), grouped by day,
 * plus the email switches: HOD = their department's rules, Faculty = their own preferences.
 */
function FacultyNotificationsView() {
  const { scope } = useFacultyScope();
  const isHod = Boolean(scope?.is_hod) || String(scope?.role || '').toLowerCase() === 'hod';
  const [section, setSection] = useTabParam(SECTIONS, 'messages');
  const [page, setPage] = useState(1);
  const [kind, setKind] = useTabParam(KINDS, 'all', 'show');
  const { data, loading, error, reload } = useAsyncResource(
    () => myNotificationsApi.list({ page, pageSize: PAGE_SIZE, days: 90 }),
    [page],
  );
  const rows = useMemo(() => asList(data, []), [data]);
  const first = loading && !data;
  const shown = rows.filter((r) => kind === 'all' || (kind === 'review') === (r.event === REVIEW_EVENT));
  const reviewCount = rows.filter((r) => r.event === REVIEW_EVENT).length;
  const kindCount = { all: rows.length, review: reviewCount, other: rows.length - reviewCount };

  const groups = useMemo(() => {
    const out = [];
    shown.forEach((r) => {
      const k = dayKey(r.created_at);
      const last = out[out.length - 1];
      if (last && last.key === k) last.rows.push(r);
      else out.push({ key: k, label: dayHeading(r.created_at), rows: [r] });
    });
    return out;
  }, [shown]);

  const sections = [
    { value: 'messages', label: 'Messages' },
    { value: 'rules', label: isHod ? 'Rules' : 'My notifications' },
  ];

  return (
    <ModulePage className="fa-page">
      <TabNav label="Notification sections" idBase="fa-notif" value={section} onChange={setSection} tabs={sections} />
      <TabPanel value="rules" current={section} idBase="fa-notif">
        {/* The server picks the scope (HOD = department, Faculty = personal); /faculty/me only decides "Send test". */}
        <NotificationRules canTest={isHod} />
      </TabPanel>
      <TabPanel value="messages" current={section} idBase="fa-notif">
      {error ? (
        <SectionState
          tone="err"
          title="Could not load notifications"
          action={<button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload()}>Try again</button>}
        >
          {apiErrorMessage(error, 'Please try again.')}
        </SectionState>
      ) : null}
      <Panel
        title="Messages"
        sub={data ? `${countLabel(data.total ?? rows.length)} in the last 90 days · newest first` : 'Newest first'}
        bodyClassName={null}
        toolbar={(
          <FilterField label="Show" grow="status">
            <SegTabs
              label="Show"
              value={kind}
              onChange={setKind}
              options={FILTERS.map((f) => ({ ...f, count: countLabel(kindCount[f.value]) }))}
            />
          </FilterField>
        )}
      >
        {first ? <div className="sp-panel-b"><SectionState title="Loading…" /></div> : null}
        {data && !rows.length ? (
          <div className="sp-panel-b">
            <SectionState title="No messages yet">You&apos;ll get one when a chapter in your scope is sent for review.</SectionState>
          </div>
        ) : null}
        {rows.length && !shown.length ? (
          <div className="sp-panel-b">
            {(data?.total ?? rows.length) > PAGE_SIZE ? (
              <SectionState title={kind === 'review' ? 'No review alerts on this page' : 'No other messages on this page'}>Try the next page, or switch to All messages.</SectionState>
            ) : (
              <SectionState title={kind === 'review' ? 'No review alerts' : 'No other messages'}>
                {kind === 'review' ? 'Nothing was sent for your review in the last 90 days.' : 'Only review alerts arrived in the last 90 days.'}
              </SectionState>
            )}
          </div>
        ) : null}
        {groups.map((g) => (
          <section key={g.key} className="fa-day" aria-label={g.label}>
            <h4 className="fa-day-h">{g.label}</h4>
            <ul className="fa-notes">
              {g.rows.map((r) => {
                const review = r.event === REVIEW_EVENT;
                return (
                  <li key={r.id}>
                    <span className={`sp-row-ic fa-kind fa-kind--${review ? 'video' : 'other'}`} aria-hidden="true">
                      <Icon name={review ? 'video' : 'bell'} size={18} />
                    </span>
                    <div className="fa-note-main">
                      <b>{r.event_label}</b>
                      {r.subject ? <small>{r.subject}</small> : null}
                      <small className="fa-note-meta">
                        {[timeOf(r.created_at), CHANNEL[r.channel] || r.channel].filter(Boolean).join(' · ')}
                        {r.status_key === 'failed' ? <span className="sp-pill sp-pill--off"><i className="un-dot" aria-hidden="true" />Not delivered</span> : null}
                      </small>
                    </div>
                    {review ? (
                      <Link className="sp-link" href="/faculty/videos?tab=review">Review <Icon name="arrow" size={14} /></Link>
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
      </TabPanel>
    </ModulePage>
  );
}

export default function FacultyNotificationsPage() {
  return (
    <Suspense fallback={<SectionState title="Loading notifications…" />}>
      <FacultyNotificationsView />
    </Suspense>
  );
}

'use client';

import { useMemo, useState } from 'react';
import {
  KpiRow,
  ModuleBanner,
  ModulePage,
  Pager,
  Panel,
  SectionState,
  countLabel,
} from '@/components/shared/module-ui';
import { myNotificationsApi } from '@/lib/api/faculty/directory';
import { apiErrorMessage, asList } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

const PAGE_SIZE = 25;
const TONE = { sent: 'sp-pill--good', failed: 'sp-pill--err', log_only: 'sp-pill--off' };
const CHANNEL = { email: 'Email', whatsapp: 'WhatsApp' };

function when(iso) {
  const d = new Date(iso || '');
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
}

/** Messages Quirri sent this HOD / Faculty member (review alerts and more). */
export default function FacultyNotificationsPage() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsyncResource(
    () => myNotificationsApi.list({ page, pageSize: PAGE_SIZE, days: 90 }),
    [page],
  );
  const rows = useMemo(() => asList(data, []), [data]);
  const first = loading && !data;
  const reviews = rows.filter((r) => r.event === 'content_ready_for_review').length;

  return (
    <ModulePage className="fa-page">
      <ModuleBanner
        icon="bell"
        eyebrow="Account"
        title="Notifications"
        lede="Chapters sent for your review and other messages Quirri sent you in the last 90 days."
      />
      <KpiRow
        label="Notifications summary"
        items={[
          { icon: 'bell', label: 'Messages', value: first ? null : countLabel(data?.total ?? 0), sub: 'Last 90 days' },
          { icon: 'video', label: 'Review alerts', value: first ? null : countLabel(reviews), sub: 'On this page' },
        ]}
      />
      {error ? (
        <SectionState
          tone="err"
          title="Could not load notifications"
          action={<button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload()}>Try again</button>}
        >
          {apiErrorMessage(error, 'Please try again.')}
        </SectionState>
      ) : null}
      <Panel title="Messages" sub="Newest first" bodyClassName={null}>
        {first ? <div className="sp-panel-b"><SectionState title="Loading…" /></div> : null}
        {data && !rows.length ? (
          <div className="sp-panel-b">
            <SectionState title="No messages yet">You&apos;ll get one when a chapter in your scope is sent for review.</SectionState>
          </div>
        ) : null}
        {rows.length ? (
          <>
            <div className="sp-table-wrap">
              <table className="sp-table un-table ad-stack">
                <thead><tr><th>Message</th><th>Channel</th><th>Status</th><th>Time</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td><b>{r.event_label}</b>{r.subject ? <small className="ad-cell-sub">{r.subject}</small> : null}</td>
                      <td data-label="Channel">{CHANNEL[r.channel] || r.channel}</td>
                      <td data-label="Status"><span className={`sp-pill ${TONE[r.status_key] || ''}`}><i className="un-dot" aria-hidden="true" />{r.status}</span></td>
                      <td data-label="Time" className="sa-muted">{when(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} pageSize={PAGE_SIZE} total={data?.total ?? rows.length} shown={rows.length} onPage={setPage} noun="messages" />
          </>
        ) : null}
      </Panel>
    </ModulePage>
  );
}

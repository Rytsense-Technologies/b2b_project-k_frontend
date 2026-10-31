'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Icon,
  FilterField,
  ModuleHead,
  ModulePage,
  Pager,
  Panel,
  SearchBox,
  SectionState,
  SegTabs,
  TabNav,
  TabPanel,
  countLabel,
} from '@/components/shared/module-ui';
import NotificationRules from '@/components/shared/NotificationRules';
import SystemNotificationInbox from '@/components/shared/SystemNotificationInbox';
import { QuirriSelect } from '@/components/superadmin/quirri-ui';
import { notificationsApi, fetchData } from '@/lib/api/superadmin/modules';
import { usersApi } from '@/lib/api/superadmin/users';
import { apiErrorMessage, asList } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useUrlState, useTabParam } from '@/hooks/useUrlState';

const PAGE_SIZE = 10; // quirri-b2c-student-ui: lists page at 10
const TABS = [
  { value: 'rules', label: 'Rules' },
  { value: 'alerts', label: 'Your alerts' },
  { value: 'deliveries', label: 'Deliveries' },
];
const TONE = { sent: 'sp-pill--good', failed: 'sp-pill--err', log_only: 'sp-pill--off', skipped: 'sp-pill--off' };
const CHANNEL = { email: 'Email', whatsapp: 'WhatsApp' };
/** Events a college can receive (backend notification_service.EVENTS; GET /notifications/deliveries?event=). */
const EVENT_OPTIONS = [
  { value: '', label: 'All events' },
  { value: 'account_activation', label: 'Account activation invite' },
  { value: 'password_reset', label: 'Password reset link' },
  { value: 'verification_code', label: 'Verification code' },
  { value: 'password_changed', label: 'Password changed' },
  { value: 'account_status_changed', label: 'Account status changed' },
  { value: 'hod_assigned', label: 'HOD assigned' },
  { value: 'subjects_assigned', label: 'Subjects assigned' },
  { value: 'student_placement_changed', label: 'Student placement changed' },
  { value: 'pipeline_completed', label: 'Video pipeline finished' },
  { value: 'content_ready_for_review', label: 'Content ready for review' },
  { value: 'changes_requested', label: 'Changes requested' },
  { value: 'content_published', label: 'Chapter published' },
  { value: 'mcq_ready_for_review', label: 'Assessment ready for review' },
  { value: 'assessment_available', label: 'Assessment available' },
  { value: 'assessment_result', label: 'Assessment result' },
];
const CHANNEL_OPTIONS = [
  { value: '', label: 'All channels' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
];
const RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];
/** Empty state per status filter (no search). */
const EMPTY_BY_STATUS = {
  sent: ['No delivered messages in this range', 'Invites and alerts appear here once they reach the person.'],
  failed: ['No failed messages', 'Every message in this range was delivered or recorded.'],
  log_only: ['No log-only messages', 'Messages are recorded here only while email sending is switched off.'],
  skipped: ['No skipped messages', 'Messages appear here when a notification rule turned them off.'],
};

function when(iso) {
  const d = new Date(iso || '');
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
}

/**
 * College Admin: messages Quirri sent to people in this college (activation
 * invites, content / assessment alerts) and their delivery
 * status. The server only returns this college's rows.
 */
function NotificationsLog() {
  const [tab, setTab] = useTabParam(TABS.map((t) => t.value), 'rules');
  const [url, setUrl] = useUrlState({ q: '', status: '', event: '', channel: '', days: '90', page: '1' });
  const [searchInput, setSearchInput] = useState(url.q);
  const [busy, setBusy] = useState('');
  const page = Math.max(1, Number(url.page) || 1);
  const days = RANGE_OPTIONS.some((o) => o.value === url.days) ? url.days : '90';

  useEffect(() => { setSearchInput(url.q); }, [url.q]);
  useEffect(() => {
    if (searchInput === url.q) return undefined;
    const t = setTimeout(() => setUrl({ q: searchInput.trim(), page: '1' }), 300);
    return () => clearTimeout(t);
  }, [searchInput, url.q, setUrl]);

  const { data, loading, error, reload } = useAsyncResource(
    () => fetchData(() => notificationsApi.listDeliveries({
      status: url.status,
      event: url.event,
      channel: url.channel,
      q: url.q,
      page,
      page_size: PAGE_SIZE,
      days: Number(days),
    })),
    [url.status, url.event, url.channel, url.q, page, days],
  );
  const rows = useMemo(() => asList(data, []), [data]);
  // `summary` covers the whole range only (the API ignores event / channel / search for it), so the
  // Retry action uses it. The status tab counts follow every filter: with a narrowing filter set we
  // ask for the total of each status (page_size 1) with the same filters.
  const summary = data?.summary || { sent: 0, failed: 0, log_only: 0, skipped: 0 };
  const first = loading && !data;
  const narrowed = Boolean(url.event || url.channel || url.q);
  const { data: filteredCounts } = useAsyncResource(async () => {
    if (!narrowed) return null;
    const one = (status) => fetchData(() => notificationsApi.listDeliveries({
      status, event: url.event, channel: url.channel, q: url.q, page: 1, page_size: 1, days: Number(days),
    })).then((r) => (typeof r?.total === 'number' ? r.total : 0));
    const [sent, failed, logOnly, skipped] = await Promise.all([one('sent'), one('failed'), one('log_only'), one('skipped')]);
    return { sent, failed, log_only: logOnly, skipped, key: [url.event, url.channel, url.q, days].join('|') };
  }, [narrowed, url.event, url.channel, url.q, days]);
  const countsKey = [url.event, url.channel, url.q, days].join('|');
  const tabCounts = narrowed
    ? (filteredCounts && filteredCounts.key === countsKey ? filteredCounts : null)
    : (data ? summary : null);
  const sum = tabCounts ? (tabCounts.sent || 0) + (tabCounts.failed || 0) + (tabCounts.log_only || 0) + (tabCounts.skipped || 0) : null;
  const statusTabs = [
    { value: '', label: 'All', count: sum == null ? null : countLabel(sum) },
    { value: 'sent', label: 'Delivered', count: tabCounts ? countLabel(tabCounts.sent || 0) : null },
    { value: 'failed', label: 'Failed', count: tabCounts ? countLabel(tabCounts.failed || 0) : null },
    { value: 'log_only', label: 'Log-only', count: tabCounts ? countLabel(tabCounts.log_only || 0) : null },
    { value: 'skipped', label: 'Skipped', count: tabCounts ? countLabel(tabCounts.skipped || 0) : null },
  ];
  const filtered = Boolean(url.q || url.status || url.event || url.channel || days !== '90');
  const clearFilters = () => {
    setSearchInput('');
    setUrl({ q: '', status: '', event: '', channel: '', days: '90', page: '1' });
  };

  const retry = async () => {
    setBusy('retry');
    try {
      const res = await fetchData(() => notificationsApi.retryFailed());
      if (res?.provider_ready === false || res?.failed) toast.error(res?.message || 'Some emails still failed');
      else toast.success(res?.message || 'Retry finished');
      await reload();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not retry failed emails.'));
    } finally {
      setBusy('');
    }
  };

  const resend = async (row) => {
    setBusy(row.id);
    try {
      await usersApi.resendInvite(row.recipient);
      toast.success(`Activation link sent again to ${row.recipient}`);
      await reload();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not resend the invite. The account may already be active.'));
    } finally {
      setBusy('');
    }
  };

  return (
    <ModulePage className="ad-page">
      <ModuleHead
        actions={tab === 'deliveries' && summary.failed ? (
          <button type="button" className="sd-btn sd-btn--amber" onClick={retry} disabled={busy === 'retry'}>
            <Icon name="refresh" size={16} />
            {busy === 'retry' ? 'Retrying…' : `Retry ${countLabel(summary.failed)} failed`}
          </button>
        ) : null}
      />

      <TabNav tabs={TABS} value={tab} onChange={setTab} label="Notification sections" idBase="ad-notif" />

      <TabPanel value="rules" current={tab} idBase="ad-notif">
        <NotificationRules canTest />
      </TabPanel>

      <TabPanel value="alerts" current={tab} idBase="ad-notif">
        <SystemNotificationInbox portal="admin" />
      </TabPanel>

      <TabPanel value="deliveries" current={tab} idBase="ad-notif">
      {data && summary.log_only && !summary.sent ? (
        <SectionState title="Emails are being recorded, not sent">
          Quirri&apos;s email service isn&apos;t connected yet, so invites are logged here instead of delivered. Your Super Admin
          connects it; until then share activation links another way or resend once it is live.
        </SectionState>
      ) : null}

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
        title="Deliveries"
        sub={data ? `${countLabel(data?.total ?? 0)} message${data?.total === 1 ? '' : 's'} · newest first` : 'Newest first'}
        bodyClassName={null}
        toolbar={(
          <>
            <FilterField label="Search" grow="search">
              <SearchBox placeholder="Email or subject" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
            </FilterField>
            <FilterField label="Event">
              <QuirriSelect
                ariaLabel="Event"
                value={url.event}
                onChange={(e) => setUrl({ event: e.target.value, page: '1' })}
                options={EVENT_OPTIONS}
              />
            </FilterField>
            <FilterField label="Channel">
              <QuirriSelect
                ariaLabel="Channel"
                value={url.channel}
                onChange={(e) => setUrl({ channel: e.target.value, page: '1' })}
                options={CHANNEL_OPTIONS}
              />
            </FilterField>
            <FilterField label="Period">
              <QuirriSelect
                ariaLabel="Period"
                value={days}
                onChange={(e) => setUrl({ days: e.target.value || '90', page: '1' })}
                options={RANGE_OPTIONS}
              />
            </FilterField>
            {filtered ? (
              <FilterField grow="clear">
                <button type="button" className="sd-btn sd-btn--ghost" onClick={clearFilters}>Clear</button>
              </FilterField>
            ) : null}
            <FilterField label="Status" grow="status">
              <SegTabs label="Status" options={statusTabs} value={url.status} onChange={(v) => setUrl({ status: v, page: '1' })} />
            </FilterField>
          </>
        )}
      >
        {first ? <div className="sp-panel-b"><SectionState title="Loading deliveries…" /></div> : null}
        {data && !rows.length ? (
          <div className="sp-panel-b">
            {url.q || url.event || url.channel ? (
              <SectionState
                title="No messages match these filters"
                action={<button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={clearFilters}>Clear filters</button>}
              >
                Try another email address, event or channel, or a longer date range.
              </SectionState>
            ) : EMPTY_BY_STATUS[url.status] ? (
              <SectionState title={EMPTY_BY_STATUS[url.status][0]}>{EMPTY_BY_STATUS[url.status][1]}</SectionState>
            ) : (
              <SectionState title="No messages in this range">Invites appear here when you add students or staff.</SectionState>
            )}
          </div>
        ) : null}
        {rows.length ? (
          <div className="sp-table-wrap">
            <table className="sp-table un-table ad-stack">
              <thead>
                <tr>
                  <th>Message</th>
                  <th>Recipient</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  // The subject often repeats the event name ("Assessment available: X"); show only what is new.
                  const label = r.event_label || '';
                  const subject = r.subject && r.subject !== label
                    ? (label && r.subject.startsWith(label) ? r.subject.slice(label.length).replace(/^[\s:–—-]+/, '') : r.subject)
                    : '';
                  return (
                    <tr key={r.id}>
                      <td>
                        <b>{label || r.subject || 'Message'}</b>
                        {subject ? <small className="ad-cell-sub">{subject}</small> : null}
                      </td>
                      <td data-label="Recipient" className="ad-break">{r.recipient}</td>
                      <td data-label="Channel">{CHANNEL[r.channel] || r.channel}</td>
                      <td data-label="Status">
                        <span className={`sp-pill ${TONE[r.status_key] || ''}`}><i className="un-dot" aria-hidden="true" />{r.status}</span>
                        {r.error ? <small className={`ad-cell-sub${r.status_key === 'skipped' ? '' : ' sa-err-text'}`}>{r.error}</small> : null}
                        {r.test_redirect ? <small className="ad-cell-sub">Test mode · sent to the QA inbox</small> : null}
                      </td>
                      <td data-label="Time" className="sa-muted">{when(r.updated_at || r.created_at)}</td>
                      <td>
                        {r.event === 'account_activation' && r.channel === 'email' && r.status_key !== 'sent' ? (
                          <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => resend(r)} disabled={Boolean(busy)}>
                            <Icon name="send" size={14} /> {busy === r.id ? 'Sending…' : 'Resend invite'}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        {rows.length ? (
          <Pager page={page} pageSize={PAGE_SIZE} total={data?.total ?? rows.length} shown={rows.length} onPage={(p) => setUrl({ page: String(p) }, { push: true })} noun="messages" />
        ) : null}
      </Panel>
      </TabPanel>
    </ModulePage>
  );
}

export default function AdminNotificationsPage() {
  return (
    <Suspense fallback={<SectionState title="Loading notifications…" />}>
      <NotificationsLog />
    </Suspense>
  );
}

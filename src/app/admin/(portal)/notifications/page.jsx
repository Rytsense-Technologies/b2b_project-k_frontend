'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FilterBar,
  Icon,
  KpiRow,
  ModuleBanner,
  ModulePage,
  Pager,
  Panel,
  SearchBox,
  SectionState,
  SegTabs,
  countLabel,
} from '@/components/shared/module-ui';
import { notificationsApi, fetchData } from '@/lib/api/superadmin/modules';
import { usersApi } from '@/lib/api/superadmin/users';
import { apiErrorMessage, asList } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

const PAGE_SIZE = 25;
const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'sent', label: 'Delivered' },
  { value: 'failed', label: 'Failed' },
  { value: 'log_only', label: 'Log-only' },
];
const TONE = { sent: 'sp-pill--good', failed: 'sp-pill--err', log_only: 'sp-pill--off' };
const CHANNEL = { email: 'Email', whatsapp: 'WhatsApp' };

function when(iso) {
  const d = new Date(iso || '');
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
}

/**
 * College Admin: messages Quirri sent to people in this college (activation
 * invites, content / assessment alerts, interview results) and their delivery
 * status. The server only returns this college's rows.
 */
export default function AdminNotificationsPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState('');
  useEffect(() => { setPage(1); }, [status, search]);

  const { data, loading, error, reload } = useAsyncResource(
    () => fetchData(() => notificationsApi.listDeliveries({ status, q: search, page, page_size: PAGE_SIZE, days: 90 })),
    [status, search, page],
  );
  const rows = useMemo(() => asList(data, []), [data]);
  const summary = data?.summary || { sent: 0, failed: 0, log_only: 0 };
  const first = loading && !data;

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
      <ModuleBanner
        icon="bell"
        eyebrow="Account"
        title="Notifications"
        lede="Activation invites and alerts Quirri sent to students and staff in your college, with their delivery status. Last 90 days."
        actions={(
          <button type="button" className="sd-btn sd-btn--amber" onClick={retry} disabled={busy === 'retry' || !summary.failed}>
            <Icon name="refresh" size={16} />
            {busy === 'retry' ? 'Retrying…' : summary.failed ? `Retry ${countLabel(summary.failed)} failed` : 'Retry failed emails'}
          </button>
        )}
      />

      <KpiRow
        label="Delivery summary"
        items={[
          { icon: 'tick', label: 'Delivered', value: first ? null : countLabel(summary.sent), sub: 'Accepted by the email service' },
          { icon: 'alert', label: 'Failed', value: first ? null : countLabel(summary.failed), sub: summary.failed ? 'Retry, or resend the invite' : 'Nothing to retry' },
          { icon: 'clock', label: 'Log-only', value: first ? null : countLabel(summary.log_only), sub: 'Recorded; email not connected yet' },
        ]}
      />

      {data && summary.log_only && !summary.sent ? (
        <SectionState title="Emails are being recorded, not sent">
          Quirri&apos;s email service isn&apos;t connected yet, so invites are logged here instead of delivered. Your Super Admin
          connects it; until then share activation links another way or resend once it is live.
        </SectionState>
      ) : null}

      <FilterBar label="Filter deliveries">
        <SearchBox placeholder="Search email address or subject…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <SegTabs label="Delivery status" options={STATUS_FILTERS} value={status} onChange={setStatus} />
      </FilterBar>

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
        sub="Newest first"
        action={<span className="sp-pill sp-pill--teal">{countLabel(data?.total ?? 0)} messages</span>}
        bodyClassName={null}
      >
        {first ? <div className="sp-panel-b"><SectionState title="Loading deliveries…" /></div> : null}
        {data && !rows.length ? (
          <div className="sp-panel-b">
            <SectionState title={status || search ? 'No messages match these filters' : 'No messages yet'}>
              Invites appear here when you add students or staff.
            </SectionState>
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
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <b>{r.event_label}</b>
                      {r.subject ? <small className="ad-cell-sub">{r.subject}</small> : null}
                    </td>
                    <td data-label="Recipient" className="ad-break">{r.recipient}</td>
                    <td data-label="Channel">{CHANNEL[r.channel] || r.channel}</td>
                    <td data-label="Status">
                      <span className={`sp-pill ${TONE[r.status_key] || ''}`}><i className="un-dot" aria-hidden="true" />{r.status}</span>
                      {r.error ? <small className="ad-cell-sub sa-err-text">{r.error}</small> : null}
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
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {rows.length ? (
          <Pager page={page} pageSize={PAGE_SIZE} total={data?.total ?? rows.length} shown={rows.length} onPage={setPage} noun="messages" />
        ) : null}
      </Panel>
    </ModulePage>
  );
}

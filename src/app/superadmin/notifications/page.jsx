'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ModulePage,
  ModuleBanner,
  KpiRow,
  FilterBar,
  SegTabs,
  SearchBox,
  Pager,
  Panel,
  Icon,
  SectionState,
  countLabel,
} from '@/components/shared/module-ui';
import { QuirriSelect } from '@/components/superadmin/quirri-ui';
import { notificationsApi } from '@/lib/api/superadmin/modules';
import { asList, apiErrorMessage, fetchOptional } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useLiveRefresh, useTimeAgo } from '@/hooks/useLiveRefresh';

const PAGE_SIZE = 25;

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'sent', label: 'Delivered' },
  { value: 'failed', label: 'Failed' },
  { value: 'log_only', label: 'Log-only' },
];

/** Delivered = green, Failed = red (a real failure), Log-only / not configured = neutral. */
const STATE_TONE = {
  sent: 'sp-pill--good',
  Live: 'sp-pill--good',
  failed: 'sp-pill--err',
  log_only: 'sp-pill--off',
  'Log-only': 'sp-pill--off',
  'Not configured': 'sp-pill--off',
};

const CHANNEL_LABEL = { email: 'Email', whatsapp: 'WhatsApp' };

function formatWhen(iso) {
  const d = new Date(iso || '');
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  });
}

function Pill({ tone, children, dot = true }) {
  return (
    <span className={`sp-pill ${tone || ''}`.trim()}>
      {dot ? <i className="un-dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

/** Empty panel body: Teal 300 outline icon, title, one line. */
function PanelEmpty({ icon, title, children }) {
  return (
    <div className="sa-empty">
      <span className="sa-empty-ic" aria-hidden="true"><Icon name={icon} size={24} /></span>
      <div>
        <b>{title}</b>
        {children ? <p>{children}</p> : null}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const [retrying, setRetrying] = useState(false);
  const [status, setStatus] = useState('');
  const [event, setEvent] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [status, event, search]);

  const { data: eventsData, loading: eventsLoading, error: eventsError, reload: reloadEvents } = useAsyncResource(
    () => fetchOptional(() => notificationsApi.listEvents()),
    [],
  );
  const { data: deliveriesData, loading: deliveriesLoading, error: deliveriesError, reload: reloadDeliveries } = useAsyncResource(
    () => fetchOptional(() => notificationsApi.listDeliveries({
      status, event, q: search, page, page_size: PAGE_SIZE,
    })),
    [status, event, search, page],
  );
  const ago = useTimeAgo(useLiveRefresh(() => Promise.all([reloadEvents(), reloadDeliveries()])));

  const events = useMemo(() => asList(eventsData, []), [eventsData]);
  const deliveries = useMemo(() => asList(deliveriesData, []), [deliveriesData]);
  const provider = eventsData?.provider || {};
  const summary = deliveriesData?.summary || { sent: 0, failed: 0, log_only: 0 };
  const unavailable = !eventsLoading && eventsData == null && !eventsError;
  const emailReady = Boolean(provider.email_ready);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const res = await fetchOptional(() => notificationsApi.retryFailed());
      const msg = res?.message || 'Retry finished';
      if (res?.provider_ready === false) toast.error(msg);
      else if (res?.failed) toast.error(msg);
      else toast.success(msg);
      await Promise.all([reloadEvents(), reloadDeliveries()]);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not retry failed deliveries.'));
    } finally {
      setRetrying(false);
    }
  };

  const eventOptions = [{ value: '', label: 'All events' }, ...events.map((e) => ({ value: e.id, label: e.event }))];

  return (
    <ModulePage className="sa-page">
      <ModuleBanner
        icon="bell"
        eyebrow="Operations"
        title="Notifications"
        lede="Every email and WhatsApp message Quirri sends — activation, content, assignments, interview results and pipeline completion — with its delivery status."
        chips={(
          <>
            <span className={emailReady ? 'is-on' : undefined}>
              <Icon name="mail" size={14} /> Email · {provider.email || 'Log-only'}
            </span>
            <span>WhatsApp · {provider.whatsapp || 'Not configured'}</span>
            <span><Icon name="refresh" size={14} /> Live · {ago}</span>
          </>
        )}
        actions={(
          <button
            type="button"
            className="sd-btn sd-btn--amber"
            onClick={handleRetry}
            disabled={retrying || !summary.failed}
          >
            <Icon name="refresh" size={16} />
            {retrying ? 'Retrying…' : summary.failed ? `Retry ${summary.failed} failed` : 'Retry failed deliveries'}
          </button>
        )}
      />

      <KpiRow
        label="Notifications summary"
        items={[
          { icon: 'bell', label: 'Events', value: countLabel(events.length), sub: 'Wired to platform actions' },
          { icon: 'tick', label: 'Delivered · 30d', value: deliveriesData ? countLabel(summary.sent) : null, sub: emailReady ? 'Accepted by Amazon SES' : 'Email not connected yet' },
          { icon: 'alert', label: 'Failed · 30d', value: deliveriesData ? countLabel(summary.failed) : null, sub: summary.failed ? 'Use retry to resend' : 'Nothing to retry' },
          { icon: 'clock', label: 'Log-only · 30d', value: deliveriesData ? countLabel(summary.log_only) : null, sub: 'Recorded, not sent' },
        ]}
      />

      {!emailReady && eventsData ? (
        <SectionState title="Email is recording, not sending">
          Every event below is wired and recorded. Connect Amazon SES (EMAIL_PROVIDER=ses, a verified EMAIL_FROM sender and
          SES credentials in the API .env) and new emails are delivered automatically. WhatsApp stays log-only until a
          provider is chosen.
        </SectionState>
      ) : null}

      {unavailable ? (
        <SectionState title="Notifications not available">The notifications API is not reachable right now.</SectionState>
      ) : null}
      {eventsError || deliveriesError ? (
        <SectionState tone="err" title="Could not load notifications">
          {apiErrorMessage(eventsError || deliveriesError, 'Please try again.')}
        </SectionState>
      ) : null}

      <Panel
        title="Event catalogue"
        sub="What triggers each message, who receives it, and how each channel is set up."
        bodyClassName={null}
      >
        {events.length ? (
          <div className="sp-table-wrap">
            <table className="sp-table un-table sa-table-tight">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Audience</th>
                  <th>Channels</th>
                  <th className="num">Last 30 days</th>
                </tr>
              </thead>
              <tbody>
                {events.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="pm-person">
                        <span className="sp-row-ic"><Icon name="bell" size={18} /></span>
                        <div>
                          <b>{row.event}</b>
                          {row.trigger ? <small>{row.trigger}</small> : null}
                        </div>
                      </div>
                    </td>
                    <td className="sa-nowrap">{row.audience}</td>
                    <td>
                      <div className="sa-chips">
                        {(row.channels || []).map((ch) => (
                          <Pill key={ch.channel} tone={STATE_TONE[ch.state]}>
                            {CHANNEL_LABEL[ch.channel] || ch.channel} · {ch.state}
                          </Pill>
                        ))}
                      </div>
                    </td>
                    <td className="num sa-nowrap">
                      <b>{countLabel(row.sent_30d || 0)}</b> sent
                      {row.failed_30d ? <small className="sa-row-code">{countLabel(row.failed_30d)} failed</small> : null}
                      {row.log_only_30d ? <small className="sa-row-code">{countLabel(row.log_only_30d)} log-only</small> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <PanelEmpty icon="bell" title={eventsLoading ? 'Loading events…' : 'No events returned'} />
        )}
      </Panel>

      <FilterBar label="Delivery filters">
        <SearchBox
          placeholder="Search recipient or subject…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <QuirriSelect
          ariaLabel="Filter by event"
          value={event}
          onChange={(e) => setEvent(e.target.value)}
          placeholder="All events"
          options={eventOptions}
        />
        <SegTabs label="Filter by delivery status" options={STATUS_FILTERS} value={status} onChange={setStatus} />
      </FilterBar>

      <Panel
        title="Deliveries"
        sub="Each message sent for an event above, newest first."
        action={<span className="sp-pill sp-pill--teal">{countLabel(deliveriesData?.total ?? 0)} in 30 days</span>}
        bodyClassName={null}
      >
        {deliveries.length ? (
          <div className="sp-table-wrap">
            <table className="sp-table un-table sa-table-tight">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Recipient</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <b>{row.event_label}</b>
                      {row.subject ? <small className="sa-row-code">{row.subject}</small> : null}
                    </td>
                    <td>
                      {row.recipient}
                      {row.institution ? <small className="sa-row-code">{row.institution}</small> : null}
                    </td>
                    <td className="sa-nowrap">{CHANNEL_LABEL[row.channel] || row.channel}</td>
                    <td>
                      <Pill tone={STATE_TONE[row.status_key]}>{row.status}</Pill>
                      {row.error ? <small className="sa-row-code sa-err-text">{row.error}</small> : null}
                      {row.attempts > 1 ? <small className="sa-row-code">{row.attempts} attempts</small> : null}
                    </td>
                    <td className="sa-muted sa-nowrap">{formatWhen(row.updated_at || row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <PanelEmpty icon="send" title={deliveriesLoading ? 'Loading deliveries…' : (status || event || search) ? 'No deliveries match these filters' : 'No deliveries yet'}>
            {deliveriesLoading ? null : 'Messages appear here the moment an event above is triggered.'}
          </PanelEmpty>
        )}
      </Panel>

      {deliveries.length ? (
        <Pager page={page} pageSize={PAGE_SIZE} total={deliveriesData?.total ?? deliveries.length} shown={deliveries.length} onPage={setPage} noun="deliveries" />
      ) : null}
    </ModulePage>
  );
}

'use client';

import { Suspense, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ModulePage,
  ModuleHead,
  HeadChip,
  TabNav,
  TabPanel,
  KpiRow,
  SegTabs,
  SearchBox,
  Pager,
  Panel,
  Icon,
  SectionState,
  countLabel,
} from '@/components/shared/module-ui';
import { BarList, Distribution } from '@/components/shared/data-viz';
import { QuirriSelect } from '@/components/superadmin/quirri-ui';
import { notificationsApi } from '@/lib/api/superadmin/modules';
import { asList, apiErrorMessage, fetchOptional } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useLiveRefresh, useTimeAgo } from '@/hooks/useLiveRefresh';
import { useUrlState, useTabParam } from '@/hooks/useUrlState';
import { useDebouncedUrlSearch, pageParam } from '@/lib/superadmin/listState';

const PAGE_SIZE = 25;
/** POST /notifications/deliveries/retry-failed resends failures of the last 7 days only. */
const RETRY_DAYS = 7;

const TABS = [
  { value: 'deliveries', label: 'Deliveries' },
  { value: 'events', label: 'Events' },
];

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'sent', label: 'Delivered' },
  { value: 'failed', label: 'Failed' },
  { value: 'log_only', label: 'Log-only' },
];

const RANGES = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

const CHANNELS = [
  { value: '', label: 'All channels' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
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

function Pill({ tone, children }) {
  return (
    <span className={`sp-pill ${tone || ''}`.trim()}>
      <i className="un-dot" aria-hidden="true" />
      {children}
    </span>
  );
}

function NotificationsView() {
  const [tab] = useTabParam(TABS.map((t) => t.value), 'deliveries');
  const [url, setUrl] = useUrlState({ q: '', status: '', event: '', channel: '', days: '30', page: '1' });
  const days = RANGES.some((r) => r.value === url.days) ? url.days : '30';
  const page = pageParam(url.page);
  const [search, setSearch] = useDebouncedUrlSearch(url.q, (q) => setUrl({ q, page: '1' }));
  const [retrying, setRetrying] = useState(false);

  const { data: eventsData, loading: eventsLoading, error: eventsError, reload: reloadEvents } = useAsyncResource(
    () => fetchOptional(() => notificationsApi.listEvents()),
    [],
  );
  const { data: deliveriesData, loading: deliveriesLoading, error: deliveriesError, reload: reloadDeliveries } = useAsyncResource(
    () => fetchOptional(() => notificationsApi.listDeliveries({
      status: url.status || undefined,
      event: url.event || undefined,
      channel: url.channel || undefined,
      q: url.q || undefined,
      days,
      page,
      page_size: PAGE_SIZE,
    })),
    [url.status, url.event, url.channel, url.q, days, page],
  );
  // Same window as the retry endpoint, so the button promises exactly what it resends.
  const { data: retryable, reload: reloadRetryable } = useAsyncResource(async () => {
    const d = await fetchOptional(() => notificationsApi.listDeliveries({ status: 'failed', days: RETRY_DAYS, page: 1, page_size: 1 }));
    return d ? Number(d.total) || 0 : 0;
  }, []);
  const reloadAll = (opts) => Promise.all([reloadEvents(opts), reloadDeliveries(opts), reloadRetryable(opts)]);
  const ago = useTimeAgo(useLiveRefresh(() => reloadAll({ silent: true })));

  const events = useMemo(() => asList(eventsData, []), [eventsData]);
  const deliveries = useMemo(() => asList(deliveriesData, []), [deliveriesData]);
  const provider = eventsData?.provider || {};
  const summary = deliveriesData?.summary || { sent: 0, failed: 0, log_only: 0 };
  const unavailable = !eventsLoading && eventsData == null && !eventsError;
  const emailReady = Boolean(provider.email_ready);
  const filtersOn = Boolean(url.q || url.status || url.event || url.channel || days !== '30');
  const total = deliveriesData?.total ?? deliveries.length;
  const rangeLabel = RANGES.find((r) => r.value === days)?.label;

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const res = await fetchOptional(() => notificationsApi.retryFailed());
      const msg = res?.message || 'Retry finished';
      if (res?.provider_ready === false) toast.error(msg);
      else if (res?.failed) toast.error(msg);
      else toast.success(msg);
      await reloadAll();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not retry failed deliveries.'));
    } finally {
      setRetrying(false);
    }
  };

  const eventOptions = [{ value: '', label: 'All events' }, ...events.map((e) => ({ value: e.id, label: e.event }))];
  const eventBars = events
    .map((e) => ({
      key: e.id,
      label: e.event,
      sub: e.audience || null,
      value: (Number(e.sent_30d) || 0) + (Number(e.log_only_30d) || 0),
    }))
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value);
  const tabs = TABS.map((t) => (t.value === 'events' && events.length ? { ...t, count: events.length } : t));

  return (
    <ModulePage className="sa-page">
      <ModuleHead
        chips={(
          <>
            {eventsData ? (
              <>
                <HeadChip icon="mail" tone={emailReady ? 'teal' : 'grey'}>
                  Email · {emailReady ? (provider.email || 'Connected') : 'recorded only, not sent yet'}
                </HeadChip>
                <HeadChip tone="grey">WhatsApp · {provider.whatsapp || 'Not configured'}</HeadChip>
              </>
            ) : null}
            <HeadChip icon="refresh" tone="grey">Live · {ago}</HeadChip>
          </>
        )}
        actions={retryable ? (
          <button type="button" className="sd-btn sd-btn--amber" onClick={handleRetry} disabled={retrying}>
            <Icon name="refresh" size={16} />
            {retrying ? 'Retrying…' : `Retry ${countLabel(retryable)} failed (last ${RETRY_DAYS} days)`}
          </button>
        ) : null}
      />

      {unavailable ? (
        <SectionState title="Notifications not available">The notifications API is not reachable right now.</SectionState>
      ) : null}
      {eventsError || deliveriesError ? (
        <SectionState
          tone="err"
          title="Could not load notifications"
          action={(
            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reloadAll().catch(() => {})}>
              <Icon name="refresh" size={16} /> Try again
            </button>
          )}
        >
          {apiErrorMessage(eventsError || deliveriesError, 'Please try again.')}
        </SectionState>
      ) : null}

      <TabNav
        tabs={tabs}
        value={tab}
        onChange={(v) => setUrl({ tab: v === 'deliveries' ? null : v }, { push: true })}
        label="Notification sections"
        idBase="notif"
      />

      <TabPanel value="deliveries" current={tab} idBase="notif">
        <div className="sa-split">
          <KpiRow
            label="Deliveries summary"
            items={[
              { icon: 'tick', label: `Delivered · ${rangeLabel}`, value: deliveriesData ? countLabel(summary.sent) : null, sub: emailReady ? 'Accepted by Amazon SES' : 'Email not connected yet' },
              { icon: 'alert', label: `Failed · ${rangeLabel}`, value: deliveriesData ? countLabel(summary.failed) : null, tone: summary.failed ? 'focus' : undefined, sub: retryable ? `${countLabel(retryable)} can be retried (last ${RETRY_DAYS} days)` : 'Nothing to retry' },
              { icon: 'clock', label: `Log-only · ${rangeLabel}`, value: deliveriesData ? countLabel(summary.log_only) : null, sub: 'Recorded, not sent' },
            ]}
          />
          <Panel title="Delivery mix" sub={`Every message in the last ${rangeLabel}`}>
            {deliveriesData ? (
              <Distribution
                label="Delivery mix"
                parts={[
                  { label: 'Delivered', value: summary.sent, color: 'var(--cat-2)' },
                  { label: 'Failed', value: summary.failed, color: 'var(--highlight)' },
                  { label: 'Log-only', value: summary.log_only, color: 'var(--cat-5)' },
                ]}
                empty="No messages in this range."
              />
            ) : <p className="dv-empty">{deliveriesLoading ? 'Loading…' : 'Not available right now.'}</p>}
          </Panel>
        </div>

        <Panel
          title="Deliveries"
          sub={deliveriesData ? `${countLabel(total)} ${total === 1 ? 'message' : 'messages'}${filtersOn ? ' match these filters' : ''} · last ${rangeLabel}, newest first` : null}
          bodyClassName={null}
          toolbar={(
            <>
              <SearchBox
                placeholder="Search recipient or subject…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="sa-filter-select">
                <QuirriSelect
                  ariaLabel="Filter by event"
                  value={url.event}
                  onChange={(e) => setUrl({ event: e.target.value, page: '1' })}
                  options={eventOptions}
                />
              </div>
              <div className="sa-filter-select sa-filter-select--sm">
                <QuirriSelect
                  ariaLabel="Filter by channel"
                  value={url.channel}
                  onChange={(e) => setUrl({ channel: e.target.value, page: '1' })}
                  options={CHANNELS}
                />
              </div>
              <SegTabs label="Filter by delivery status" options={STATUS_FILTERS} value={url.status} onChange={(v) => setUrl({ status: v, page: '1' })} />
              <SegTabs label="Time range" options={RANGES} value={days} onChange={(v) => setUrl({ days: v, page: '1' })} />
              {filtersOn ? (
                <button
                  type="button"
                  className="sd-btn sd-btn--ghost sd-btn--sm"
                  onClick={() => setUrl({ q: '', status: '', event: '', channel: '', days: '30', page: '1' })}
                >
                  Clear
                </button>
              ) : null}
            </>
          )}
        >
          {deliveries.length ? (
            <div className="sp-table-wrap">
              <table className="sp-table un-table sa-table-tight sa-stack">
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
                      <td data-label="Recipient">
                        <span className="sa-inst">
                          <span>{row.recipient}</span>
                          {row.institution ? <small>{row.institution}</small> : null}
                        </span>
                      </td>
                      <td data-label="Channel" className="sa-nowrap">{CHANNEL_LABEL[row.channel] || row.channel}</td>
                      <td data-label="Status">
                        <span className="sa-inst">
                          <Pill tone={STATE_TONE[row.status_key]}>{row.status}</Pill>
                          {row.error ? <small className="sa-err-text">{row.error}</small> : null}
                          {row.attempts > 1 ? <small>{row.attempts} attempts</small> : null}
                        </span>
                      </td>
                      <td data-label="Time" className="sa-muted sa-nowrap">{formatWhen(row.updated_at || row.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="dv-empty sa-pad">
              {deliveriesLoading ? 'Loading deliveries…' : deliveriesData == null ? 'Deliveries are not available right now.' : filtersOn ? 'No deliveries match these filters.' : `No messages in the last ${rangeLabel}. They appear here the moment an event is triggered.`}
            </p>
          )}
        </Panel>

        <Pager
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          shown={deliveries.length}
          onPage={(p) => setUrl({ page: String(p) }, { push: true })}
          noun="deliveries"
        />
      </TabPanel>

      <TabPanel value="events" current={tab} idBase="notif">
        {eventBars.length ? (
          <Panel title="Messages per event · 30 days" sub="Sent and log-only messages for each event.">
            <BarList label="Messages per event" items={eventBars} />
          </Panel>
        ) : null}

        <Panel
          title="Event catalogue"
          sub="What triggers each message, who receives it, and how each channel is set up."
          bodyClassName={null}
        >
          {events.length ? (
            <div className="sp-table-wrap">
              <table className="sp-table un-table sa-table-tight sa-stack">
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
                        <b>{row.event}</b>
                        {row.trigger ? <small className="sa-row-code">{row.trigger}</small> : null}
                      </td>
                      <td data-label="Audience">{row.audience}</td>
                      <td data-label="Channels">
                        <div className="sa-chips">
                          {(row.channels || []).map((ch) => (
                            <Pill key={ch.channel} tone={STATE_TONE[ch.state]}>
                              {CHANNEL_LABEL[ch.channel] || ch.channel} · {ch.state}
                            </Pill>
                          ))}
                        </div>
                      </td>
                      <td data-label="Last 30 days" className="num sa-nowrap">
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
            <p className="dv-empty sa-pad">{eventsLoading ? 'Loading events…' : 'No events returned.'}</p>
          )}
        </Panel>
      </TabPanel>
    </ModulePage>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<SectionState title="Loading notifications…" />}>
      <NotificationsView />
    </Suspense>
  );
}

'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ModulePage,
  ModuleBanner,
  KpiRow,
  Panel,
  Icon,
  SectionState,
  countLabel,
} from '@/components/shared/module-ui';
import { notificationsApi } from '@/lib/api/superadmin/modules';
import { asList, apiErrorMessage, fetchOptional } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

/** Static SOW §7 catalogue — documentation only, not fake delivery data. */
const SOW_EVENT_CATALOGUE = [
  { event: 'Account activation', audience: 'New users', channels: ['Email', 'SMS'], phase: 'Available' },
  { event: 'Password reset', audience: 'All users', channels: ['Email'], phase: 'Available' },
  { event: 'Content ready / approval', audience: 'Faculty / Admin', channels: ['Email'], phase: 'Available' },
  { event: 'Interview assignment', audience: 'Final-year students', channels: ['Email'], phase: 'Available' },
  { event: 'Interview result', audience: 'Students', channels: ['Email'], phase: 'Available' },
  { event: 'Pipeline completion', audience: 'Admins', channels: ['Email'], phase: 'Available' },
];

const TONE = { green: 'sp-pill--good', amber: 'sp-pill--low', red: 'sp-pill--err' };

function statusVariant(status) {
  const value = String(status || '').toLowerCase();
  if (value.includes('deliver') || value.includes('scope') || value === 'ok' || value.includes('in scope') || value.includes('available')) return 'green';
  if (value.includes('pending') || value.includes('queued')) return 'amber';
  return 'red';
}

function StatusPill({ status }) {
  return (
    <span className={`sp-pill ${TONE[statusVariant(status)]}`}>
      <i className="un-dot" aria-hidden="true" />
      {status}
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

  const { data: eventsData, loading: eventsLoading, error: eventsError } = useAsyncResource(
    () => fetchOptional(() => notificationsApi.listEvents()),
    [],
  );

  const { data: deliveriesData, loading: deliveriesLoading, error: deliveriesError, reload: reloadDeliveries } = useAsyncResource(
    () => fetchOptional(() => notificationsApi.listDeliveries({})),
    [],
  );

  const apiEvents = useMemo(() => asList(eventsData, []), [eventsData]);
  const events = apiEvents.length ? apiEvents : SOW_EVENT_CATALOGUE;
  const usingSowCatalogue = !eventsLoading && !apiEvents.length;
  const deliveries = useMemo(() => asList(deliveriesData, []), [deliveriesData]);
  const deliveriesUnavailable = !deliveriesLoading && deliveriesData == null && !deliveriesError;

  const counts = useMemo(() => deliveries.reduce((acc, d) => {
    acc[statusVariant(d.status)] += 1;
    return acc;
  }, { green: 0, amber: 0, red: 0 }), [deliveries]);
  const hasDeliveries = deliveriesData != null;

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await notificationsApi.retryFailed();
      toast.success('Retry queued for failed deliveries');
      await reloadDeliveries();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Retry is not available yet.'));
    } finally {
      setRetrying(false);
    }
  };

  return (
    <ModulePage className="sa-page">
      <ModuleBanner
        icon="bell"
        eyebrow="Operations"
        title="Notifications"
        lede="Events Quirri sends to people — activation, content, assignments, interview results and pipeline completion."
        chips={(
          <>
            <span className="is-on"><Icon name="mail" size={14} /> Email primary</span>
            <span>SMS / WhatsApp for activation</span>
          </>
        )}
        actions={(
          <button type="button" className="sd-btn sd-btn--amber" onClick={handleRetry} disabled={retrying}>
            <Icon name="refresh" size={16} /> {retrying ? 'Retrying…' : 'Retry failed deliveries'}
          </button>
        )}
      />

      <KpiRow
        label="Notifications summary"
        items={[
          { icon: 'bell', label: 'Events', value: countLabel(events.length), sub: usingSowCatalogue ? 'From the reference catalogue' : 'From the API' },
          { icon: 'send', label: 'Recent deliveries', value: hasDeliveries ? countLabel(deliveries.length) : null, sub: hasDeliveries ? 'Loaded below' : 'Not tracked yet' },
          { icon: 'tick', label: 'Delivered', value: hasDeliveries ? countLabel(counts.green) : null, sub: hasDeliveries ? 'In recent deliveries' : 'Not tracked yet' },
          { icon: 'alert', label: 'Failed', value: hasDeliveries ? countLabel(counts.red) : null, sub: hasDeliveries ? 'Use retry to resend' : 'Not tracked yet' },
        ]}
      />

      {usingSowCatalogue || deliveriesUnavailable ? (
        <SectionState title="Delivery history not wired yet">
          Event catalogue is served from the API. Delivery rows stay empty until an ESP writes tracking records — no sample deliveries.
        </SectionState>
      ) : null}

      {(eventsError || deliveriesError) ? (
        <SectionState tone="err" title="Could not load notifications">
          {apiErrorMessage(eventsError || deliveriesError, 'Please try again.')}
        </SectionState>
      ) : null}

      <Panel
        title="Event catalogue"
        sub={usingSowCatalogue
          ? 'Reference list of the events Quirri sends (not live data yet).'
          : 'Channels: email primary; SMS / WhatsApp for activation where provisioned.'}
        action={usingSowCatalogue ? <span className="sp-pill">Reference</span> : <span className="sp-pill sp-pill--teal">Live</span>}
        bodyClassName={null}
      >
        {eventsLoading && !events.length ? (
          <PanelEmpty icon="bell" title="Loading events…" />
        ) : (
          <div className="sp-table-wrap">
            <table className="sp-table un-table sa-table-tight">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Audience</th>
                  <th>Channels</th>
                  <th>Availability</th>
                </tr>
              </thead>
              <tbody>
                {events.map((row) => {
                  const channels = Array.isArray(row.channels)
                    ? row.channels
                    : String(row.channels || '').split(',').map((c) => c.trim()).filter(Boolean);
                  return (
                    <tr key={row.id || row.event || row.name}>
                      <td>
                        <div className="pm-person">
                          <span className="sp-row-ic"><Icon name="bell" size={18} /></span>
                          <b>{row.event || row.name}</b>
                        </div>
                      </td>
                      <td>{row.audience}</td>
                      <td>
                        {channels.length ? (
                          <div className="sa-chips">
                            {channels.map((ch) => <span key={ch} className="sp-pill">{ch}</span>)}
                          </div>
                        ) : '—'}
                      </td>
                      <td><StatusPill status={row.phase || row.phase1 || 'Available'} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        title="Recent deliveries"
        sub="Delivery status for each event sent to people on the platform."
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
                  <tr key={row.id || `${row.event}-${row.recipient}-${row.time}`}>
                    <td><b>{row.event}</b></td>
                    <td className="sa-muted">{row.recipient}</td>
                    <td><span className="sp-pill">{row.channel}</span></td>
                    <td className="sa-nowrap"><StatusPill status={row.status} /></td>
                    <td className="sa-muted sa-nowrap">{row.time || row.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <PanelEmpty icon="send" title={deliveriesLoading ? 'Loading deliveries…' : 'No deliveries yet'}>
            {deliveriesLoading ? null : 'Each email or SMS sent for an event above is listed here with its status.'}
          </PanelEmpty>
        )}
      </Panel>
    </ModulePage>
  );
}

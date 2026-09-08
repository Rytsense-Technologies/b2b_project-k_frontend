'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import QuirriBadge from '@/components/superadmin/QuirriBadge';
import { notificationsApi } from '@/lib/api/superadmin/modules';
import { asList, apiErrorMessage, fetchOptional } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

/** Static SOW §7 catalogue — documentation only, not fake delivery data. */
const SOW_EVENT_CATALOGUE = [
  { event: 'Account activation', audience: 'New users', channels: ['Email', 'SMS'], phase: 'In scope' },
  { event: 'Password reset', audience: 'All users', channels: ['Email'], phase: 'In scope' },
  { event: 'Content ready / approval', audience: 'Faculty / Admin', channels: ['Email'], phase: 'In scope' },
  { event: 'Interview assignment', audience: 'Final-year students', channels: ['Email'], phase: 'In scope' },
  { event: 'Interview result', audience: 'Students', channels: ['Email'], phase: 'In scope' },
  { event: 'Pipeline completion', audience: 'Admins', channels: ['Email'], phase: 'In scope' },
];

function statusVariant(status) {
  const value = String(status || '').toLowerCase();
  if (value.includes('deliver') || value.includes('scope') || value === 'ok' || value.includes('in scope')) return 'green';
  if (value.includes('pending') || value.includes('queued')) return 'amber';
  return 'red';
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
    <div className="animate-fade-in">
      <div className="section-head">
        <div>
          <div className="t">Notifications</div>
          <div className="d">
            Phase 1 B2B notification events from the SOW — activation, content, assignments, interview results, and pipeline completion. Not a sender-address management product.
          </div>
        </div>
      </div>

      {usingSowCatalogue || deliveriesUnavailable ? (
        <div className="notice info" style={{ marginBottom: 12 }}>
          <div>
            <b>Delivery history not wired yet</b>
            Event catalogue is served from the API. Delivery rows stay empty until an ESP writes tracking records — no sample deliveries.
          </div>
        </div>
      ) : null}

      {(eventsError || deliveriesError) ? (
        <div className="notice err" style={{ marginBottom: 12 }}>
          <div>
            <b>Could not load notifications</b>
            {apiErrorMessage(eventsError || deliveriesError, 'Please try again.')}
          </div>
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-h"><h3>Event catalogue (SOW §7)</h3></div>
        <div className="card-sub">
          {usingSowCatalogue
            ? 'Reference catalogue from the B2B SOW (not live API data).'
            : 'Channels: email primary; SMS / WhatsApp for activation where provisioned.'}
        </div>
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Audience</th>
              <th>Channels</th>
              <th>Phase 1</th>
            </tr>
          </thead>
          <tbody>
            {eventsLoading && !events.length ? (
              <tr><td colSpan={4}>Loading events…</td></tr>
            ) : null}
            {events.map((row) => {
              const channels = Array.isArray(row.channels)
                ? row.channels
                : String(row.channels || '').split(',').map((c) => c.trim()).filter(Boolean);
              return (
                <tr key={row.id || row.event || row.name}>
                  <td><span className="strong">{row.event || row.name}</span></td>
                  <td>{row.audience}</td>
                  <td>
                    {channels.length
                      ? channels.map((ch) => (
                        <QuirriBadge key={ch} variant="grey" plain>{ch}</QuirriBadge>
                      ))
                      : '—'}
                    {' '}
                  </td>
                  <td>
                    <QuirriBadge variant={statusVariant(row.phase || row.phase1 || 'In scope')}>
                      {row.phase || row.phase1 || 'In scope'}
                    </QuirriBadge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>Recent deliveries</h3>
          <a
            className="link"
            onClick={handleRetry}
            role="button"
            tabIndex={0}
            style={{ opacity: deliveriesUnavailable ? 0.5 : 1 }}
          >
            {retrying ? 'Retrying…' : 'Retry failed →'}
          </a>
        </div>
        <div className="card-sub">Operational visibility for SOW notification events (not configurable from-address CRUD).</div>
        <table>
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
            {deliveriesLoading && !deliveries.length ? (
              <tr><td colSpan={5}>Loading deliveries…</td></tr>
            ) : null}
            {!deliveriesLoading && !deliveries.length ? (
              <tr><td colSpan={5}>No deliveries yet.</td></tr>
            ) : null}
            {deliveries.map((row) => (
              <tr key={row.id || `${row.event}-${row.recipient}-${row.time}`}>
                <td>{row.event}</td>
                <td className="sub">{row.recipient}</td>
                <td><QuirriBadge variant="grey" plain>{row.channel}</QuirriBadge></td>
                <td>
                  <QuirriBadge variant={statusVariant(row.status)}>
                    {row.status}
                  </QuirriBadge>
                </td>
                <td className="sub">{row.time || row.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

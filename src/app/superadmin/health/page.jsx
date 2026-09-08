'use client';

import { useMemo } from 'react';
import QuirriBadge from '@/components/superadmin/QuirriBadge';
import { healthApi } from '@/lib/api/superadmin/modules';
import { asList, apiErrorMessage, fetchOptional } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

function statusVariant(status) {
  const value = String(status || '').toLowerCase();
  if (value.includes('operational') || value.includes('ok') || value.includes('healthy')) return 'green';
  if (value.includes('degraded') || value.includes('warn')) return 'amber';
  return 'red';
}

export default function HealthPage() {
  const { data: statusData, loading: statusLoading, error: statusError } = useAsyncResource(
    () => fetchOptional(() => healthApi.getStatus()),
    [],
  );

  const { data: errorsData, loading: errorsLoading, error: errorsError } = useAsyncResource(
    () => fetchOptional(() => healthApi.getErrors({})),
    [],
  );

  const unavailable = !statusLoading && statusData == null && !statusError;

  const metrics = useMemo(() => {
    const raw = statusData?.metrics;
    if (Array.isArray(raw) && raw.length) {
      return raw.map((m) => ({
        k: m.title || m.k,
        v: m.value ?? m.v,
        s: m.trend || m.s,
        down: m.trendDown || String(m.trend || '').toLowerCase().includes('fail'),
        up: m.trendUp,
      }));
    }
    if (!statusData) return [];
    const items = [];
    if (statusData.uptime != null) {
      items.push({ k: 'Uptime · 30d', v: <>{statusData.uptime}<small>%</small></>, s: statusData.uptime_note || 'No incidents', up: true });
    }
    if (statusData.api_p95 != null) {
      items.push({ k: 'API p95 latency', v: <>{statusData.api_p95}<small>ms</small></>, s: statusData.latency_note || 'Within budget' });
    }
    if (statusData.jobs_in_queue != null) {
      items.push({ k: 'Jobs in queue', v: String(statusData.jobs_in_queue), s: statusData.queue_note });
    }
    if (statusData.failed_jobs_24h != null) {
      items.push({
        k: 'Failed jobs · 24h',
        v: <span style={{ color: 'var(--red)' }}>{statusData.failed_jobs_24h}</span>,
        s: statusData.failed_note,
        down: true,
      });
    }
    return items;
  }, [statusData]);

  const services = asList(statusData?.services, []);
  const latency = asList(statusData?.pipeline_latency || statusData?.latency_stages, []);
  const errors = asList(errorsData, []);
  const maxLatency = Math.max(...latency.map((l) => Number(l.ms || l.value || 0)), 1);

  return (
    <div className="animate-fade-in">
      <div className="section-head">
        <div>
          <div className="t">Platform Health</div>
          <div className="d">System status, uptime, AI pipeline throughput, and recent errors — required by SOW §6.2.</div>
        </div>
      </div>

      {unavailable ? (
        <div className="notice info" style={{ marginBottom: 12 }}>
          <div>
            <b>Platform health not available</b>
            Health APIs are not reachable. This screen stays empty until system status endpoints respond.
          </div>
        </div>
      ) : (
        <div className="notice info" style={{ marginBottom: 12 }}>
          <div>
            <b>Live database and API checks</b>
            Uptime percentages, API p95, and AI pipeline latency stay empty until observability instrumentation ships — no invented numbers.
          </div>
        </div>
      )}

      {(statusError || errorsError) ? (
        <div className="notice err" style={{ marginBottom: 12 }}>
          <div>
            <b>Could not load health data</b>
            {apiErrorMessage(statusError || errorsError, 'Please try again.')}
          </div>
        </div>
      ) : null}

      {statusLoading && !statusData ? <p style={{ color: 'var(--muted)', marginBottom: 12 }}>Loading health…</p> : null}

      <div className="stats c4">
        {metrics.length ? metrics.map((m) => (
          <div className="stat" key={m.k}>
            <div className="k">{m.k}</div>
            <div className="v">{m.v}</div>
            {m.s ? <div className={`s${m.up ? ' up' : ''}${m.down ? ' down' : ''}`}>{m.s}</div> : null}
          </div>
        )) : (
          !statusLoading ? (
            <div className="stat">
              <div className="k">Status</div>
              <div className="v">—</div>
              <div className="s">No metrics returned</div>
            </div>
          ) : null
        )}
      </div>

      <div className="cols" style={{ marginBottom: 18 }}>
        <div className="card">
          <div className="card-h"><h3>Service status</h3></div>
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Status</th>
                <th>p95</th>
              </tr>
            </thead>
            <tbody>
              {!statusLoading && !services.length ? (
                <tr><td colSpan={3}>No service status available.</td></tr>
              ) : null}
              {services.map((svc) => (
                <tr key={svc.name || svc.service}>
                  <td><span className="strong">{svc.name || svc.service}</span></td>
                  <td>
                    <QuirriBadge variant={statusVariant(svc.status)}>
                      {svc.status}
                    </QuirriBadge>
                  </td>
                  <td className="num">{svc.p95 || svc.latency || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card card-p">
          <h3 style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 3 }}>AI pipeline latency</h3>
          <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 14 }}>Per-stage p95, last 24 hours.</p>
          {!latency.length ? (
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>No latency stages returned.</p>
          ) : null}
          {latency.map((stage, i) => {
            const ms = Number(stage.ms || stage.value || 0);
            const width = Math.round((ms / maxLatency) * 100);
            const colors = ['var(--green)', 'var(--amber)', 'var(--sky)', 'var(--blue)', 'var(--violet)'];
            return (
              <div className="cmp" key={stage.name || stage.stage || i}>
                <div className="nm">{stage.name || stage.stage || stage.nm}</div>
                <div className="track">
                  <i style={{ width: `${width}%`, background: colors[i % colors.length] }} />
                </div>
                <div className="val">{stage.label || stage.display || `${ms}s`}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>Recent errors</h3>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Redacted — no student PII</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Service</th>
              <th>Error</th>
              <th>Institution</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            {errorsLoading && !errors.length ? (
              <tr><td colSpan={5}>Loading errors…</td></tr>
            ) : null}
            {!errorsLoading && !errors.length ? (
              <tr><td colSpan={5}>No recent errors.</td></tr>
            ) : null}
            {errors.map((row) => (
              <tr key={row.id || `${row.time}-${row.error}`}>
                <td className="sub">{row.time || row.created_at}</td>
                <td>{row.service}</td>
                <td><span className="strong">{row.error || row.message}</span></td>
                <td className="sub">{row.institution || row.college || '—'}</td>
                <td className="num">{row.count ?? 1}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import {
  ModulePage,
  ModuleBanner,
  KpiRow,
  Panel,
  Kpi,
  Icon,
  SectionState,
} from '@/components/shared/module-ui';
import { healthApi } from '@/lib/api/superadmin/modules';
import { asList, apiErrorMessage, fetchOptional } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

const METRIC_ICONS = ['activity', 'clock', 'layers', 'alert'];

/** Expected health metrics — shown as "—" until the health API reports them. */
const METRIC_PLACEHOLDERS = [
  { k: 'Uptime · 30d', icon: 'activity' },
  { k: 'API p95 latency', icon: 'clock' },
  { k: 'Jobs in queue', icon: 'layers' },
  { k: 'Failed jobs · 24h', icon: 'alert' },
];

const TONE = { green: 'sp-pill--good', amber: 'sp-pill--low', red: 'sp-pill--err' };

function statusVariant(status) {
  const value = String(status || '').toLowerCase();
  if (value.includes('operational') || value.includes('ok') || value.includes('healthy')) return 'green';
  if (value.includes('degraded') || value.includes('warn')) return 'amber';
  return 'red';
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
      items.push({ k: 'Uptime · 30d', v: <>{statusData.uptime}<small className="sa-kpi-unit">%</small></>, s: statusData.uptime_note || 'No incidents', up: true });
    }
    if (statusData.api_p95 != null) {
      items.push({ k: 'API p95 latency', v: <>{statusData.api_p95}<small className="sa-kpi-unit">ms</small></>, s: statusData.latency_note || 'Within budget' });
    }
    if (statusData.jobs_in_queue != null) {
      items.push({ k: 'Jobs in queue', v: String(statusData.jobs_in_queue), s: statusData.queue_note });
    }
    if (statusData.failed_jobs_24h != null) {
      items.push({
        k: 'Failed jobs · 24h',
        v: <span className="sa-err-text">{statusData.failed_jobs_24h}</span>,
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

  const serviceCounts = services.reduce((acc, s) => {
    acc[statusVariant(s.status)] += 1;
    return acc;
  }, { green: 0, amber: 0, red: 0 });

  const kpis = metrics.length
    ? metrics.map((m, i) => ({ icon: METRIC_ICONS[i % METRIC_ICONS.length], label: m.k, value: m.v, sub: m.s || null }))
    : METRIC_PLACEHOLDERS.map((m) => ({ icon: m.icon, label: m.k, value: null, sub: statusLoading ? 'Loading…' : 'Not reported yet' }));

  let chips = null;
  if (services.length) {
    chips = (
      <>
        <span className={serviceCounts.red || serviceCounts.amber ? undefined : 'is-on'}>
          <Icon name={serviceCounts.red || serviceCounts.amber ? 'alert' : 'tick'} size={14} />
          {serviceCounts.red || serviceCounts.amber ? 'Some services need attention' : 'All services operational'}
        </span>
        <span>{serviceCounts.green} operational</span>
        {serviceCounts.amber ? <span>{serviceCounts.amber} degraded</span> : null}
        {serviceCounts.red ? <span>{serviceCounts.red} down</span> : null}
      </>
    );
  } else if (unavailable) {
    chips = <span><Icon name="clock" size={14} /> Not reporting yet</span>;
  }

  return (
    <ModulePage className="sa-page">
      <ModuleBanner
        icon="activity"
        eyebrow="Operations"
        title="Platform health"
        lede="System status, uptime, AI pipeline throughput and recent errors in one place."
        chips={chips}
      />

      {kpis.length > 4 ? (
        <section className="sd-kpis sa-kpis--5" aria-label="Health summary">
          {kpis.map((k) => <Kpi key={k.label} icon={k.icon} label={k.label} value={k.value} sub={k.sub} />)}
        </section>
      ) : (
        <KpiRow label="Health summary" items={kpis} />
      )}

      {unavailable ? (
        <SectionState title="Platform health not available">
          Health APIs are not reachable. This screen stays empty until system status endpoints respond.
        </SectionState>
      ) : (
        <SectionState title="Live database and API checks">
          Uptime percentages, API p95, and AI pipeline latency stay empty until observability instrumentation ships — no invented numbers.
        </SectionState>
      )}

      {(statusError || errorsError) ? (
        <SectionState tone="err" title="Could not load health data">
          {apiErrorMessage(statusError || errorsError, 'Please try again.')}
        </SectionState>
      ) : null}

      <div className="sa-cols">
        <Panel title="Service status" sub="Current state and p95 response time per service." bodyClassName={null}>
          {services.length ? (
            <ul className="sp-rows">
              {services.map((svc) => {
                const tone = statusVariant(svc.status);
                return (
                  <li key={svc.name || svc.service} className="sp-row">
                    <span className={`sp-row-ic${tone === 'green' ? ' sp-row-ic--good' : ''} sa-svc-ic--${tone}`}>
                      <Icon name={tone === 'green' ? 'tick' : 'alert'} size={18} />
                    </span>
                    <div className="sp-row-main">
                      <b>{svc.name || svc.service}</b>
                      <div className="sp-row-meta"><span>p95 {svc.p95 || svc.latency || '—'}</span></div>
                    </div>
                    <span className={`sp-pill ${TONE[tone]}`}>
                      <i className="un-dot" aria-hidden="true" />
                      {svc.status}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <PanelEmpty icon="activity" title={statusLoading ? 'Loading services…' : 'No service status available'}>
              {statusLoading ? null : 'API, database, render and email services report here once health checks respond.'}
            </PanelEmpty>
          )}
        </Panel>

        <Panel title="AI pipeline latency" sub="Per-stage p95, last 24 hours.">
          {latency.length ? (
            <div className="sa-bars">
              {latency.map((stage, i) => {
                const ms = Number(stage.ms || stage.value || 0);
                const width = Math.round((ms / maxLatency) * 100);
                return (
                  <div className="cmp" key={stage.name || stage.stage || i}>
                    <div className="nm">{stage.name || stage.stage || stage.nm}</div>
                    <div className="track">
                      <i style={{ width: `${width}%` }} />
                    </div>
                    <div className="val">{stage.label || stage.display || `${ms}s`}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <PanelEmpty icon="clock" title="No latency stages returned">
              Stage timings appear when pipeline instrumentation is live.
            </PanelEmpty>
          )}
        </Panel>
      </div>

      <Panel
        title="Recent errors"
        sub="Redacted — no student PII."
        action={errors.length ? <span className="sp-pill sp-pill--err">{errors.length} recent</span> : null}
        bodyClassName={null}
      >
        {errors.length ? (
          <div className="sp-table-wrap">
            <table className="sp-table un-table sa-table-tight">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Service</th>
                  <th>Error</th>
                  <th>Institution</th>
                  <th className="num">Count</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((row) => (
                  <tr key={row.id || `${row.time}-${row.error}`}>
                    <td className="sa-muted sa-nowrap">{row.time || row.created_at}</td>
                    <td className="sa-nowrap">{row.service}</td>
                    <td><b>{row.error || row.message}</b></td>
                    <td className="sa-muted">{row.institution || row.college || '—'}</td>
                    <td className="num"><b>{row.count ?? 1}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <PanelEmpty
            icon={errorsData == null && !errorsLoading ? 'clock' : 'tick'}
            title={errorsLoading ? 'Loading errors…' : errorsData == null ? 'Error log not available yet' : 'No recent errors'}
          >
            {errorsLoading ? null : 'Errors from any service show up here, grouped and redacted.'}
          </PanelEmpty>
        )}
      </Panel>
    </ModulePage>
  );
}

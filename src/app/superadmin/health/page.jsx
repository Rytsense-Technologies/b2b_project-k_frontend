'use client';

import { Suspense, useMemo, useState } from 'react';
import {
  ModulePage,
  TabNav,
  TabPanel,
  KpiRow,
  Panel,
  SegTabs,
  Icon,
  SectionState,
  Pager,
} from '@/components/shared/module-ui';
import { MetricListCard, ModernDonut } from '@/components/shared/data-viz';
import { QuirriSelect } from '@/components/superadmin/quirri-ui';
import { healthApi } from '@/lib/api/superadmin/modules';
import { asList, apiErrorMessage, fetchOptional } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useLiveRefresh, useTimeAgo } from '@/hooks/useLiveRefresh';
import { useUrlState, useTabParam } from '@/hooks/useUrlState';
import { formatCount } from '@/lib/superadmin/format';
import {
  UPTIME_OK, UPTIME_BAD, serviceTone, toNumber, groupNumbers, overallHealth,
} from '@/lib/superadmin/health';
import { withoutInterview } from '@/lib/product/interviewOff';

const METRIC_ICONS = ['activity', 'clock', 'layers', 'alert'];
const METRIC_PLACEHOLDERS = ['Uptime · 30d', 'API p95 latency', 'Jobs in queue', 'Failed jobs · 24h'];
const TONE = { green: 'sp-pill--good', amber: 'sp-pill--low', red: 'sp-pill--err', muted: '' };

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'errors', label: 'Errors' },
];

const ERR_PAGE_SIZE = 10;

/** GET /health/errors accepts days 1–30. */
const RANGES = [
  { value: '1', label: '24 hours' },
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
];

/** "12 Oct, 2:05 pm" in IST - the time an error last happened. */
function formatWhen(iso) {
  const d = new Date(iso || '');
  if (Number.isNaN(d.getTime())) return iso || '—';
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  }).replace('Sept', 'Sep');
}

/** 406000 ms -> "6 min 46 s"; 950 -> "950 ms". */
function formatMs(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n)) return '—';
  if (n < 1000) return `${Math.round(n)} ms`;
  const s = Math.round(n / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m} min ${r} s` : `${m} min`;
}

function ErrorRow({ row, open, onToggle }) {
  const message = String(row.error || row.message || '');
  const [firstLine, ...restLines] = message.split('\n');
  const headline = firstLine.length > 160 ? `${firstLine.slice(0, 157)}…` : firstLine;
  const detail = [firstLine.length > 160 || restLines.length ? message : null, row.detail]
    .filter(Boolean).join('\n\n') || null;
  return (
    <>
      <tr>
        <td>
          <b className="sa-err-head">{headline || '—'}</b>
          {row.path || row.institution ? (
            <small className="sa-row-code">{[row.path, row.status_code ? `HTTP ${row.status_code}` : null, row.institution].filter(Boolean).join(' · ')}</small>
          ) : null}
        </td>
        <td data-label="Service" className="sa-nowrap">{row.service}</td>
        <td data-label="Count" className="num"><b>{formatCount(row.count ?? 1)}</b></td>
        <td data-label="Last seen" className="sa-muted sa-nowrap">{formatWhen(row.time || row.created_at)}</td>
        <td className="sa-actions-cell">
          {detail ? (
            <button type="button" className="sp-link sa-err-toggle" aria-expanded={open} onClick={onToggle}>
              {open ? 'Hide' : 'Details'}
            </button>
          ) : null}
        </td>
      </tr>
      {open && detail ? (
        <tr className="sa-err-detail">
          <td colSpan={5}><pre>{detail}</pre></td>
        </tr>
      ) : null}
    </>
  );
}

function HealthView() {
  const [tab] = useTabParam(TABS.map((t) => t.value), 'overview');
  const [url, setUrl] = useUrlState({ service: '', days: '7', page: '1' });
  const days = RANGES.some((r) => r.value === url.days) ? url.days : '7';
  const errPage = Math.max(1, Number.parseInt(url.page, 10) || 1);
  const [openError, setOpenError] = useState(null);

  const { data: statusData, loading: statusLoading, error: statusError, reload: reloadStatus } = useAsyncResource(
    () => fetchOptional(() => healthApi.getStatus()),
    [],
  );
  const { data: errorsData, loading: errorsLoading, error: errorsError, reload: reloadErrors } = useAsyncResource(
    () => fetchOptional(() => healthApi.getErrors({ days, service: url.service || undefined, limit: 100 })),
    [days, url.service],
  );
  // Live: re-check status and errors every minute + on tab focus.
  const ago = useTimeAgo(useLiveRefresh(() => Promise.all([reloadStatus({ silent: true }), reloadErrors({ silent: true })])));

  const unavailable = !statusLoading && statusData == null && !statusError;
  const health = overallHealth(statusData);
  const services = withoutInterview(asList(statusData?.services, []), (svc) => `${svc.name || ''} ${svc.service || ''}`);
  const latency = asList(statusData?.pipeline_latency, []);
  const errorsByService = withoutInterview(asList(statusData?.errors_by_service, []), (e) => e.service);
  const errors = withoutInterview(asList(errorsData, []), (row) => `${row.service || ''} ${row.path || ''} ${row.error || ''}`);
  // Skill: lists show 10 rows with "Showing X–Y of Z" + Previous / Next under them.
  const errPageCount = Math.max(1, Math.ceil(errors.length / ERR_PAGE_SIZE));
  const errPageNow = Math.min(errPage, errPageCount);
  const errRows = errors.slice((errPageNow - 1) * ERR_PAGE_SIZE, errPageNow * ERR_PAGE_SIZE);
  const errors24h = toNumber(statusData?.errors_24h);

  const kpis = useMemo(() => {
    const raw = withoutInterview(asList(statusData?.metrics, []), (m) => m.title || m.k);
    if (!raw.length) {
      return METRIC_PLACEHOLDERS.map((k, i) => ({
        icon: METRIC_ICONS[i], label: k, value: null, sub: statusLoading ? 'Loading…' : 'Not reported yet',
      }));
    }
    return raw.map((m, i) => {
      const k = m.title || m.k;
      const v = m.value ?? m.v;
      const n = toNumber(v);
      let value = groupNumbers(typeof v === 'number' ? formatCount(v) : v);
      let sub = groupNumbers(m.trend || m.s);
      let tone;
      if (/uptime/i.test(k)) {
        if (n != null && n < UPTIME_OK) tone = 'focus';
        // Monitoring only runs while the API is up, so the share is of checked minutes.
        sub = sub ? `${sub} · share of checked minutes` : 'Share of checked minutes';
      } else if (/failed/i.test(k)) {
        if (n) tone = 'focus';
        // Server errors have their own panel; this tile is video jobs only.
        sub = n ? 'Video jobs that failed — see Upload & content' : 'Video pipeline jobs';
      }
      if (/uptime/i.test(k) && n != null && n < UPTIME_BAD) value = <span className="sa-err-text">{value}</span>;
      return { icon: METRIC_ICONS[i % METRIC_ICONS.length], label: k, value, sub, tone };
    });
  }, [statusData, statusLoading]);

  const serviceBars = errorsByService
    .filter((e) => Number(e.errors_24h) > 0)
    .map((e) => ({
      key: e.service,
      label: e.service,
      sub: Number(e.errors_1h) ? `${formatCount(e.errors_1h)} in the last hour` : null,
      value: Number(e.errors_24h) || 0,
      href: `/superadmin/health?tab=errors&service=${encodeURIComponent(e.service)}&days=1`,
    }));
  const stageBars = latency.map((s, i) => ({
    key: i,
    label: s.name,
    sub: s.samples ? `${formatCount(s.samples)} ${Number(s.samples) === 1 ? 'chapter' : 'chapters'}` : null,
    value: Number(s.ms) || 0,
  }));

  const serviceOptions = useMemo(() => {
    const names = new Set(errorsByService.map((e) => e.service));
    if (url.service) names.add(url.service);
    return [{ value: '', label: 'All services' }, ...[...names].map((n) => ({ value: n, label: n }))];
  }, [errorsByService, url.service]);

  // Errors tab badge uses the same window as the list: exact 24 h total, else the sum of the grouped rows.
  const errorsInWindow = days === '1'
    ? errors24h
    : (errorsData ? errors.reduce((a, r) => a + (Number(r.count) || 0), 0) : null);
  const rangeLabel = RANGES.find((r) => r.value === days)?.label;
  // The badge follows the Errors tab window (default 7 days); the overview donut is always the last 24 hours — label both.
  const tabs = TABS.map((t) => (t.value === 'errors' && errorsInWindow ? { ...t, label: `Errors · ${rangeLabel}`, count: formatCount(errorsInWindow) } : t));

  return (
    <ModulePage className="sa-page">
      <p className="sa-live">Live · updated {ago}</p>

      {services.length ? (
        <section className={`sa-strip is-${health.level}`} role="status">
          <Icon name={health.level === 'green' ? 'tick' : 'alert'} size={18} />
          <div>
            <b>{health.title}</b>
            {health.reason ? <span>{health.reason}</span> : null}
          </div>
        </section>
      ) : null}

      {unavailable ? (
        <SectionState title="Platform health not available">
          The health API is not reachable. This screen stays empty until it responds.
        </SectionState>
      ) : null}
      {statusError ? (
        <SectionState
          tone="err"
          title="Could not load health data"
          action={(
            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reloadStatus().catch(() => {})}>
              <Icon name="refresh" size={16} /> Try again
            </button>
          )}
        >
          {apiErrorMessage(statusError, 'Please try again.')}
        </SectionState>
      ) : null}

      <TabNav tabs={tabs} value={tab} onChange={(v) => setUrl({ tab: v === 'overview' ? null : v }, { push: true })} label="Health sections" idBase="health" />

      <TabPanel value="overview" current={tab} idBase="health">
        <KpiRow label="Health summary" items={kpis} />

        <div className="dv-grid">
          <Panel title="Services" sub="Current state, p95 and server errors in the last 24 hours." bodyClassName={null}>
            {services.length ? (
              <ul className="sp-rows">
                {services.map((svc) => {
                  const e24 = Number(svc.errors_24h) || 0;
                  // A service that is up now but logged errors in the last 24 h must not read as all-clear.
                  const recent = serviceTone(svc.status) === 'green' && e24 > 0;
                  const tone = recent ? 'amber' : serviceTone(svc.status);
                  return (
                    <li key={svc.name} className="sp-row">
                      <span className={`sp-row-ic${tone === 'green' ? ' sp-row-ic--good' : ''} sa-svc-ic--${tone}`}>
                        <Icon name={tone === 'green' ? 'tick' : tone === 'muted' ? 'clock' : 'alert'} size={18} />
                      </span>
                      <div className="sp-row-main">
                        <b>{svc.name}</b>
                        <div className="sp-row-meta">
                          <span>p95 {groupNumbers(svc.p95) || '—'}</span>
                          {svc.note ? <span>{groupNumbers(svc.note)}</span> : null}
                        </div>
                      </div>
                      <span className={`sa-svc-errs${e24 ? ' is-on' : ''}`}>
                        <b>{formatCount(e24)}</b>
                        <small>errors · 24h</small>
                      </span>
                      <span className={`sp-pill ${TONE[tone]}`}>
                        <i className="un-dot" aria-hidden="true" />
                        {recent ? 'Recent errors' : svc.status}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="dv-empty sa-pad">{statusLoading ? 'Loading services…' : 'No service status available.'}</p>
            )}
          </Panel>

          {/* Errors donut + stage timings stack beside the tall Services list so neither card is half-empty. */}
          <div className="sa-col-stack">
            <Panel
              title="Errors by service · 24h"
              sub={errors24h != null ? `${formatCount(errors24h)} server errors logged in the last 24 hours.` : 'Server errors logged in the last 24 hours.'}
              className="mdc-card"
              action={errors24h != null ? <div className="mdc-chip"><small>Total errors · 24h</small><b>{formatCount(errors24h)}</b></div> : null}
            >
              {statusLoading && !statusData ? <p className="dv-empty">Loading…</p> : (
                <ModernDonut
                  title="Errors by service"
                  unit="Errors"
                  parts={serviceBars}
                  empty="No server errors in the last 24 hours."
                />
              )}
            </Panel>

            {statusLoading && !statusData ? (
              <Panel title="Video pipeline stages" sub="p95 time per stage of chapter video generation, last 7 days."><p className="dv-empty">Loading…</p></Panel>
            ) : (
              <MetricListCard
                title="Video pipeline stages"
                sub="p95 time per stage of chapter video generation, last 7 days."
                items={stageBars}
                format={formatMs}
                colorBy="single"
                empty="No chapters generated this week. Stage timings appear after the next one."
              />
            )}
          </div>
        </div>
      </TabPanel>

      <TabPanel value="errors" current={tab} idBase="health">
        <Panel
          title="Server errors"
          sub={`Grouped by error, newest first · last ${rangeLabel}. Emails and phone numbers are redacted.`}
          bodyClassName={null}
          toolbar={(
            <>
              <div className="sa-filter-select">
                <QuirriSelect
                  ariaLabel="Filter by service"
                  value={url.service}
                  onChange={(e) => setUrl({ service: e.target.value, page: '1' })}
                  options={serviceOptions}
                />
              </div>
              <SegTabs label="Time range" options={RANGES} value={days} onChange={(v) => setUrl({ days: v, page: '1' })} />
              {url.service || days !== '7' ? (
                <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setUrl({ service: '', days: '7', page: '1' })}>
                  Clear
                </button>
              ) : null}
            </>
          )}
        >
          {errorsError ? (
            <div className="sa-panel-state">
              <SectionState tone="err" title="Could not load errors">{apiErrorMessage(errorsError, 'Please try again.')}</SectionState>
            </div>
          ) : null}
          {errors.length ? (
            <div className="sp-table-wrap">
              <table className="sp-table un-table sa-table-tight sa-stack">
                <thead>
                  <tr>
                    <th>Error</th>
                    <th>Service</th>
                    <th className="num">Count</th>
                    <th>Last seen</th>
                    <th><span className="sr-only">Details</span></th>
                  </tr>
                </thead>
                <tbody>
                  {errRows.map((row) => {
                    const key = row.id || `${row.time}-${row.error}`;
                    const open = openError === key;
                    return <ErrorRow key={key} row={row} open={open} onToggle={() => setOpenError(open ? null : key)} />;
                  })}
                </tbody>
              </table>
            </div>
          ) : !errorsError ? (
            <p className="dv-empty sa-pad">
              {errorsLoading ? 'Loading errors…' : errorsData == null ? 'The error log is not available yet.' : `No server errors in the last ${rangeLabel}.`}
            </p>
          ) : null}
        </Panel>
        <Pager
          page={errPageNow}
          pageSize={ERR_PAGE_SIZE}
          total={errors.length}
          shown={errRows.length}
          onPage={(p) => { setOpenError(null); setUrl({ page: String(p) }, { push: true }); }}
          noun="errors"
        />
      </TabPanel>
    </ModulePage>
  );
}

export default function HealthPage() {
  return (
    <Suspense fallback={<SectionState title="Loading platform health…" />}>
      <HealthView />
    </Suspense>
  );
}

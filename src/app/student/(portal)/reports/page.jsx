'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import QuirriSelect from '@/components/superadmin/QuirriSelect';
import { Icon, SectionState } from '@/components/student/ui';
import { KpiRow, Panel, SegTabs } from '@/components/shared/module-ui';
import { BandPill, TrendChart } from '@/components/shared/data-viz';
import { reportsApi } from '@/lib/api/reports';
import { apiErrorMessage, asList } from '@/lib/api/superadmin/http';
import { formatDate, reportHref, score100 } from '@/lib/student/interviewReport';
import { titleCase } from '@/lib/student/learning';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useUrlSearch, useUrlState } from '@/hooks/useUrlState';
import '@/styles/student-reports.css';

/**
 * My reports (redesign spec student.md §6, 14 Oct 2026) — every scored interview
 * (GET /reports/livekit): KPI row with score band, score trend, live filters
 * (type, score, date, search), rows with a band pill. Filters live in the URL.
 */

const PAGE_SIZE = 10;
const TYPE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'mock', label: 'Mock' },
  { value: 'full', label: 'Full' },
];
// Backend ranges (report_routes.py) follow the score bands: 80-100 | 60-80 | 0-60.
const SCORE_OPTIONS = [
  { value: '', label: 'All scores' },
  { value: '80-100', label: 'Strong (80+)' },
  { value: '60-80', label: 'On track (60–79)' },
  { value: '0-60', label: 'Needs focus (below 60)' },
];
const DATE_OPTIONS = [
  { value: '', label: 'All dates' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'Last 30 days' },
];
const DEFAULTS = { q: '', type: '', score: '', date: '', page: '1' };

function typeLabel(t) {
  return t === 'full' ? 'Full interview' : t === 'mock' ? 'Mock interview' : 'Interview';
}

function ReportsInner() {
  const [applied, setApplied] = useUrlState(DEFAULTS);
  // Search applies as you type (debounced, shared hook) — same as the leaderboard.
  const [q, setQ] = useUrlSearch(applied.q, (v) => setApplied({ q: v, page: '1' }));

  const page = Math.max(1, Number(applied.page) || 1);
  const { data, loading, error, reload } = useAsyncResource(
    () => reportsApi.getLivekit({
      page,
      page_size: PAGE_SIZE,
      search: applied.q || undefined,
      type: applied.type || undefined,
      score_range: applied.score || undefined,
      date: applied.date || undefined,
    }),
    [page, applied.q, applied.type, applied.score, applied.date],
  );
  // Trend follows the active filters, like the KPIs (latest 30 matching reports).
  const { data: trendData } = useAsyncResource(
    () => reportsApi.getLivekit({
      page: 1,
      page_size: 30,
      search: applied.q || undefined,
      type: applied.type || undefined,
      score_range: applied.score || undefined,
      date: applied.date || undefined,
    }),
    [applied.q, applied.type, applied.score, applied.date],
  );

  const items = asList(data, []);
  const total = Number(data?.total) || 0;
  const kpi = data?.kpi || null;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(applied.q || applied.type || applied.score || applied.date);
  const hasScores = Boolean(kpi && Number(kpi.total_reports));
  const avg = hasScores ? Math.round(Number(kpi.avg_score)) : null;
  const kpiLoading = loading && !data;
  const kpiEmptySub = filtered ? 'No reports match these filters' : 'After your first report';
  const best = hasScores ? Math.round(Number(kpi.highest_score)) : null;

  const trend = asList(trendData, [])
    .filter((r) => score100(r.score) != null && r.completed_date)
    .sort((a, b) => Date.parse(a.completed_date) - Date.parse(b.completed_date))
    .map((r) => ({ label: formatDate(r.completed_date), score: score100(r.score) }));

  const set = (patch) => setApplied({ ...patch, page: '1' });
  const clear = () => { setQ(''); setApplied({ ...DEFAULTS }); };

  return (
    <div className="srp animate-fade-in">
      <KpiRow
        label="Report summary"
        items={[
          { icon: 'doc', label: 'Total reports', value: kpi ? String(kpi.total_reports ?? total) : '—', sub: kpiLoading ? 'Loading…' : (filtered ? 'Matching these filters' : 'Scored mock and full interviews') },
          { icon: 'bars', label: 'Average score', value: avg != null ? <span className="srp-kpi-v">{avg}<small>/100</small> <BandPill score={avg} /></span> : '—', sub: kpiLoading ? 'Loading…' : hasScores ? (filtered ? 'Across matching reports' : 'Across all your reports') : kpiEmptySub },
          { icon: 'trophy', label: 'Highest score', value: best != null ? <span className="srp-kpi-v">{best}<small>/100</small></span> : '—', sub: kpiLoading ? 'Loading…' : hasScores ? (filtered ? 'Best matching session' : 'Your best session so far') : kpiEmptySub },
        ]}
      />

      {trend.length >= 2 ? (
        <Panel title="Score trend" sub={filtered ? 'Matching reports over time (out of 100)' : 'Your interview scores over time (out of 100)'}>
          <TrendChart data={trend} series={[{ key: 'score', name: 'Score', color: '#0E5C6B' }]} height={200} suffix="/100" />
        </Panel>
      ) : null}

      <Panel
        title="All reports"
        sub={items.length ? 'Select a report to open the full feedback.' : undefined}
        bodyClassName="srp-list-b"
        toolbar={(
          <>
            <SegTabs label="Interview type" value={applied.type} onChange={(v) => set({ type: v })} options={TYPE_OPTIONS} />
            <label className="srp-search">
              <Icon name="search" size={18} />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by role…" aria-label="Search by role" />
            </label>
            <QuirriSelect ariaLabel="Score" value={applied.score} options={SCORE_OPTIONS} onChange={(e) => set({ score: e.target.value })} />
            <QuirriSelect ariaLabel="Date" value={applied.date} options={DATE_OPTIONS} onChange={(e) => set({ date: e.target.value })} />
            {filtered ? <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={clear}>Clear</button> : null}
          </>
        )}
      >
        {error ? (
          <SectionState
            tone="err"
            title="Could not load your reports"
            action={<button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload().catch(() => {})}><Icon name="refresh" size={16} /> Try again</button>}
          >
            {apiErrorMessage(error, 'Please try again.')}
          </SectionState>
        ) : null}

        {loading && !items.length && !error ? <div className="srp-skel" aria-hidden="true"><span /><span /><span /></div> : null}

        {!loading && !error && !items.length ? (
          <SectionState
            title={filtered ? 'No reports match these filters' : 'No reports yet'}
            action={filtered
              ? <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={clear}>Clear filters</button>
              : <Link className="sd-btn sd-btn--teal sd-btn--sm" href="/student/interviews">Start an interview</Link>}
          >
            {filtered ? 'Try a different role, type, score or date.' : 'Finish a mock or full interview — your scored report will appear here.'}
          </SectionState>
        ) : null}

        {items.length ? (
          <ul className="srp-rows">
            {items.map((item) => {
              const s = score100(item.score);
              return (
                <li key={item.session_id}>
                  <Link className="srp-row" href={reportHref(item.session_id)}>
                    <span className="srp-row-ic" aria-hidden="true"><Icon name="mic" size={18} /></span>
                    <div className="srp-row-main">
                      <span className="srp-row-t">{titleCase(item.title || 'Interview')}</span>
                      <span className="srp-row-meta">
                        <span className="srp-row-type">{typeLabel(item.interview_type)}</span>
                        <span>{formatDate(item.completed_date) || '—'}</span>
                      </span>
                    </div>
                    <BandPill score={s} label={s == null ? 'Not scored' : undefined} />
                    <b className="srp-row-score">{s ?? '—'}{s != null ? <small className="srp-of">/100</small> : null}</b>
                    <span className="srp-row-go" aria-hidden="true"><Icon name="chev" size={16} /></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}

        {total > PAGE_SIZE ? (
          <nav className="srp-pager" aria-label="Pages">
            <span>Page {page} of {pages} · {total} reports</span>
            <div>
              <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" disabled={page <= 1} onClick={() => setApplied({ page: String(page - 1) })}>
                <Icon name="back" size={16} /> Previous
              </button>
              <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" disabled={page >= pages} onClick={() => setApplied({ page: String(page + 1) })}>
                Next <Icon name="chev" size={16} />
              </button>
            </div>
          </nav>
        ) : null}
      </Panel>
    </div>
  );
}

/** My reports — every scored interview (GET /reports/livekit), filterable and paged. */
export default function StudentReportsPage() {
  return (
    <Suspense fallback={<div className="srp"><SectionState title="Loading your reports…" /></div>}>
      <ReportsInner />
    </Suspense>
  );
}

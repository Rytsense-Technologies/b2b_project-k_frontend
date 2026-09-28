'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import InterviewNav from '@/components/student/interviews/InterviewNav';
import PerformanceChart from '@/components/student/dashboard/PerformanceChart';
import { Icon, Kpi, SectionState } from '@/components/student/ui';
import { reportsApi } from '@/lib/api/reports';
import { apiErrorMessage, asList } from '@/lib/api/superadmin/http';
import { formatDate, scoreBandKey } from '@/lib/student/interviewReport';
import { useAsyncResource } from '@/hooks/useAsyncResource';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'mock', label: 'Mock' },
  { id: 'full', label: 'Full' },
];

function shortDate(iso) {
  const d = new Date(iso || '');
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** My reports — every scored interview (GET /reports/livekit). */
export default function StudentInterviewReportsPage() {
  const [filter, setFilter] = useState('all');
  const { data, loading, error, reload } = useAsyncResource(
    () => reportsApi.getLivekit({ page: 1, page_size: 50 }),
    [],
  );

  const items = useMemo(() => asList(data, []), [data]);
  const kpi = data?.kpi || null;
  const shown = filter === 'all' ? items : items.filter((i) => i.interview_type === filter);
  const mockCount = items.filter((i) => i.interview_type === 'mock').length;
  const fullCount = items.filter((i) => i.interview_type === 'full').length;

  const trend = useMemo(() => [...items]
    .filter((i) => Number.isFinite(Number(i.score)))
    .sort((a, b) => (Date.parse(a.completed_date || '') || 0) - (Date.parse(b.completed_date || '') || 0))
    .slice(-8)
    .map((i) => ({
      label: shortDate(i.completed_date),
      score: Math.round(Number(i.score)),
      title: i.title || 'Interview',
      date: formatDate(i.completed_date) || '',
      detail: i.interview_type === 'full' ? 'Full interview' : 'Mock interview',
    })), [items]);

  return (
    <div className="animate-fade-in sp">
      <InterviewNav active="reports" reportCount={kpi ? (kpi.total_reports ?? items.length) : null} />

      <section className="sd-kpis" aria-label="Report summary">
        <Kpi icon="check" label="Completed" value={kpi ? (kpi.total_reports ?? items.length) : null} sub="Scored interview reports" />
        <Kpi icon="trend" label="Average score" value={kpi?.avg_score != null ? Math.round(Number(kpi.avg_score)) : null} sub="Across all reports" />
        <Kpi icon="trophy" label="Best score" value={kpi?.highest_score != null ? Math.round(Number(kpi.highest_score)) : null} sub="Your personal best" />
        <Kpi icon="layers" label="Mock · Full" value={loading && !data ? null : `${mockCount} · ${fullCount}`} sub="Sessions by type" />
      </section>

      {error ? (
        <SectionState
          tone="err"
          title="Could not load your reports"
          action={(
            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload().catch(() => {})}>
              <Icon name="refresh" size={16} /> Try again
            </button>
          )}
        >
          {apiErrorMessage(error, 'Please try again.')}
        </SectionState>
      ) : null}

      <section className="sd-bottom iv-reports-grid">
        <div className="sd-card sd-perf">
          <div className="sd-card-h">
            <div>
              <h3>Score trend</h3>
              <p>Your last {trend.length || ''} interview scores</p>
            </div>
            <button type="button" className="sd-iconbtn" onClick={() => reload().catch(() => {})} aria-label="Refresh reports">
              <Icon name="refresh" size={16} />
            </button>
          </div>
          {trend.length ? (
            <PerformanceChart items={trend} ariaLabel="Your interview scores over time" />
          ) : (
            <SectionState title={loading ? 'Loading your scores' : 'No scores yet'}>
              {loading ? null : 'Finish an interview — your scores plot here.'}
            </SectionState>
          )}
        </div>

        <div className="sp-panel">
          <div className="sp-panel-h">
            <div>
              <h3>All reports</h3>
              <p>Open a report for per-question feedback and your improvement plan.</p>
            </div>
          </div>
          <div className="sp-panel-b iv-filter-bar">
            <div className="sp-tabs iv-filter" role="tablist" aria-label="Filter by interview type">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  className="sp-tab"
                  aria-selected={filter === f.id}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loading && !items.length ? (
            <div className="sp-panel-b"><SectionState title="Loading">Fetching your completed interviews…</SectionState></div>
          ) : null}

          {!loading && !error && !shown.length ? (
            <div className="sp-panel-b">
              <SectionState
                title={items.length ? 'No reports of this type' : 'No interviews yet'}
                action={!items.length ? (
                  <Link className="sd-btn sd-btn--amber sd-btn--sm" href="/student/interviews">Start your first interview</Link>
                ) : null}
              >
                {items.length ? 'Try another filter.' : 'Completed mock and full interviews will appear here with their scores.'}
              </SectionState>
            </div>
          ) : null}

          {shown.length ? (
            <ul className="sp-rows iv-report-list">
              {shown.map((item) => {
                const score = item.score != null && Number.isFinite(Number(item.score)) ? Math.round(Number(item.score)) : null;
                const band = scoreBandKey(score);
                return (
                  <li key={item.session_id}>
                    <Link
                      className="sp-row iv-row-link"
                      href={`/student/interviews/report?session=${encodeURIComponent(item.session_id)}`}
                    >
                      <span className={`iv-score-chip iv-score-chip--${band}`}>{score ?? '—'}</span>
                      <div className="sp-row-main">
                        <b>{item.title || 'Interview'}</b>
                        <div className="sp-row-meta">
                          <span className="sp-pill sp-pill--teal">{item.interview_type === 'full' ? 'Full' : item.interview_type === 'mock' ? 'Mock' : 'Interview'}</span>
                          <span>{formatDate(item.completed_date) || '—'}</span>
                        </div>
                      </div>
                      <span className="sp-link">View report <Icon name="chev" size={14} /></span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </section>
    </div>
  );
}

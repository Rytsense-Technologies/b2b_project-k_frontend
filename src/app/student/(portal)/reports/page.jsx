'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import QuirriSelect from '@/components/superadmin/QuirriSelect';
import { Icon, SectionState } from '@/components/student/ui';
import { reportsApi } from '@/lib/api/reports';
import { apiErrorMessage, asList } from '@/lib/api/superadmin/http';
import { BAND_LABEL, formatDate, reportHref, score100, scoreBandKey } from '@/lib/student/interviewReport';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useUrlState } from '@/hooks/useUrlState';
import '@/styles/student-reports.css';

const PAGE_SIZE = 10;
const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'mock', label: 'Mock interview' },
  { value: 'full', label: 'Full interview' },
];
// Backend bands: score_range=80-100 | 50-80
const SCORE_OPTIONS = [
  { value: '', label: 'All scores' },
  { value: '80-100', label: '80 and above' },
  { value: '50-80', label: '50–79' },
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
  const [draft, setDraft] = useState(applied);
  useEffect(() => { setDraft(applied); }, [applied]);

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

  const items = asList(data, []);
  const total = Number(data?.total) || 0;
  const kpi = data?.kpi || null;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(applied.q || applied.type || applied.score || applied.date);

  const search = (e) => {
    e?.preventDefault();
    setApplied({ q: draft.q.trim(), type: draft.type, score: draft.score, date: draft.date, page: '1' });
  };
  const clear = () => setApplied({ ...DEFAULTS });

  return (
    <div className="srp animate-fade-in">
      <form className="srp-filter" role="search" aria-label="Filter reports" onSubmit={search}>
        <label className="srp-search">
          <Icon name="search" size={18} />
          <input
            type="search"
            value={draft.q}
            onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
            placeholder="Search by role…"
            aria-label="Search by role"
          />
        </label>
        <QuirriSelect ariaLabel="Interview type" value={draft.type} options={TYPE_OPTIONS} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))} />
        <QuirriSelect ariaLabel="Score" value={draft.score} options={SCORE_OPTIONS} onChange={(e) => setDraft((d) => ({ ...d, score: e.target.value }))} />
        <QuirriSelect ariaLabel="Date" value={draft.date} options={DATE_OPTIONS} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} />
        <button type="button" className="sd-btn srp-clear" onClick={clear}>Clear</button>
        <button type="submit" className="sd-btn sd-btn--amber">Search</button>
      </form>

      <div className="srp-list-meta">
        <p>{items.length ? 'Select a report to open the full feedback.' : ' '}</p>
        <div className="srp-kpis" aria-label="Report summary">
          <div className="srp-kpi"><b>{kpi ? (kpi.total_reports ?? total) : '—'}</b><span>Total</span></div>
          <div className="srp-kpi"><b>{kpi && kpi.total_reports ? Math.round(Number(kpi.avg_score)) : '—'}</b><span>Average</span></div>
          <div className="srp-kpi"><b>{kpi && kpi.total_reports ? Math.round(Number(kpi.highest_score)) : '—'}</b><span>Highest</span></div>
        </div>
      </div>

      {error ? (
        <SectionState
          tone="err"
          title="Could not load your reports"
          action={<button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload().catch(() => {})}><Icon name="refresh" size={16} /> Try again</button>}
        >
          {apiErrorMessage(error, 'Please try again.')}
        </SectionState>
      ) : null}

      {loading && !items.length && !error ? <SectionState title="Loading your reports…" /> : null}

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
        <ol className="srp-rows">
          {items.map((item, i) => {
            const s = score100(item.score);
            const band = scoreBandKey(s);
            return (
              <li key={item.session_id}>
                <Link className="srp-row" href={reportHref(item.session_id)}>
                  <div>
                    <span className="srp-row-n">{String((page - 1) * PAGE_SIZE + i + 1).padStart(2, '0')}</span>
                    <span className="srp-row-t">{item.title || 'Interview'}</span>
                  </div>
                  <div>
                    <span className="srp-row-type">{typeLabel(item.interview_type)}</span>
                    <span className="srp-row-date">{formatDate(item.completed_date) || '—'}</span>
                  </div>
                  <div className="srp-row-score">
                    <b className={`srp-tone--${band}`}>{s ?? '—'}</b>
                    <div>
                      <span>Score</span>
                      <small>{BAND_LABEL[band]}</small>
                    </div>
                  </div>
                  <span className="srp-row-go" aria-hidden="true"><Icon name="chev" size={16} /></span>
                </Link>
              </li>
            );
          })}
        </ol>
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

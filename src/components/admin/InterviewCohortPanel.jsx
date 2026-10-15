'use client';

import { useMemo } from 'react';
import { useUrlState } from '@/hooks/useUrlState';
import Link from 'next/link';
import { QuirriSelect } from '@/components/superadmin/quirri-ui';
import { Icon, Panel, SectionState, SegTabs, countLabel } from '@/components/shared/module-ui';
import { BandPill, BarList, Distribution, ScoreMeter } from '@/components/shared/data-viz';
import { analyticsApi } from '@/lib/api/analytics';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { formatPct } from '@/lib/superadmin/format';

/** Cohort status → band colour key (not started grey · practising blue · ready green). */
const STATUS_PARTS = [
  { status: 'not_started', key: 'none', label: 'Not started' },
  { status: 'practising', key: 'ok', label: 'Practising' },
  { status: 'ready', key: 'strong', label: 'Ready (70%+)' },
];
const STATUS = {
  not_started: { label: 'Not started', cls: '' },
  practising: { label: 'Practising', cls: 'sp-pill--teal' },
  ready: { label: 'Interview ready', cls: 'sp-pill--good' },
};

function day(iso) {
  const d = new Date(iso || '');
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function pct(v) {
  return v == null || v === '' ? '—' : formatPct(v);
}

function Score({ value }) {
  if (value == null) return <span className="sa-muted">—</span>;
  return <span className="an-score">{pct(value)}<BandPill score={value} /></span>;
}

/**
 * Cohort readiness (all time): how final-year students, and anyone who practised,
 * are doing in mock interviews. College Admin sees every department (with a filter);
 * HOD / Faculty their own scope.
 */
export default function InterviewCohortPanel({
  load = analyticsApi.college,
  analyticsHref = '/admin/analytics',
  showDepartment = true,
}) {
  // Filters live in the URL (cstatus / cyear / cdept) so refresh and Back keep them. They are
  // prefixed so they never clash with the Assignments tab's status / dept / mode keys.
  // cyear '' = default: Final year when there are final-year students, else Everyone (so a student
  // who practised is never hidden behind an empty default).
  const [url, setUrl] = useUrlState({ cstatus: 'all', cyear: '', cdept: '' });
  const status = ['all', ...STATUS_PARTS.map((p) => p.status)].includes(url.cstatus) ? url.cstatus : 'all';
  const finalPick = url.cyear === 'final' || url.cyear === 'all' ? url.cyear : null;
  const department = showDepartment ? url.cdept : '';
  const setStatus = (v) => setUrl({ cstatus: v });
  const setFinalOnly = (v) => setUrl({ cyear: v || '' });
  const setDepartment = (v) => setUrl({ cdept: v });
  const { data, loading, error, reload } = useAsyncResource(() => load({ range: 'all_time' }), []);
  const cohort = useMemo(() => data?.interview_cohort || [], [data]);

  const departments = useMemo(
    () => [...new Set(cohort.map((r) => r.department).filter(Boolean))].sort(),
    [cohort],
  );
  const finalOnly = finalPick ?? (cohort.some((r) => r.final_year) ? 'final' : 'all');
  const inScope = cohort.filter((r) => (finalOnly === 'all' || r.final_year) && (!department || r.department === department));
  const shown = status === 'all' ? inScope : inScope.filter((r) => r.status === status);
  const count = (k) => inScope.filter((r) => r.status === k).length;
  const parts = STATUS_PARTS.map((p) => ({ ...p, value: count(p.status) }));

  const weakCounts = new Map();
  inScope.forEach((r) => { if (r.weak_area) weakCounts.set(r.weak_area, (weakCounts.get(r.weak_area) || 0) + 1); });
  const weakAreas = [...weakCounts].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ key: label, label, value }));

  const finals = cohort.filter((r) => r.final_year).length;
  const others = cohort.length - finals;

  if (loading && !data) return <SectionState title="Loading cohort…" />;
  if (error) {
    return (
      <SectionState
        tone="err"
        title="Could not load cohort readiness"
        action={<button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload()}>Try again</button>}
      >
        {apiErrorMessage(error, 'Try again in a moment.')}
      </SectionState>
    );
  }

  const one = inScope.length === 1;
  const groupLabel = finalOnly === 'final' ? (one ? 'final-year student' : 'final-year students') : (one ? 'student' : 'students');

  return (
    <>
      <div className="dv-grid">
        <Panel
          title="Readiness"
          sub={`${countLabel(inScope.length)} ${groupLabel} · a best score of 70% or more counts as ready`}
        >
          <Distribution
            parts={parts}
            label="Interview readiness"
            empty={finalOnly === 'final' && others ? 'No final-year students yet. Show everyone to see who practised.' : 'No final-year students or mock interviews yet.'}
          />
        </Panel>
        <Panel title="What to work on" sub="Most common weak area in each student's mock interviews">
          <BarList label="Weak areas" items={weakAreas} empty="Weak areas appear after students finish a mock interview." />
        </Panel>
      </div>

      <Panel
        className="ia-cohort-tools"
        title="Cohort"
        sub={finalOnly === 'final'
          ? `All time · final-year students${others ? ` (${countLabel(others)} more in other years practised; choose Everyone)` : ''}`
          : 'All time · final-year students and anyone who practised a mock interview'}
        action={analyticsHref ? <Link className="sp-link" href={analyticsHref}>Analytics <Icon name="arrow" size={14} /></Link> : null}
        bodyClassName={null}
        toolbar={(
          <>
            <SegTabs
              label="Readiness"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: 'All', count: inScope.length },
                ...STATUS_PARTS.map((p) => ({ value: p.status, label: p.label.replace(' (70%+)', ''), count: count(p.status) })),
              ]}
            />
            <SegTabs
              label="Year"
              value={finalOnly}
              onChange={setFinalOnly}
              options={[
                { value: 'final', label: 'Final year', count: finals },
                { value: 'all', label: 'Everyone', count: cohort.length },
              ]}
            />
            {showDepartment && departments.length > 1 ? (
              <QuirriSelect
                ariaLabel="Filter by department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                options={[{ value: '', label: 'All departments' }, ...departments.map((d) => ({ value: d, label: d }))]}
              />
            ) : null}
            {status !== 'all' || finalPick != null || department ? (
              <button
                type="button"
                className="sd-btn sd-btn--ghost sd-btn--sm"
                onClick={() => {
                  setUrl({ cstatus: 'all', cyear: '', cdept: '' });
                  // Clear unmounts itself: keep focus on the first filter instead of BODY.
                  window.requestAnimationFrame(() => document.querySelector('.ia-cohort-tools .pm-panel-tools button')?.focus());
                }}
              >
                Clear
              </button>
            ) : null}
          </>
        )}
      >
        {!shown.length ? (
          <div className="sp-panel-b">
            <SectionState title={cohort.length ? 'Nobody in this group' : 'No final-year students yet'}>
              {cohort.length
                ? (finalOnly === 'final' && others ? 'Choose Everyone to include students in other years who practised.' : 'Pick another group.')
                : 'Final years are recognised from each student’s programme and semester, set by the College Admin.'}
            </SectionState>
          </div>
        ) : (
          <div className="sp-table-wrap">
            <table className="sp-table un-table ad-stack">
              <thead>
                <tr>
                  <th>Student</th>
                  {showDepartment ? <th>Department</th> : null}
                  <th className="num">Mocks</th>
                  <th>Best</th>
                  <th>Latest</th>
                  <th>Readiness</th>
                  <th>Work on</th>
                  <th>Last mock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <b>{r.student}</b>
                      <small className="ad-cell-sub">{r.final_year ? 'Final year' : r.year_of_study ? `Year ${r.year_of_study}` : 'Year not set'}</small>
                    </td>
                    {showDepartment ? <td data-label="Department">{r.department || '—'}</td> : null}
                    <td className="num" data-label="Mocks">{countLabel(r.sessions)}</td>
                    <td data-label="Best"><Score value={r.best_score} /></td>
                    <td data-label="Latest"><Score value={r.last_score} /></td>
                    <td data-label="Readiness">{r.readiness == null ? <span className="sa-muted">—</span> : <ScoreMeter value={r.readiness} label="Readiness" />}</td>
                    <td data-label="Work on">{r.weak_area || <span className="sa-muted">—</span>}</td>
                    <td data-label="Last mock">{day(r.last_at) || <span className="sa-muted">Never</span>}</td>
                    <td data-label="Status">
                      <span className={`sp-pill ${STATUS[r.status].cls}`}><i className="un-dot" aria-hidden="true" />{STATUS[r.status].label}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

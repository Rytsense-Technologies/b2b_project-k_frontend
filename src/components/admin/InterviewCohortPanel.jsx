'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icon, Panel, SectionState, SegTabs, countLabel } from '@/components/shared/module-ui';
import ScoreCell from '@/components/superadmin/ScoreCell';
import { analyticsApi } from '@/lib/api/analytics';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'not_started', label: 'Not started' },
  { value: 'practising', label: 'Practising' },
  { value: 'ready', label: 'Ready' },
];
const STATUS = {
  not_started: { label: 'Not started', cls: '' },
  practising: { label: 'Practising', cls: 'sp-pill--low' },
  ready: { label: 'Interview ready', cls: 'sp-pill--good' },
};

function day(iso) {
  const d = new Date(iso || '');
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** College Admin: how the final-year cohort is doing in mock interviews (all time). */
export default function InterviewCohortPanel({ load = analyticsApi.college, analyticsHref = '/admin/analytics' }) {
  const [tab, setTab] = useState('all');
  const { data, loading, error, reload } = useAsyncResource(() => load({ range: 'all_time' }), []);
  const cohort = data?.interview_cohort || [];
  const shown = tab === 'all' ? cohort : cohort.filter((r) => r.status === tab);
  const count = (k) => cohort.filter((r) => r.status === k).length;

  return (
    <Panel
      title="Cohort results"
      sub="Final-year students and anyone who practised · best score of 70% or more counts as ready"
      action={<Link className="sp-link" href={analyticsHref}>Full analytics <Icon name="arrow" size={14} /></Link>}
      bodyClassName={null}
    >
      <div className="sp-panel-b ad-panel-tools">
        <SegTabs
          label="Readiness"
          value={tab}
          onChange={setTab}
          options={TABS.map((o) => ({ ...o, count: data ? (o.value === 'all' ? cohort.length : count(o.value)) : null }))}
        />
      </div>
      {loading && !data ? <div className="sp-panel-b"><SectionState title="Loading cohort…" /></div> : null}
      {error ? (
        <div className="sp-panel-b">
          <SectionState
            tone="err"
            title="Could not load cohort results"
            action={<button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload()}>Try again</button>}
          >
            {apiErrorMessage(error, 'Try again in a moment.')}
          </SectionState>
        </div>
      ) : null}
      {data && !shown.length ? (
        <div className="sp-panel-b">
          <SectionState title={cohort.length ? 'Nobody in this group' : 'No final-year students yet'}>
            {cohort.length
              ? 'Pick another group.'
              : 'Final years are recognised from each student’s programme and semester, set by the College Admin.'}
          </SectionState>
        </div>
      ) : null}
      {shown.length ? (
        <div className="sp-table-wrap">
          <table className="sp-table un-table ad-stack">
            <thead>
              <tr>
                <th>Student</th>
                <th>Department</th>
                <th className="num">Mocks</th>
                <th className="num">Best</th>
                <th className="num">Latest</th>
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
                  <td data-label="Department">{r.department || '—'}</td>
                  <td className="num" data-label="Mocks">{countLabel(r.sessions)}</td>
                  <td className="num" data-label="Best"><ScoreCell value={r.best_score} /></td>
                  <td className="num" data-label="Latest"><ScoreCell value={r.last_score} /></td>
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
      ) : null}
    </Panel>
  );
}

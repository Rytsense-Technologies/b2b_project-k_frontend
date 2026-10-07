'use client';

import { useMemo } from 'react';
import {
  Icon,
  ModuleBanner,
  ModulePage,
  Panel,
  SectionState,
} from '@/components/shared/module-ui';
import { analyticsApi } from '@/lib/api/analytics';
import { apiErrorMessage, asList } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

export default function AdminAnalyticsPage() {
  const { data, loading, error, reload } = useAsyncResource(
    () => analyticsApi.college(),
    [],
  );

  const departments = useMemo(() => asList(data?.departments ?? data, []), [data]);

  return (
    <ModulePage>
      <ModuleBanner
        icon="chart"
        eyebrow="Insights"
        title="Analytics"
        lede="Assessment performance and interview readiness across your college departments."
      />

      <Panel title="Department performance" sub="Live averages from chapter quizzes and completed interviews." bodyClassName={null}>
        {loading ? (
          <SectionState title="Loading analytics">Aggregating department scores.</SectionState>
        ) : error ? (
          <SectionState
            tone="err"
            title="Could not load analytics"
            action={<button type="button" className="sd-btn sd-btn--ghost" onClick={() => reload()}>Retry</button>}
          >
            {apiErrorMessage(error, 'Try again in a moment.')}
          </SectionState>
        ) : departments.length === 0 ? (
          <SectionState title="No analytics yet">
            {data?.note || 'Add departments and students, then quiz attempts will appear here.'}
          </SectionState>
        ) : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th className="num">Students</th>
                  <th className="num">Completion</th>
                  <th className="num">Avg score</th>
                  <th className="num">Pass rate</th>
                  <th className="num">Interview ready</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((d) => (
                  <tr key={d.department_id || d.department}>
                    <td>{d.department}</td>
                    <td className="num">{d.students ?? '—'}</td>
                    <td className="num">{d.completion != null ? `${d.completion}%` : '—'}</td>
                    <td className="num">{d.avg_score != null ? `${d.avg_score}%` : '—'}</td>
                    <td className="num">{d.pass_rate != null ? `${d.pass_rate}%` : '—'}</td>
                    <td className="num">
                      {d.interview_ready_pct != null ? `${d.interview_ready_pct}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="pm-grid-2">
        <Panel title="Q&A demand" sub="Questions students ask, by subject">
          <div className="ad-empty">
            <span className="ad-empty-ic" aria-hidden="true"><Icon name="chat" size={20} /></span>
            <div>
              <b>Not aggregated yet</b>
              <small>Voice Q&A volume charts need event rollups. Per-lesson Q&A still works in Classroom.</small>
            </div>
          </div>
        </Panel>
        <Panel title="Interview readiness" sub="Final-year students with a completed mock">
          <div className="ad-empty">
            <span className="ad-empty-ic" aria-hidden="true"><Icon name="mic" size={20} /></span>
            <div>
              <b>{data?.active_assignments ?? 0} active assignment{(data?.active_assignments === 1) ? '' : 's'}</b>
              <small>Per-department readiness is in the table above (Interview ready column).</small>
            </div>
          </div>
        </Panel>
      </div>
    </ModulePage>
  );
}

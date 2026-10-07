'use client';

import {
  Icon,
  KpiRow,
  ModuleBanner,
  ModulePage,
  Panel,
  SectionState,
} from '@/components/shared/module-ui';
import { analyticsApi } from '@/lib/api/analytics';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

export default function FacultyAnalyticsPage() {
  const { data, loading, error, reload } = useAsyncResource(
    () => analyticsApi.department(),
    [],
  );

  return (
    <ModulePage>
      <ModuleBanner
        icon="chart"
        eyebrow="Insights"
        title="Department analytics"
        lede={
          data?.department
            ? `Performance for ${data.department}.`
            : 'Assessment and interview signals for your department.'
        }
      />

      {loading ? (
        <SectionState title="Loading analytics">Fetching department metrics.</SectionState>
      ) : error ? (
        <SectionState
          tone="err"
          title="Could not load analytics"
          action={<button type="button" className="sd-btn sd-btn--ghost" onClick={() => reload()}>Retry</button>}
        >
          {apiErrorMessage(error, 'Try again in a moment.')}
        </SectionState>
      ) : data?.note && !data?.department_id ? (
        <SectionState title="Department not set">{data.note}</SectionState>
      ) : (
        <>
          <KpiRow
            label="Department summary"
            items={[
              { icon: 'users', label: 'Students', value: data?.students ?? 0, sub: 'Active in your department' },
              {
                icon: 'tick',
                label: 'Avg quiz score',
                value: data?.avg_score != null ? `${data.avg_score}%` : '—',
                sub: `${data?.attempts ?? 0} attempts`,
              },
              {
                icon: 'chart',
                label: 'Pass rate',
                value: data?.pass_rate != null ? `${data.pass_rate}%` : '—',
                sub: 'Score ≥ 60%',
              },
              {
                icon: 'mic',
                label: 'Interviews done',
                value: data?.interview_completed ?? 0,
                sub: `${data?.final_year_students ?? 0} final-year students`,
              },
            ]}
          />
          <Panel title="How to read this" sub="Calm, evidence-based signals — not a ranking board.">
            <div className="ad-empty">
              <span className="ad-empty-ic" aria-hidden="true"><Icon name="info" size={20} /></span>
              <div>
                <b>Scores come from chapter quizzes</b>
                <small>Interview completion counts students who finished a mock or full interview. Watch-time completion needs learning-event tables and stays blank for now.</small>
              </div>
            </div>
          </Panel>
        </>
      )}
    </ModulePage>
  );
}

'use client';

import AdminEmptyModule from '@/components/admin/AdminEmptyModule';
import { useQuirriTip } from '@/components/superadmin/QuirriTooltip';
import { Icon, KpiRow, Panel } from '@/components/shared/module-ui';

export default function InterviewsPage() {
  const { show, hide, TipLayer } = useQuirriTip();

  return (
    <>
      <AdminEmptyModule
        icon="mic"
        title="Interview assignments"
        description="Assign AI mock interviews to final-year cohorts and track completion. Only final-year students are eligible."
        epic="the interview assignments service"
        steps={[
          { title: 'Pick a cohort', body: 'Choose final-year students by department and year.' },
          { title: 'Assign an interview', body: 'Set the interview mode and a due date for the cohort.' },
          { title: 'Track completion', body: 'See who has finished, their scores and who needs support.' },
        ]}
        actions={(
          <button
            type="button"
            className="sd-btn sd-btn--amber"
            disabled
            aria-label="New assignment — not available yet"
            onMouseEnter={(e) => show(e, 'Available when interview assignment API is live', 'top')}
            onMouseLeave={hide}
            onFocus={(e) => show(e, 'Available when interview assignment API is live', 'top')}
            onBlur={hide}
          >
            <Icon name="plus" size={16} /> New assignment
          </button>
        )}
      >
        <div className="ad-page ad-soon-body">
          <KpiRow
            label="Interview summary"
            items={[
              { icon: 'users', label: 'Final-year students', value: null, sub: 'Not connected yet' },
              { icon: 'calendar', label: 'Assigned', value: null, sub: 'No live data' },
              { icon: 'tick', label: 'Completed', value: null, sub: 'No live data' },
              { icon: 'alert', label: 'Needs support', value: null, sub: 'Score below 60%' },
            ]}
          />

          <Panel title="Active assignments" sub="Assignments you create will be listed here." bodyClassName={null}>
            <div className="sp-table-wrap">
              <table className="sp-table">
                <thead>
                  <tr>
                    <th>Assignment</th>
                    <th>Cohort</th>
                    <th>Mode</th>
                    <th>Due</th>
                    <th className="num">Completion</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={5} className="ad-table-empty">
                      No assignments yet. You can create one once interview assignments are available.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </AdminEmptyModule>
      <TipLayer />
    </>
  );
}

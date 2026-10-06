'use client';

import AdminEmptyModule from '@/components/admin/AdminEmptyModule';
import { useQuirriTip } from '@/components/superadmin/QuirriTooltip';
import { Icon, Panel } from '@/components/shared/module-ui';

export default function AnalyticsPage() {
  const { show, hide, TipLayer } = useQuirriTip();

  return (
    <>
      <AdminEmptyModule
        icon="chart"
        title="Analytics"
        description="Completion, assessment performance, Q&A demand and interview readiness across your college."
        epic="the analytics service"
        steps={[
          { title: 'Department performance', body: 'Completion, average score and pass rate for each department.' },
          { title: 'Q&A demand', body: 'Which subjects and chapters students ask the most about.' },
          { title: 'Interview readiness', body: 'How ready final-year students are, based on mock interviews.' },
        ]}
        actions={(
          <button
            type="button"
            className="sd-btn sd-btn--ghost"
            disabled
            aria-label="Export — not available yet"
            onMouseEnter={(e) => show(e, 'Export when analytics API is live', 'top')}
            onMouseLeave={hide}
            onFocus={(e) => show(e, 'Export when analytics API is live', 'top')}
            onBlur={hide}
          >
            <Icon name="download" size={16} /> Export
          </button>
        )}
      >
        <div className="ad-page ad-soon-body">
          <Panel title="Department performance" sub="One row per department, last 30 days." bodyClassName={null}>
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
                  <tr>
                    <td colSpan={6} className="ad-table-empty">
                      No analytics yet. The department breakdown appears once analytics is available.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="pm-grid-2">
            <Panel title="Q&A demand" sub="Questions students ask, by subject">
              <div className="ad-empty">
                <span className="ad-empty-ic" aria-hidden="true"><Icon name="chat" size={20} /></span>
                <div>
                  <b>Nothing to show yet</b>
                  <small>Question volume charts appear once analytics is available.</small>
                </div>
              </div>
            </Panel>
            <Panel title="Interview readiness" sub="Final-year students, by department">
              <div className="ad-empty">
                <span className="ad-empty-ic" aria-hidden="true"><Icon name="mic" size={20} /></span>
                <div>
                  <b>Nothing to show yet</b>
                  <small>Readiness scores need interview assignments and analytics.</small>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </AdminEmptyModule>
      <TipLayer />
    </>
  );
}

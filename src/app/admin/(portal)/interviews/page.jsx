'use client';

import AdminEmptyModule from '@/components/admin/AdminEmptyModule';
import { useQuirriTip } from '@/components/superadmin/QuirriTooltip';

export default function InterviewsPage() {
  const { show, hide, TipLayer } = useQuirriTip();

  return (
    <>
      <AdminEmptyModule
        title="Interview Assignments"
        description="Assign AI mock interviews to final-year cohorts and track completion. Only final-year students are eligible."
        epic="EPIC-18 (interview assignments)"
        actions={(
          <button
            type="button"
            className="btn btn-primary"
            disabled
            aria-label="New assignment — not available yet"
            onMouseEnter={(e) => show(e, 'Available when interview assignment API is live', 'top')}
            onMouseLeave={hide}
            onFocus={(e) => show(e, 'Available when interview assignment API is live', 'top')}
            onBlur={hide}
          >
            New assignment
          </button>
        )}
      >
        <div className="stats c4" style={{ marginTop: 4 }}>
          <div className="stat">
            <div className="k">Final-year students</div>
            <div className="v">—</div>
            <div className="s">Needs EPIC-06 + EPIC-18</div>
          </div>
          <div className="stat">
            <div className="k">Assigned</div>
            <div className="v">—</div>
            <div className="s">No live data</div>
          </div>
          <div className="stat">
            <div className="k">Completed</div>
            <div className="v">—</div>
            <div className="s">No live data</div>
          </div>
          <div className="stat">
            <div className="k">At risk</div>
            <div className="v">—</div>
            <div className="s">Score below 60%</div>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h3>Active assignments</h3></div>
          <table>
            <thead>
              <tr>
                <th>Assignment</th>
                <th>Cohort</th>
                <th>Mode</th>
                <th>Due</th>
                <th>Completion</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6}>No assignments yet. Create one when EPIC-18 is connected.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AdminEmptyModule>
      <TipLayer />
    </>
  );
}

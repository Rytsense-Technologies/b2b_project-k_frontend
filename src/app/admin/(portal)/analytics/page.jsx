'use client';

import AdminEmptyModule from '@/components/admin/AdminEmptyModule';
import { useQuirriTip } from '@/components/superadmin/QuirriTooltip';

export default function AnalyticsPage() {
  const { show, hide, TipLayer } = useQuirriTip();

  return (
    <>
      <AdminEmptyModule
        title="Analytics"
        description="Completion, assessment performance, Q&A demand, and interview readiness across your college."
        epic="EPIC-19 (analytics)"
        actions={(
          <button
            type="button"
            className="btn btn-ghost"
            disabled
            aria-label="Export — not available yet"
            onMouseEnter={(e) => show(e, 'Export when analytics API is live', 'top')}
            onMouseLeave={hide}
            onFocus={(e) => show(e, 'Export when analytics API is live', 'top')}
            onBlur={hide}
          >
            Export
          </button>
        )}
      >
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-h"><h3>Department performance</h3></div>
          <table>
            <thead>
              <tr>
                <th>Department</th>
                <th>Students</th>
                <th>Completion</th>
                <th>Avg score</th>
                <th>Pass rate</th>
                <th>Interview ready</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6}>No analytics rows yet. Department breakdown needs EPIC-06 and EPIC-19.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="cols">
          <div className="card card-p">
            <div className="card-h"><h3>Q&amp;A demand</h3></div>
            <div className="notice info">
              <div><b>Empty</b> Question volume charts arrive with EPIC-19.</div>
            </div>
          </div>
          <div className="card card-p">
            <div className="card-h"><h3>Interview readiness</h3></div>
            <div className="notice info">
              <div><b>Empty</b> Readiness scores need EPIC-18 and EPIC-19.</div>
            </div>
          </div>
        </div>
      </AdminEmptyModule>
      <TipLayer />
    </>
  );
}

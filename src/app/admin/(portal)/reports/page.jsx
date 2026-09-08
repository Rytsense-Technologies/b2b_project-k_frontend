'use client';

import { useState } from 'react';
import AdminEmptyModule from '@/components/admin/AdminEmptyModule';
import { SearchBox, QuirriSelect } from '@/components/superadmin/quirri-ui';
import { useQuirriTip } from '@/components/superadmin/QuirriTooltip';

export default function ReportsPage() {
  const { show, hide, TipLayer } = useQuirriTip();
  const [search, setSearch] = useState('');
  const [reportType, setReportType] = useState('student');

  return (
    <>
      <AdminEmptyModule
        title="Reports"
        description="Student-level and cohort-level reports."
        epic="EPIC-19 / EPIC-20 (reports)"
        actions={(
          <div style={{ display: 'flex', gap: 9 }}>
            {['CSV', 'Excel', 'PDF'].map((fmt) => (
              <button
                key={fmt}
                type="button"
                className="btn btn-ghost btn-sm"
                disabled
                aria-label={`${fmt} export — not available yet`}
                onMouseEnter={(e) => show(e, 'Export when reports API is live', 'top')}
                onMouseLeave={hide}
                onFocus={(e) => show(e, 'Export when reports API is live', 'top')}
                onBlur={hide}
              >
                {fmt}
              </button>
            ))}
          </div>
        )}
      >
        <div className="toolbar">
          <SearchBox
            placeholder="Search student, department, subject…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <QuirriSelect
            ariaLabel="Report type"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            options={[
              { value: 'student', label: 'Student performance' },
              { value: 'department', label: 'Department report' },
              { value: 'interview', label: 'Interview report' },
              { value: 'qa', label: 'Q&A report' },
            ]}
          />
        </div>

        <div className="card">
          <div className="card-h"><h3>Preview</h3></div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Scope</th>
                <th>Metric</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4}>
                  No preview rows. Filters are ready; results appear when the reports API is live
                  {search ? ` (search: “${search}”)` : ''}.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AdminEmptyModule>
      <TipLayer />
    </>
  );
}

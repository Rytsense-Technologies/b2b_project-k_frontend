'use client';

import { useState } from 'react';
import AdminEmptyModule from '@/components/admin/AdminEmptyModule';
import { QuirriSelect } from '@/components/superadmin/quirri-ui';
import { useQuirriTip } from '@/components/superadmin/QuirriTooltip';
import { Icon, FilterBar, SearchBox, Panel } from '@/components/shared/module-ui';

export default function ReportsPage() {
  const { show, hide, TipLayer } = useQuirriTip();
  const [search, setSearch] = useState('');
  const [reportType, setReportType] = useState('student');

  return (
    <>
      <AdminEmptyModule
        icon="doc"
        title="Reports"
        description="Student-level and cohort-level reports you can filter and export."
        epic="the reports service"
        steps={[
          { title: 'Choose a report', body: 'Student performance, department, interview or Q&A reports.' },
          { title: 'Filter it', body: 'Narrow by student, department or subject before you export.' },
          { title: 'Export', body: 'Download as CSV, Excel or PDF to share with your team.' },
        ]}
        actions={(
          <div className="ad-actions ad-actions--start">
            {['CSV', 'Excel', 'PDF'].map((fmt) => (
              <button
                key={fmt}
                type="button"
                className="sd-btn sd-btn--ghost sd-btn--sm"
                disabled
                aria-label={`${fmt} export — not available yet`}
                onMouseEnter={(e) => show(e, 'Export when reports API is live', 'top')}
                onMouseLeave={hide}
                onFocus={(e) => show(e, 'Export when reports API is live', 'top')}
                onBlur={hide}
              >
                <Icon name="download" size={14} /> {fmt}
              </button>
            ))}
          </div>
        )}
      >
        <div className="ad-page ad-soon-body">
          <FilterBar label="Report filters">
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
          </FilterBar>

          <Panel title="Preview" sub="A preview of the report appears here before you export it." bodyClassName={null}>
            <div className="sp-table-wrap">
              <table className="sp-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Scope</th>
                    <th>Metric</th>
                    <th className="num">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={4} className="ad-table-empty">
                      No preview rows yet. Your filters are ready; results appear once reports are available
                      {search ? ` (search: “${search}”)` : ''}.
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

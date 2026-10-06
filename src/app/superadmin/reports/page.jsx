'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { QuirriSelect } from '@/components/superadmin/quirri-ui';
import {
  ModulePage,
  ModuleBanner,
  KpiRow,
  FilterBar,
  Panel,
  Icon,
  SectionState,
  SearchBox,
  countLabel,
} from '@/components/shared/module-ui';
import { reportsApi, collegesApi, fetchData } from '@/lib/api/superadmin/modules';
import { asList, apiErrorMessage, fetchOptional } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

const REPORT_TYPES = [
  { value: 'institution', label: 'Institution report' },
  { value: 'department', label: 'Department report' },
  { value: 'student', label: 'Student performance' },
  { value: 'qa', label: 'Q&A report' },
  { value: 'interview', label: 'Interview report' },
];

const RANGES = [
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'this_semester', label: 'This semester' },
  { value: 'custom', label: 'Custom range' },
];

/** Empty panel body: Teal 300 outline icon, title, one line. */
function PanelEmpty({ icon, title, children }) {
  return (
    <div className="sa-empty">
      <span className="sa-empty-ic" aria-hidden="true"><Icon name={icon} size={24} /></span>
      <div>
        <b>{title}</b>
        {children ? <p>{children}</p> : null}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [search, setSearch] = useState('');
  const [reportType, setReportType] = useState('institution');
  const [college, setCollege] = useState('');
  const [range, setRange] = useState('last_30_days');

  const params = { search, report_type: reportType, college, range };

  const { data: collegeData } = useAsyncResource(
    () => fetchData(() => collegesApi.list({})),
    [],
  );
  const collegeOptions = useMemo(() => asList(collegeData, []), [collegeData]);

  const { data, loading, error } = useAsyncResource(
    () => fetchOptional(() => reportsApi.preview(params)),
    [search, reportType, college, range],
  );
  const unavailable = !loading && data == null && !error;
  const rows = useMemo(() => asList(data?.rows || data, []), [data]);
  const total = data?.total ?? rows.length;
  const page = data?.page ?? 1;
  const pages = data?.pages ?? 1;

  const handleDownload = async (format) => {
    try {
      await reportsApi.download(format, params);
    } catch (err) {
      toast.error(apiErrorMessage(err, `${format.toUpperCase()} download is not available yet.`));
    }
  };

  const typeLabel = REPORT_TYPES.find((t) => t.value === reportType)?.label || 'Report';
  const rangeLabel = RANGES.find((r) => r.value === range)?.label || '—';
  const collegeLabel = college ? (collegeOptions.find((c) => c.id === college)?.name || 'One institution') : 'All institutions';

  return (
    <ModulePage className="sa-page">
      <ModuleBanner
        icon="doc"
        eyebrow="Reporting"
        title="Reports"
        lede="Search across institutions, preview the result set, then export exactly what you previewed."
        chips={(
          <>
            <span className="is-on">{typeLabel}</span>
            <span>{collegeLabel}</span>
            <span>{rangeLabel}</span>
          </>
        )}
        actions={(
          <>
            <button type="button" className="sd-btn sd-btn--glass" onClick={() => handleDownload('xlsx')} disabled={unavailable}>
              Excel
            </button>
            <button type="button" className="sd-btn sd-btn--glass" onClick={() => handleDownload('pdf')} disabled={unavailable}>
              PDF
            </button>
            <button type="button" className="sd-btn sd-btn--amber" onClick={() => handleDownload('csv')} disabled={unavailable}>
              <Icon name="download" size={16} /> Export CSV
            </button>
          </>
        )}
      />

      <KpiRow
        label="Report summary"
        items={[
          { icon: 'list', label: 'Rows in preview', value: data ? countLabel(total) : null, sub: data ? `Page ${page} of ${pages}` : 'Preview not loaded' },
          { icon: 'doc', label: 'Report type', value: typeLabel, sub: 'Change it in the filters', tone: 'text' },
          { icon: 'calendar', label: 'Date range', value: rangeLabel, sub: collegeLabel, tone: 'text' },
        ]}
      />

      <FilterBar label="Report filters">
        <SearchBox
          placeholder="Search student, college, department, subject…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <QuirriSelect
          ariaLabel="Report type"
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          options={REPORT_TYPES}
        />
        <QuirriSelect
          ariaLabel="Filter by institution"
          value={college}
          onChange={(e) => setCollege(e.target.value)}
          placeholder="All institutions"
          options={collegeOptions.map((item) => ({
            value: item.id,
            label: item.name || item.id,
          }))}
        />
        <QuirriSelect
          ariaLabel="Date range"
          value={range}
          onChange={(e) => setRange(e.target.value)}
          options={RANGES}
        />
      </FilterBar>

      {unavailable ? (
        <SectionState title="Report preview not available">
          Report APIs are not reachable. Filters are ready; preview and export stay empty until the backend responds.
        </SectionState>
      ) : reportType !== 'institution' ? (
        <SectionState title="Learning reports need analytics">
          Institution report uses live college and student counts. Department, Q&amp;A, student, and interview reports stay empty until learning analytics ship.
        </SectionState>
      ) : null}

      {error ? (
        <SectionState tone="err" title="Could not load report preview">
          {apiErrorMessage(error, 'Please try again.')}
        </SectionState>
      ) : null}

      <Panel
        title="Report preview"
        sub="Exports contain exactly these rows."
        action={<span className="sp-pill sp-pill--teal">{countLabel(total)} rows · page {page} of {pages}</span>}
        bodyClassName={null}
      >
        {rows.length ? (
          <div className="sp-table-wrap">
            <table className="sp-table un-table sa-table-tight">
              <thead>
                <tr>
                  <th>Institution</th>
                  <th>Department</th>
                  <th className="num">Students</th>
                  <th className="num">Watch time</th>
                  <th className="num">Q&amp;A</th>
                  <th className="num">Assessments</th>
                  <th>Avg score</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.college}-${row.department}-${row.id || ''}`}>
                    <td><b>{row.college || row.institution}</b></td>
                    <td>{row.department}</td>
                    <td className="num">{row.students}</td>
                    <td className="num">{row.duration || row.watch_time}</td>
                    <td className="num">{row.questions || row.qa}</td>
                    <td className="num">{row.interviews || row.assessments}</td>
                    <td><span className="sp-pill sp-pill--good">{row.score || row.avg_score || '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <PanelEmpty icon="doc" title={loading ? 'Loading preview…' : 'No report rows for these filters'}>
            {loading ? null : 'Change the report type, institution or date range to preview a different set.'}
          </PanelEmpty>
        )}
      </Panel>
    </ModulePage>
  );
}

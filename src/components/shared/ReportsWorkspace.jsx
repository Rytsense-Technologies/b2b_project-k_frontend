'use client';

import { useEffect, useMemo, useState } from 'react';
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
  Pager,
  countLabel,
} from '@/components/shared/module-ui';
import { reportsApi, collegesApi, departmentsApi, fetchData } from '@/lib/api/superadmin/modules';
import { asList, apiErrorMessage, fetchOptional } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import ScoreCell from '@/components/superadmin/ScoreCell';

const REPORT_TYPES = [
  { value: 'institution', label: 'Institution report' },
  { value: 'department', label: 'Department report' },
  { value: 'student', label: 'Student performance' },
  { value: 'qa', label: 'Q&A report' },
  { value: 'interview', label: 'Interview report' },
];

/** HOD: their own department only (the server forces it). */
const DEPARTMENT_REPORT_TYPES = [
  { value: 'student', label: 'Student performance' },
  { value: 'qa', label: 'Q&A report' },
  { value: 'interview', label: 'Interview report' },
  { value: 'department', label: 'Department summary' },
];

/** College Admin: their own college only - the cohort / department / student views. */
const COLLEGE_REPORT_TYPES = [
  { value: 'student', label: 'Student performance' },
  { value: 'department', label: 'Department report' },
  { value: 'qa', label: 'Q&A report' },
  { value: 'interview', label: 'Interview report' },
  { value: 'institution', label: 'College summary' },
];

const RANGES = [
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'last_90_days', label: 'Last 90 days' },
  { value: 'this_semester', label: 'This semester' },
  { value: 'all_time', label: 'All time' },
];

const PAGE_SIZE = 25;

/** Columns the API sends for each report type; used until the first response lands. */
const FALLBACK_COLUMNS = [
  { key: 'college', label: 'Institution', kind: 'text' },
  { key: 'students', label: 'Students', kind: 'num' },
  { key: 'avg_score', label: 'Avg score', kind: 'score' },
];

function formatMinutes(mins) {
  const m = Number(mins) || 0;
  if (!m) return '0m';
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`;
}

function formatDay(iso) {
  const d = new Date(iso || '');
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

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

/**
 * Reports preview + export. `scope="platform"` (Super Admin): every institution.
 * `scope="college"` (College Admin): the server locks every call to the caller's
 * college; the filter is by department instead.
 */
export default function ReportsWorkspace({ scope = 'platform', collegeName = '', departmentName = '' }) {
  const isDept = scope === 'department';
  const isCollege = scope === 'college' || isDept;
  const types = isDept ? DEPARTMENT_REPORT_TYPES : isCollege ? COLLEGE_REPORT_TYPES : REPORT_TYPES;
  const [search, setSearch] = useState('');
  const [reportType, setReportType] = useState(types[0].value);
  const [college, setCollege] = useState('');
  const [department, setDepartment] = useState('');
  const [range, setRange] = useState('last_30_days');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState('');

  const params = isCollege
    ? { search, report_type: reportType, department, range }
    : { search, report_type: reportType, college, range };
  useEffect(() => { setPage(1); }, [search, reportType, college, department, range]);

  const { data: collegeData } = useAsyncResource(
    () => (isCollege ? Promise.resolve(null) : fetchData(() => collegesApi.list({}))),
    [isCollege],
  );
  const { data: deptData } = useAsyncResource(
    () => (isCollege && !isDept ? fetchData(() => departmentsApi.list({ is_active: true, page: 1, pageSize: 100 })) : Promise.resolve(null)),
    [isCollege, isDept],
  );
  const departmentOptions = useMemo(() => asList(deptData, []), [deptData]);
  const collegeOptions = useMemo(() => asList(collegeData, []), [collegeData]);
  // Two colleges can share a name (e.g. a re-onboarded one); their codes tell them apart.
  const sharedNames = useMemo(() => {
    const seen = new Map();
    collegeOptions.forEach((c) => seen.set(c.name, (seen.get(c.name) || 0) + 1));
    return new Set([...seen].filter(([, k]) => k > 1).map(([name]) => name));
  }, [collegeOptions]);

  const { data, loading, error } = useAsyncResource(
    () => fetchOptional(() => reportsApi.preview({ ...params, page, page_size: PAGE_SIZE })),
    [search, reportType, college, department, range, page],
  );
  const unavailable = !loading && data == null && !error;
  const rows = useMemo(() => asList(data?.rows || data, []), [data]);
  const allColumns = data?.columns?.length ? data.columns : FALLBACK_COLUMNS;
  // One college: its name in every row adds nothing on screen (exports keep it).
  const columns = isCollege && reportType !== 'institution'
    ? allColumns.filter((c) => c.key !== 'college')
    : allColumns;
  const total = data?.total ?? rows.length;
  const pages = data?.pages ?? 1;

  const formatName = (format) => (format === 'xlsx' ? 'Excel' : format.toUpperCase());
  const handleDownload = async (format) => {
    setExporting(format);
    try {
      await reportsApi.download(format, params);
      toast.success(`${formatName(format)} export downloaded`);
    } catch (err) {
      toast.error(apiErrorMessage(err, `Could not export the ${formatName(format)} file.`));
    } finally {
      setExporting('');
    }
  };

  const renderCell = (row, col) => {
    const v = row[col.key];
    if (col.kind === 'score') return <ScoreCell value={v} />;
    if (v === null || v === undefined || v === '') return <span className="sa-muted">—</span>;
    if (col.kind === 'duration') return formatMinutes(v);
    if (col.kind === 'percent') return `${v}%`;
    if (col.kind === 'date') return formatDay(v) || <span className="sa-muted">—</span>;
    if (col.kind === 'num') return countLabel(v);
    if (col.key === 'college') {
      const code = sharedNames.has(v) ? (row.college_code || null) : null;
      return (
        <>
          <b>{v}</b>
          {code ? <small className="sa-row-code">{code}</small> : null}
        </>
      );
    }
    if (col.key === 'student' || (col.key === 'department' && reportType === 'department')) {
      const sub = col.key === 'student' ? row.email : row.code;
      return (
        <>
          <b>{v}</b>
          {sub ? <small className="sa-row-code">{sub}</small> : null}
        </>
      );
    }
    return v;
  };

  const typeLabel = types.find((t) => t.value === reportType)?.label || 'Report';
  const rangeLabel = RANGES.find((r) => r.value === range)?.label || '—';
  const collegeLabel = isDept
    ? (departmentName || 'Your department')
    : isCollege
    ? (department ? (departmentOptions.find((d) => d.id === department)?.name || 'One department') : (collegeName || 'Your college'))
    : (college ? (collegeOptions.find((c) => c.id === college)?.name || 'One institution') : 'All institutions');

  return (
    <ModulePage className="sa-page">
      <ModuleBanner
        icon="doc"
        eyebrow="Reporting"
        title="Reports"
        lede={isCollege
          ? `Student and cohort reports for your ${isDept ? 'department' : 'college'}. Preview the rows, then export exactly what you previewed.`
          : 'Search across institutions, preview the result set, then export exactly what you previewed.'}
        chips={(
          <>
            <span className="is-on">{typeLabel}</span>
            <span>{collegeLabel}</span>
            <span>{rangeLabel}</span>
          </>
        )}
        actions={(
          <>
            <button type="button" className="sd-btn sd-btn--glass" onClick={() => handleDownload('xlsx')} disabled={unavailable || Boolean(exporting)}>
              {exporting === 'xlsx' ? 'Exporting…' : 'Excel'}
            </button>
            <button type="button" className="sd-btn sd-btn--glass" onClick={() => handleDownload('pdf')} disabled={unavailable || Boolean(exporting)}>
              {exporting === 'pdf' ? 'Exporting…' : 'PDF'}
            </button>
            <button type="button" className="sd-btn sd-btn--amber" onClick={() => handleDownload('csv')} disabled={unavailable || Boolean(exporting)}>
              <Icon name="download" size={16} /> {exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
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
          placeholder={isCollege ? 'Search student, email or department…' : 'Search student, college, department, subject…'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <QuirriSelect
          ariaLabel="Report type"
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          options={types}
        />
        {isDept ? null : isCollege ? (
          <QuirriSelect
            ariaLabel="Filter by department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="All departments"
            options={[{ value: '', label: 'All departments' }, ...departmentOptions.map((d) => ({ value: d.id, label: d.name }))]}
          />
        ) : (
          <QuirriSelect
            ariaLabel="Filter by institution"
            value={college}
            onChange={(e) => setCollege(e.target.value)}
            placeholder="All institutions"
            options={collegeOptions.map((item) => ({
              value: item.id,
              label: sharedNames.has(item.name) && item.code ? `${item.name} (${item.code})` : (item.name || item.id),
            }))}
          />
        )}
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
                  {columns.map((col) => (
                    <th key={col.key} className={col.kind === 'text' || col.kind === 'date' ? undefined : 'num'}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id || i}>
                    {columns.map((col) => (
                      <td key={col.key} className={col.kind === 'text' || col.kind === 'date' ? undefined : 'num'}>
                        {renderCell(row, col)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <PanelEmpty icon="doc" title={loading ? 'Loading preview…' : 'No report rows for these filters'}>
            {loading ? null : reportType === 'qa'
              ? 'No student has asked the AI tutor a question in this range.'
              : `Change the report type${isDept ? '' : `, ${isCollege ? 'department' : 'institution'}`} or date range to preview a different set.`}
          </PanelEmpty>
        )}
      </Panel>

      {rows.length ? (
        <Pager page={page} pageSize={PAGE_SIZE} total={total} shown={rows.length} onPage={setPage} noun="rows" />
      ) : null}
    </ModulePage>
  );
}

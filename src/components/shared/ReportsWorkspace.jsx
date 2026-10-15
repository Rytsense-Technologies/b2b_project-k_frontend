'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { QuirriSelect } from '@/components/superadmin/quirri-ui';
import {
  ModulePage,
  ModuleHead,
  HeadChip,
  TabNav,
  Panel,
  Icon,
  SectionState,
  SearchBox,
  Pager,
  countLabel,
} from '@/components/shared/module-ui';
import { useTabParam, useUrlSearch, useUrlState } from '@/hooks/useUrlState';
import { useTabInView } from '@/components/admin/insights';
import { reportsApi, collegesApi, departmentsApi, fetchData } from '@/lib/api/superadmin/modules';
import { asList, apiErrorMessage, fetchOptional } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { BandPill } from '@/components/shared/data-viz';
import { formatMinutes, formatPct } from '@/lib/superadmin/format';

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

/** Tab label per report type (the long label titles the preview panel). */
function tabLabel(value, scope) {
  if (value === 'institution') return scope === 'platform' ? 'Institutions' : 'College summary';
  if (value === 'department') return scope === 'department' ? 'Department summary' : 'Departments';
  return { student: 'Students', qa: 'Q&A', interview: 'Interviews' }[value] || value;
}

/**
 * Reports preview + export. `scope="platform"` (Super Admin): every institution.
 * `scope="college"` (College Admin): the server locks every call to the caller's
 * college; the filter is by department instead. `scope="department"` (HOD): the
 * server forces their department.
 */
export default function ReportsWorkspace({ scope = 'platform', collegeName = '', departmentName = '', chips = null }) {
  const isDept = scope === 'department';
  const isCollege = scope === 'college' || isDept;
  const types = isDept ? DEPARTMENT_REPORT_TYPES : isCollege ? COLLEGE_REPORT_TYPES : REPORT_TYPES;
  // Report type = tab (?tab=); search / filters / page in the URL too. The search box is
  // useUrlSearch: it never drops characters and the request goes out once typing pauses.
  const [reportType] = useTabParam(types.map((t) => t.value), types[0].value);
  const [url, setUrl] = useUrlState({ q: '', range: 'last_30_days', dept: '', college: '', page: '1' });
  const range = RANGES.some((r) => r.value === url.range) ? url.range : 'last_30_days';
  const department = isCollege && !isDept ? url.dept : '';
  const college = isCollege ? '' : url.college;
  const search = url.q;
  const page = Math.max(1, Number.parseInt(url.page, 10) || 1);
  useTabInView('rp', reportType);
  const [searchInput, setSearchInput] = useUrlSearch(search, (v) => setUrl({ q: v, page: '1' }));
  const [exporting, setExporting] = useState('');
  const setPage = (p) => setUrl({ page: String(p) });
  // Every filter change starts again at page 1.
  const setFilter = (patch) => setUrl({ ...patch, page: '1' });
  const setReportType = (v) => setUrl({ tab: v, page: '1' }, { push: true });

  const params = isCollege
    ? { search, report_type: reportType, department, range }
    : { search, report_type: reportType, college, range };

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
  const apiColumns = data?.columns?.length ? data.columns : FALLBACK_COLUMNS;
  // Quiz and mock interview averages apart when the rows carry them (reports.py metrics); the
  // blended avg_score is kept only as a clearly labelled fallback. Exports keep the API columns.
  const hasSplit = rows.some((r) => 'quiz_avg' in r || 'interview_avg' in r);
  const allColumns = apiColumns.flatMap((c) => {
    if (c.key !== 'avg_score') return [c];
    return hasSplit
      ? [{ key: 'quiz_avg', label: 'Quiz avg', kind: 'score' }, { key: 'interview_avg', label: 'Mock avg', kind: 'percent' }]
      : [{ ...c, label: 'Overall avg' }];
  });
  // One college: its name in every row adds nothing on screen (exports keep it).
  const columns = isCollege && reportType !== 'institution'
    ? allColumns.filter((c) => c.key !== 'college')
    : allColumns;
  const total = data?.total ?? rows.length;
  // Nothing to export: the filters (including the search) matched no rows.
  const noRows = !loading && data != null && Number(total) === 0;
  // Exports stay off until the preview has answered (and while it reloads), so an export
  // always matches the rows on screen.
  const pages = data?.pages ?? 1;
  const exportDisabled = Boolean(error) || loading || data == null || unavailable || noRows || Boolean(exporting);

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
    // Same formats as the dashboards: "20.9%" (one decimal) with the design score band, "45 min".
    if (col.kind === 'score') {
      return v == null || v === '' ? <span className="sa-muted">—</span> : <span className="an-score">{formatPct(v)}<BandPill score={v} /></span>;
    }
    if (v === null || v === undefined || v === '') return <span className="sa-muted">—</span>;
    if (col.kind === 'duration') return formatMinutes(v);
    if (col.kind === 'percent') return formatPct(v);
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
  const scopeLabel = isDept
    ? (departmentName || 'Your department')
    : isCollege
    ? (department ? (departmentOptions.find((d) => d.id === department)?.name || 'One department') : (collegeName || 'Your college'))
    : (college ? (collegeOptions.find((c) => c.id === college)?.name || 'One institution') : 'All institutions');
  const filtered = Boolean(searchInput.trim() || search || department || college || range !== 'last_30_days');

  const toolbar = (
    <>
      <SearchBox
        placeholder={isDept ? 'Search student or email…' : isCollege ? 'Search student, email or department…' : 'Search student, college, department, subject…'}
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
      />
      {isDept ? null : isCollege ? (
        <QuirriSelect
          ariaLabel="Filter by department"
          value={department}
          onChange={(e) => setFilter({ dept: e.target.value })}
          placeholder="All departments"
          options={[{ value: '', label: 'All departments' }, ...departmentOptions.map((d) => ({ value: d.id, label: d.name }))]}
        />
      ) : (
        <QuirriSelect
          ariaLabel="Filter by institution"
          value={college}
          onChange={(e) => setFilter({ college: e.target.value })}
          placeholder="All institutions"
          options={[{ value: '', label: 'All institutions' }, ...collegeOptions.map((item) => ({
            value: item.id,
            label: sharedNames.has(item.name) && item.code ? `${item.name} (${item.code})` : (item.name || item.id),
          }))]}
        />
      )}
      <QuirriSelect
        ariaLabel="Date range"
        value={range}
        onChange={(e) => setFilter({ range: e.target.value })}
        options={RANGES}
      />
      {filtered ? (
        <button
          type="button"
          className="sd-btn sd-btn--ghost sd-btn--sm"
          onClick={() => { setSearchInput(''); setFilter({ q: '', dept: '', college: '', range: 'last_30_days' }); }}
        >
          Clear
        </button>
      ) : null}
    </>
  );

  const exportGroup = (
    <div className="rp-export" role="group" aria-label="Export">
      <button type="button" className="sd-btn sd-btn--outline sd-btn--sm" onClick={() => handleDownload('xlsx')} disabled={exportDisabled}>
        {exporting === 'xlsx' ? 'Exporting…' : 'Excel'}
      </button>
      <button type="button" className="sd-btn sd-btn--outline sd-btn--sm" onClick={() => handleDownload('pdf')} disabled={exportDisabled}>
        {exporting === 'pdf' ? 'Exporting…' : 'PDF'}
      </button>
      <button type="button" className="sd-btn sd-btn--amber sd-btn--sm" onClick={() => handleDownload('csv')} disabled={exportDisabled}>
        <Icon name="download" size={16} /> {exporting === 'csv' ? 'Exporting…' : 'CSV'}
      </button>
    </div>
  );

  const textCol = (col) => col.kind === 'text' || col.kind === 'date';

  return (
    <ModulePage className="sa-page rp-page">
      <ModuleHead
        chips={chips || <HeadChip icon={isCollege ? 'building' : 'layers'}>{scopeLabel}</HeadChip>}
      />

      <TabNav
        label="Report type"
        idBase="rp"
        value={reportType}
        onChange={setReportType}
        tabs={types.map((t) => ({ value: t.value, label: tabLabel(t.value, scope) }))}
      />

      <div role="tabpanel" id={`rp-panel-${reportType}`} aria-labelledby={`rp-${reportType}`} className="pm-tabpanel">
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
          className="rp-panel"
          title={typeLabel}
          sub={data
            ? `${countLabel(total)} ${Number(total) === 1 ? 'row' : 'rows'} · page ${page} of ${pages} · exports contain exactly these rows`
            : 'Exports contain exactly the rows you preview.'}
          action={exportGroup}
          toolbar={toolbar}
          bodyClassName={null}
        >
          {rows.length ? (
            <div className="sp-table-wrap">
              <table className="sp-table un-table sa-table-tight ad-stack rp-table">
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={col.key} className={textCol(col) ? undefined : 'num'}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.id || i}>
                      {columns.map((col, ci) => (
                        <td
                          key={col.key}
                          className={textCol(col) ? undefined : 'num'}
                          data-label={ci === 0 ? undefined : col.label}
                        >
                          {renderCell(row, col)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : error ? null : (
            <div className="sp-panel-b">
              <PanelEmpty icon="doc" title={loading ? 'Loading preview…' : search.trim() ? `No rows match "${search.trim()}"` : 'No report rows for these filters'}>
                {loading ? null : search.trim()
                  ? 'Clear or change the search to see rows again.'
                  : reportType === 'qa'
                  ? 'No student has asked the AI tutor a question in this range.'
                  : `Change the report type${isDept ? '' : `, ${isCollege ? 'department' : 'institution'}`} or date range to preview a different set.`}
              </PanelEmpty>
            </div>
          )}
          {rows.length ? (
            <Pager page={page} pageSize={PAGE_SIZE} total={total} shown={rows.length} onPage={setPage} noun="rows" />
          ) : null}
        </Panel>
      </div>
    </ModulePage>
  );
}

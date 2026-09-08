'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import QuirriBadge from '@/components/superadmin/QuirriBadge';
import { SearchBox, QuirriSelect } from '@/components/superadmin/quirri-ui';
import { reportsApi, collegesApi, fetchData } from '@/lib/api/superadmin/modules';
import { asList, apiErrorMessage, fetchOptional } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

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

  return (
    <div className="animate-fade-in">
      <div className="section-head">
        <div>
          <div className="t">Reports</div>
          <div className="d">Search across institutions, preview the result set, then export exactly what you previewed.</div>
        </div>
        <div style={{ display: 'flex', gap: 9 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDownload('csv')} disabled={unavailable}>CSV</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDownload('xlsx')} disabled={unavailable}>Excel</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDownload('pdf')} disabled={unavailable}>PDF</button>
        </div>
      </div>

      <div className="toolbar">
        <SearchBox
          placeholder="Search student, college, department, subject…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <QuirriSelect
          ariaLabel="Report type"
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          options={[
            { value: 'institution', label: 'Institution report' },
            { value: 'department', label: 'Department report' },
            { value: 'student', label: 'Student performance' },
            { value: 'qa', label: 'Q&A report' },
            { value: 'interview', label: 'Interview report' },
          ]}
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
          options={[
            { value: 'last_30_days', label: 'Last 30 days' },
            { value: 'this_semester', label: 'This semester' },
            { value: 'custom', label: 'Custom range' },
          ]}
        />
      </div>

      {unavailable ? (
        <div className="notice info" style={{ marginBottom: 12 }}>
          <div>
            <b>Report preview not available</b>
            Report APIs are not reachable. Filters are ready; preview and export stay empty until the backend responds.
          </div>
        </div>
      ) : reportType !== 'institution' ? (
        <div className="notice info" style={{ marginBottom: 12 }}>
          <div>
            <b>Learning reports need analytics</b>
            Institution report uses live college and student counts. Department, Q&amp;A, student, and interview reports stay empty until learning analytics ship.
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="notice err" style={{ marginBottom: 12 }}>
          <div>
            <b>Could not load report preview</b>
            {apiErrorMessage(error, 'Please try again.')}
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="card-h">
          <h3>Report preview</h3>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {total} rows · page {page} of {pages}
          </span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Institution</th>
              <th>Department</th>
              <th>Students</th>
              <th>Watch time</th>
              <th>Q&amp;A</th>
              <th>Assessments</th>
              <th>Avg score</th>
            </tr>
          </thead>
          <tbody>
            {loading && !rows.length ? (
              <tr><td colSpan={7}>Loading preview…</td></tr>
            ) : null}
            {!loading && !rows.length ? (
              <tr><td colSpan={7}>No report rows for these filters.</td></tr>
            ) : null}
            {rows.map((row) => (
              <tr key={`${row.college}-${row.department}-${row.id || ''}`}>
                <td>{row.college || row.institution}</td>
                <td>{row.department}</td>
                <td className="num">{row.students}</td>
                <td className="num">{row.duration || row.watch_time}</td>
                <td className="num">{row.questions || row.qa}</td>
                <td className="num">{row.interviews || row.assessments}</td>
                <td>
                  <QuirriBadge variant="green" plain>
                    {row.score || row.avg_score || '—'}
                  </QuirriBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

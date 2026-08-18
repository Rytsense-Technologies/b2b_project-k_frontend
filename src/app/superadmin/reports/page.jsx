'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  QuirriToolbar,
  QuirriFilters,
  QuirriBtn,
  QuirriSectionTitle,
} from '@/components/superadmin/quirri-ui';
import { REPORT_PREVIEW, COLLEGES } from '@/lib/mock/superadminData';
import { reportsApi } from '@/lib/api/superadmin/modules';
import { asList, downloadCsv, withMock } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

const COLUMNS = [
  { key: 'college', label: 'College' },
  { key: 'department', label: 'Department' },
  { key: 'students', label: 'Students' },
  { key: 'duration', label: 'Self Learning Duration' },
  { key: 'questions', label: 'Questions Asked' },
  { key: 'interviews', label: 'Interviews' },
  { key: 'score', label: 'Avg Score' },
];

export default function ReportsPage() {
  const [search, setSearch] = useState('');
  const [reportType, setReportType] = useState('');
  const [college, setCollege] = useState('');
  const [range, setRange] = useState('last_30_days');
  const [generating, setGenerating] = useState(false);

  const params = { search, report_type: reportType, college, range };

  const { data, reload } = useAsyncResource(
    () => withMock(() => reportsApi.preview(params), REPORT_PREVIEW),
    [search, reportType, college, range],
  );
  const rows = useMemo(() => asList(data, REPORT_PREVIEW), [data]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await reportsApi.generate(params);
      toast.success('Report generated');
      await reload();
    } catch {
      toast.success('Preview refreshed from current filters (generate API not live yet)');
      await reload();
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (format) => {
    try {
      await reportsApi.download(format, params);
    } catch {
      if (format === 'csv') {
        downloadCsv(`report-${reportType || 'preview'}.csv`, rows, COLUMNS);
        toast.success('CSV downloaded from current preview');
        return;
      }
      toast.error(`${format.toUpperCase()} download needs the reports API`);
    }
  };

  return (
    <div className="animate-fade-in">
      <QuirriToolbar
        title="Reports"
        subtitle="Search, preview report data, and download selected results."
      >
        <QuirriBtn variant="light" onClick={() => handleDownload('xlsx')}>Download Excel</QuirriBtn>
        <QuirriBtn variant="light" onClick={() => handleDownload('pdf')}>Download PDF</QuirriBtn>
        <QuirriBtn variant="primary" onClick={handleGenerate} disabled={generating}>
          {generating ? 'Generating…' : 'Generate Report'}
        </QuirriBtn>
      </QuirriToolbar>

      <QuirriFilters>
        <input
          placeholder="Search student, college, department, subject, question keyword..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
          <option value="">Report Type</option>
          <option value="college">College Report</option>
          <option value="department">Department Report</option>
          <option value="student">Student Performance</option>
          <option value="qa">Q&A Report</option>
          <option value="interview">Interview Report</option>
          <option value="ai_usage">AI Usage Report</option>
        </select>
        <select value={college} onChange={(e) => setCollege(e.target.value)}>
          <option value="">All Colleges</option>
          {COLLEGES.map((item) => (
            <option key={item.id} value={item.name}>{item.name}</option>
          ))}
        </select>
        <select value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="last_30_days">Last 30 Days</option>
          <option value="this_month">This Month</option>
          <option value="custom">Custom Range</option>
        </select>
      </QuirriFilters>

      <div className="quirri-card quirri-report-preview">
        <QuirriSectionTitle
          title="Report Preview"
          action={(
            <div className="quirri-report-actions">
              <QuirriBtn variant="light" onClick={() => handleDownload('csv')}>CSV</QuirriBtn>
              <QuirriBtn variant="light" onClick={() => handleDownload('xlsx')}>Excel</QuirriBtn>
              <QuirriBtn variant="light" onClick={() => handleDownload('pdf')}>PDF</QuirriBtn>
            </div>
          )}
        />
        <table className="quirri-table">
          <thead>
            <tr>
              <th>College</th>
              <th>Department</th>
              <th>Students</th>
              <th>Self Learning Duration</th>
              <th>Questions Asked</th>
              <th>Interviews</th>
              <th>Avg Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.college}-${row.department}`}>
                <td>{row.college}</td>
                <td>{row.department}</td>
                <td>{row.students}</td>
                <td>{row.duration}</td>
                <td>{row.questions}</td>
                <td>{row.interviews}</td>
                <td>{row.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

'use client';

import {
  QuirriToolbar,
  QuirriFilters,
  QuirriBtn,
  QuirriSectionTitle,
} from '@/components/superadmin/quirri-ui';
import { REPORT_PREVIEW } from '@/lib/mock/superadminData';

export default function ReportsPage() {
  return (
    <div className="animate-fade-in">
      <QuirriToolbar
        title="Reports"
        subtitle="Search, preview report data, and download selected results."
      >
        <QuirriBtn variant="light">Download Excel</QuirriBtn>
        <QuirriBtn variant="light">Download PDF</QuirriBtn>
        <QuirriBtn variant="primary">Generate Report</QuirriBtn>
      </QuirriToolbar>

      <QuirriFilters>
        <input placeholder="Search student, college, department, subject, question keyword..." />
        <select defaultValue="">
          <option>Report Type</option>
          <option>College Report</option>
          <option>Department Report</option>
          <option>Student Performance</option>
          <option>Q&A Report</option>
          <option>Interview Report</option>
          <option>AI Usage Report</option>
        </select>
        <select defaultValue="">
          <option>All Colleges</option>
          <option>ABC Engineering</option>
          <option>City Arts & Science</option>
        </select>
        <select defaultValue="">
          <option>Last 30 Days</option>
          <option>This Month</option>
          <option>Custom Range</option>
        </select>
      </QuirriFilters>

      <div className="quirri-card quirri-report-preview">
        <QuirriSectionTitle
          title="Report Preview"
          action={(
            <div className="quirri-report-actions">
              <QuirriBtn variant="light">CSV</QuirriBtn>
              <QuirriBtn variant="light">Excel</QuirriBtn>
              <QuirriBtn variant="light">PDF</QuirriBtn>
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
            {REPORT_PREVIEW.map((row) => (
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

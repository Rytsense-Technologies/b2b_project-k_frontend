'use client';

import QuirriBadge from '@/components/superadmin/QuirriBadge';
import {
  QuirriToolbar,
  QuirriFilters,
  QuirriBtn,
} from '@/components/superadmin/quirri-ui';
import { AI_USAGE } from '@/lib/mock/superadminData';

export default function AiUsagePage() {
  return (
    <div className="animate-fade-in">
      <QuirriToolbar
        title="AI Usage Per Module"
        subtitle="Track AI usage across Self Learning, Q&A, Interview, and AI Skill Courses."
      >
        <QuirriBtn variant="light">Export Usage</QuirriBtn>
      </QuirriToolbar>

      <QuirriFilters>
        <input placeholder="Search college or module..." />
        <select defaultValue="">
          <option>All Modules</option>
          <option>Self Learning</option>
          <option>Q&A</option>
          <option>Interview</option>
          <option>AI Skill Course</option>
        </select>
        <select defaultValue="">
          <option>This Month</option>
          <option>Last Month</option>
        </select>
      </QuirriFilters>

      <div className="quirri-card quirri-table-wrap">
        <table className="quirri-table">
          <thead>
            <tr>
              <th>Module</th>
              <th>College</th>
              <th>Requests</th>
              <th>Token Usage</th>
              <th>Estimated Cost</th>
              <th>Limit Status</th>
            </tr>
          </thead>
          <tbody>
            {AI_USAGE.map((row) => (
              <tr key={`${row.module}-${row.college}`}>
                <td>{row.module}</td>
                <td>{row.college}</td>
                <td>{row.requests}</td>
                <td>{row.tokens}</td>
                <td>{row.cost}</td>
                <td><QuirriBadge variant={row.limitType}>{row.limit}</QuirriBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

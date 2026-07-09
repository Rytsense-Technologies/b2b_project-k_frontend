'use client';

import {
  QuirriToolbar,
  QuirriFilters,
  QuirriBtn,
} from '@/components/superadmin/quirri-ui';
import { AUDIT_LOGS } from '@/lib/mock/superadminData';

export default function AuditPage() {
  return (
    <div className="animate-fade-in">
      <QuirriToolbar
        title="Audit Logs"
        subtitle="Track every important admin action across the platform."
      >
        <QuirriBtn variant="light">Export Logs</QuirriBtn>
      </QuirriToolbar>

      <QuirriFilters>
        <input placeholder="Search action, user, college, module..." />
        <select defaultValue="">
          <option>All Modules</option>
          <option>College</option>
          <option>Department</option>
          <option>Email</option>
          <option>AI Course</option>
        </select>
        <select defaultValue="">
          <option>Last 30 Days</option>
          <option>Last 7 Days</option>
          <option>Today</option>
        </select>
      </QuirriFilters>

      <div className="quirri-card quirri-table-wrap">
        <table className="quirri-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>User</th>
              <th>Role</th>
              <th>Module</th>
              <th>Action</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {AUDIT_LOGS.map((row) => (
              <tr key={row.datetime}>
                <td>{row.datetime}</td>
                <td>{row.user}</td>
                <td>{row.role}</td>
                <td>{row.module}</td>
                <td>{row.action}</td>
                <td>{row.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  QuirriToolbar,
  QuirriFilters,
  QuirriBtn,
} from '@/components/superadmin/quirri-ui';
import { AUDIT_LOGS } from '@/lib/mock/superadminData';
import { auditApi } from '@/lib/api/superadmin/modules';
import { asList, downloadCsv, withMock } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

export default function AuditPage() {
  const [search, setSearch] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [range, setRange] = useState('last_30_days');

  const { data, loading } = useAsyncResource(
    () => withMock(() => auditApi.list({ search, module: moduleName, range }), AUDIT_LOGS),
    [search, moduleName, range],
  );
  const rows = useMemo(() => asList(data, AUDIT_LOGS), [data]);

  const handleExport = async () => {
    try {
      await auditApi.exportData({ search, module: moduleName, range });
    } catch {
      downloadCsv('audit-logs.csv', rows, [
        { key: 'datetime', label: 'Date & Time' },
        { key: 'user', label: 'User' },
        { key: 'role', label: 'Role' },
        { key: 'module', label: 'Module' },
        { key: 'action', label: 'Action' },
        { key: 'ip', label: 'IP Address' },
      ]);
      toast.success('Exported current logs (API export not live yet)');
    }
  };

  return (
    <div className="animate-fade-in">
      <QuirriToolbar
        title="Audit Logs"
        subtitle="Track every important admin action across the platform."
      >
        <QuirriBtn variant="light" onClick={handleExport}>Export Logs</QuirriBtn>
      </QuirriToolbar>

      <QuirriFilters>
        <input
          placeholder="Search action, user, college, module..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={moduleName} onChange={(e) => setModuleName(e.target.value)}>
          <option value="">All Modules</option>
          <option value="College">College</option>
          <option value="Department">Department</option>
          <option value="Email">Email</option>
          <option value="AI Course">AI Course</option>
        </select>
        <select value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="last_30_days">Last 30 Days</option>
          <option value="last_7_days">Last 7 Days</option>
          <option value="today">Today</option>
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
            {loading && !rows.length ? <tr><td colSpan={6}>Loading audit logs…</td></tr> : null}
            {rows.map((row) => (
              <tr key={row.id || row.datetime}>
                <td>{row.datetime || row.created_at}</td>
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

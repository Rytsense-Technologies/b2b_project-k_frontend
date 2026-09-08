'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import QuirriBadge from '@/components/superadmin/QuirriBadge';
import { SearchBox, QuirriSelect } from '@/components/superadmin/quirri-ui';
import { auditApi } from '@/lib/api/superadmin/modules';
import { asList, apiErrorMessage, fetchOptional } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

function rolePill(role) {
  const r = String(role || '').toLowerCase();
  if (r.includes('super')) return 'violet';
  if (r.includes('college') || r.includes('admin')) return 'teal';
  if (r.includes('hod')) return 'blue';
  return 'grey';
}

export default function AuditPage() {
  const [search, setSearch] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [range, setRange] = useState('last_30_days');

  const { data, loading, error } = useAsyncResource(
    () => fetchOptional(() => auditApi.list({ search, module: moduleName, range })),
    [search, moduleName, range],
  );
  const unavailable = !loading && data == null && !error;
  const rows = useMemo(() => asList(data, []), [data]);

  const handleExport = async () => {
    try {
      await auditApi.exportData({ search, module: moduleName, range });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Export is not available yet.'));
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="section-head">
        <div>
          <div className="t">Audit Logs</div>
          <div className="d">Append-only record of every sensitive action. Reading this page is itself audited.</div>
        </div>
        <button type="button" className="btn btn-ghost" onClick={handleExport} disabled={unavailable}>Export</button>
      </div>

      <div className="toolbar">
        <SearchBox
          placeholder="Search action, user, institution…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <QuirriSelect
          ariaLabel="Filter by module"
          value={moduleName}
          onChange={(e) => setModuleName(e.target.value)}
          placeholder="All modules"
          options={[
            { value: 'Authentication', label: 'Authentication' },
            { value: 'Institutions', label: 'Institutions' },
            { value: 'Users & roles', label: 'Users & roles' },
            { value: 'Content approval', label: 'Content approval' },
          ]}
        />
        <QuirriSelect
          ariaLabel="Date range"
          value={range}
          onChange={(e) => setRange(e.target.value)}
          options={[
            { value: 'last_30_days', label: 'Last 30 days' },
            { value: 'last_7_days', label: 'Last 7 days' },
            { value: 'today', label: 'Today' },
          ]}
        />
      </div>

      {unavailable ? (
        <div className="notice info" style={{ marginBottom: 12 }}>
          <div>
            <b>Audit log not available</b>
            Audit APIs are not reachable. Filters are ready; the table stays empty until logs respond.
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="notice err" style={{ marginBottom: 12 }}>
          <div>
            <b>Could not load audit logs</b>
            {apiErrorMessage(error, 'Please try again.')}
          </div>
        </div>
      ) : null}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Role</th>
              <th>Module</th>
              <th>Action</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {loading && !rows.length ? <tr><td colSpan={6}>Loading audit logs…</td></tr> : null}
            {!loading && !rows.length ? <tr><td colSpan={6}>No audit logs found.</td></tr> : null}
            {rows.map((row) => (
              <tr key={row.id || row.datetime || row.created_at}>
                <td className="sub num">{row.datetime || row.created_at || row.timestamp}</td>
                <td><span className="strong">{row.user || row.actor}</span></td>
                <td>
                  <QuirriBadge variant={rolePill(row.role)} plain>
                    {row.role || '—'}
                  </QuirriBadge>
                </td>
                <td>{row.module}</td>
                <td>{row.action}</td>
                <td className="sub num">{row.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

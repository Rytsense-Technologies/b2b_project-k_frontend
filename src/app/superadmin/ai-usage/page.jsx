'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import QuirriBadge from '@/components/superadmin/QuirriBadge';
import {
  QuirriToolbar,
  QuirriFilters,
  QuirriBtn,
} from '@/components/superadmin/quirri-ui';
import { AI_USAGE } from '@/lib/mock/superadminData';
import { aiUsageApi } from '@/lib/api/superadmin/modules';
import { asList, downloadCsv, withMock } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

function limitVariant(limit) {
  const value = String(limit || '').toLowerCase();
  if (value === 'watch') return 'warn';
  if (value === 'normal') return 'ok';
  return 'off';
}

export default function AiUsagePage() {
  const [search, setSearch] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [period, setPeriod] = useState('this_month');

  const { data, loading } = useAsyncResource(
    () => withMock(() => aiUsageApi.list({ search, module: moduleName, period }), AI_USAGE),
    [search, moduleName, period],
  );
  const rows = useMemo(() => asList(data, AI_USAGE), [data]);

  const handleExport = async () => {
    try {
      await aiUsageApi.exportData({ search, module: moduleName, period });
    } catch {
      downloadCsv('ai-usage.csv', rows, [
        { key: 'module', label: 'Module' },
        { key: 'college', label: 'College' },
        { key: 'requests', label: 'Requests' },
        { key: 'tokens', label: 'Token Usage' },
        { key: 'cost', label: 'Estimated Cost' },
        { key: 'limit', label: 'Limit Status' },
      ]);
      toast.success('Exported current table (API export not live yet)');
    }
  };

  return (
    <div className="animate-fade-in">
      <QuirriToolbar
        title="AI Usage Per Module"
        subtitle="Track AI usage across Self Learning, Q&A, Interview, and AI Skill Courses."
      >
        <QuirriBtn variant="light" onClick={handleExport}>Export Usage</QuirriBtn>
      </QuirriToolbar>

      <QuirriFilters>
        <input
          placeholder="Search college or module..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={moduleName} onChange={(e) => setModuleName(e.target.value)}>
          <option value="">All Modules</option>
          <option value="Self Learning">Self Learning</option>
          <option value="Q&A">Q&A</option>
          <option value="Interview">Interview</option>
          <option value="AI Skill Course">AI Skill Course</option>
        </select>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
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
            {loading && !rows.length ? <tr><td colSpan={6}>Loading usage…</td></tr> : null}
            {rows.map((row) => (
              <tr key={`${row.module}-${row.college}`}>
                <td>{row.module}</td>
                <td>{row.college}</td>
                <td>{row.requests}</td>
                <td>{row.tokens}</td>
                <td>{row.cost}</td>
                <td><QuirriBadge variant={row.limitType || limitVariant(row.limit)}>{row.limit}</QuirriBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

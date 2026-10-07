'use client';

import { useMemo, useState } from 'react';
import {
  FilterBar,
  KpiRow,
  ModuleBanner,
  ModulePage,
  Panel,
  SearchBox,
  SectionState,
} from '@/components/shared/module-ui';
import { facultyDirectoryApi } from '@/lib/api/faculty/directory';
import { apiErrorMessage, asList } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

export default function FacultyStudentsPage() {
  const [search, setSearch] = useState('');

  const { data, loading, error, reload } = useAsyncResource(
    () => facultyDirectoryApi.students({ page: 1, pageSize: 100 }),
    [],
  );

  const items = useMemo(() => {
    const all = asList(data, []);
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((s) => {
      const hay = `${s.name || ''} ${s.email || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [data, search]);
  const total = data?.total ?? asList(data, []).length;

  return (
    <ModulePage>
      <ModuleBanner
        icon="users"
        eyebrow="People"
        title="Students"
        lede="Students in your department, with assessment averages from chapter quizzes."
      />

      <KpiRow
        label="Student summary"
        items={[
          { icon: 'users', label: 'In your department', value: total, sub: 'Active roster' },
          {
            icon: 'tick',
            label: 'With quiz scores',
            value: items.filter((s) => s.attempt_count > 0).length,
            sub: 'Have submitted at least one quiz',
          },
          {
            icon: 'mic',
            label: 'Final year',
            value: items.filter((s) => s.is_final_year).length,
            sub: 'Eligible for interview assignments',
          },
        ]}
      />

      <FilterBar>
        <SearchBox
          value={search}
          onChange={(e) => setSearch(e?.target?.value ?? '')}
          placeholder="Search by name or email"
        />
      </FilterBar>

      <Panel title="Department roster" sub="Read-only list scoped to your department." bodyClassName={null}>
        {loading ? (
          <SectionState title="Loading students">Fetching your department roster.</SectionState>
        ) : error ? (
          <SectionState
            tone="err"
            title="Could not load students"
            action={<button type="button" className="sd-btn sd-btn--ghost" onClick={() => reload()}>Retry</button>}
          >
            {apiErrorMessage(error, 'Try again in a moment.')}
          </SectionState>
        ) : items.length === 0 ? (
          <SectionState title="No students yet">
            {search ? 'No students match that search.' : 'Students appear here once your college admin enrols them in your department.'}
          </SectionState>
        ) : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Year</th>
                  <th>Status</th>
                  <th className="num">Avg score</th>
                  <th className="num">Quizzes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div>{s.name}</div>
                      <small style={{ color: 'var(--muted)' }}>{s.email}</small>
                    </td>
                    <td>
                      {s.year_of_study != null ? `Year ${s.year_of_study}` : '—'}
                      {s.is_final_year ? ' · Final' : ''}
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{String(s.status || '').replace(/_/g, ' ') || '—'}</td>
                    <td className="num">{s.avg_score != null ? `${s.avg_score}%` : '—'}</td>
                    <td className="num">{s.attempt_count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </ModulePage>
  );
}

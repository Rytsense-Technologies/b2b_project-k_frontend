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
  countLabel,
  initials,
} from '@/components/shared/module-ui';
import { facultyDirectoryApi } from '@/lib/api/faculty/directory';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import { userStatusLabel } from '@/lib/admin/userStatus';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useFacultyScope } from '@/hooks/useFacultyScope';

const TONE = { active: 'sp-pill--good', pending_activation: 'sp-pill--low', deactivated: 'sp-pill--off' };

function day(iso) {
  const d = new Date(iso || '');
  return Number.isNaN(d.getTime()) ? 'Never' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StaffList() {
  const [search, setSearch] = useState('');
  const { data, loading, error, reload } = useAsyncResource(() => facultyDirectoryApi.staff(), []);
  const items = useMemo(() => data?.items || [], [data]);
  const needle = search.trim().toLowerCase();
  const shown = items.filter((u) => !needle || [u.name, u.email, ...u.subjects].some((v) => String(v || '').toLowerCase().includes(needle)));
  const first = loading && !data;
  const gaps = data?.subjects_without_teacher || [];

  return (
    <ModulePage className="fa-page">
      <ModuleBanner
        icon="users"
        eyebrow="Department"
        title="Department staff"
        lede="Faculty in your department and the subjects each one reviews. Your College Admin adds staff and assigns subjects."
      />

      <KpiRow
        label="Staff summary"
        items={[
          { icon: 'users', label: 'Staff', value: first ? null : countLabel(items.length), sub: 'HOD and faculty' },
          { icon: 'book', label: 'Subjects', value: first ? null : countLabel(data?.subjects_total ?? 0), sub: 'In your department' },
          { icon: 'alert', label: 'Subjects without a teacher', value: first ? null : countLabel(gaps.length), sub: gaps.length ? 'You review these yourself' : 'Every subject is covered' },
        ]}
      />

      {gaps.length ? (
        <SectionState title="Subjects without a teacher">
          {`${gaps.join(', ')}. Ask your College Admin to assign faculty (Staff › Assign subjects).`}
        </SectionState>
      ) : null}

      <FilterBar label="Find staff">
        <SearchBox placeholder="Search name, email or subject…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </FilterBar>

      {error ? (
        <SectionState
          tone="err"
          title="Could not load staff"
          action={<button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload()}>Try again</button>}
        >
          {apiErrorMessage(error, 'Please try again.')}
        </SectionState>
      ) : null}

      <Panel title="Staff" sub={`${countLabel(shown.length)} shown`} bodyClassName={null}>
        {first ? <div className="sp-panel-b"><SectionState title="Loading staff…" /></div> : null}
        {data && !shown.length ? <div className="sp-panel-b"><SectionState title="No staff match">Try another name or subject.</SectionState></div> : null}
        {shown.length ? (
          <div className="sp-table-wrap">
            <table className="sp-table un-table ad-stack">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Subjects</th>
                  <th>Status</th>
                  <th>Last active</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="pm-person">
                        <span className="pm-av" aria-hidden="true">{initials(u.name, 'F')}</span>
                        <div><b>{u.name}</b><small>{u.email}</small></div>
                      </div>
                    </td>
                    <td data-label="Role">{u.role === 'hod' ? 'HOD' : 'Faculty'}</td>
                    <td data-label="Subjects">
                      {u.subjects.length ? (
                        <ul className="ad-chip-list">{u.subjects.map((n) => <li key={n} className="sp-pill">{n}</li>)}</ul>
                      ) : <span className="ad-muted">{u.role === 'hod' ? 'Whole department' : 'None yet'}</span>}
                    </td>
                    <td data-label="Status">
                      <span className={`sp-pill ${TONE[u.status] || ''}`}><i className="un-dot" aria-hidden="true" />{userStatusLabel({ status: u.status })}</span>
                    </td>
                    <td data-label="Last active">{day(u.last_login_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>
    </ModulePage>
  );
}

/** HOD only: department staff and their subjects. */
export default function FacultyStaffPage() {
  const { scope, error } = useFacultyScope();
  if (error) return <SectionState tone="err" title="Could not load your access">Refresh the page to try again.</SectionState>;
  if (!scope) return <SectionState title="Loading…" />;
  if (!scope.can_see_staff) {
    return <SectionState title="Department staff is for your HOD">Your subjects and students are under Subjects and Students.</SectionState>;
  }
  return <StaffList />;
}

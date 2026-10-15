'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Icon,
  KpiRow,
  ModuleHead,
  ModulePage,
  Panel,
  SearchBox,
  SectionState,
  countLabel,
  initials,
} from '@/components/shared/module-ui';
import { FacultyScopeChip, SubjectTag, useSubjectColor } from '@/components/faculty/facultyKit';
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

function StaffList({ scope }) {
  const colorFor = useSubjectColor();
  const [search, setSearch] = useState('');
  const { data, loading, error, reload } = useAsyncResource(() => facultyDirectoryApi.staff(), []);
  const items = useMemo(() => data?.items || [], [data]);
  const needle = search.trim().toLowerCase();
  const shown = items.filter((u) => !needle || [u.name, u.email, ...u.subjects].some((v) => String(v || '').toLowerCase().includes(needle)));
  const first = loading && !data;
  const gaps = data?.subjects_without_teacher || [];

  return (
    <ModulePage className="fa-page">
      <ModuleHead
        lede="Your College Admin adds staff and assigns subjects."
        chips={<FacultyScopeChip scope={scope} />}
      />

      {error && !data ? null : (
      <KpiRow
        label="Staff summary"
        items={[
          { icon: 'users', label: 'Staff', value: data ? countLabel(items.length) : null, sub: 'HOD and faculty' },
          { icon: 'book', label: 'Subjects', value: data ? countLabel(data.subjects_total ?? 0) : null, sub: 'In your department' },
          { icon: 'alert', label: 'Subjects without a teacher', value: data ? countLabel(gaps.length) : null, sub: !data ? 'Subjects with no faculty assigned' : gaps.length ? 'You review these yourself' : 'Every subject is covered', tone: gaps.length ? 'focus' : undefined },
        ]}
      />
      )}

      {gaps.length ? (
        <div className="fa-inline-note is-focus">
          <Icon name="alert" size={16} />
          <span>
            <b>{`${countLabel(gaps.length)} subject${gaps.length === 1 ? '' : 's'} without a teacher: `}</b>
            {`${gaps.join(', ')}. Ask your College Admin to assign faculty (Staff › Assign subjects).`}
          </span>
        </div>
      ) : null}

      {error ? (
        <SectionState
          tone="err"
          title="Could not load staff"
          action={<button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload()}>Try again</button>}
        >
          {apiErrorMessage(error, 'Please try again.')}
        </SectionState>
      ) : null}

      {error && !data ? null : (
      <Panel
        title="Staff"
        sub={data ? `${countLabel(shown.length)} shown` : null}
        bodyClassName={null}
        toolbar={<SearchBox placeholder="Search name, email or subject…" value={search} onChange={(e) => setSearch(e.target.value)} />}
      >
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
                        <ul className="ad-chip-list fa-subj-list">{u.subjects.map((n) => <li key={n}><SubjectTag name={n} color={colorFor(n)} /></li>)}</ul>
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
      )}
    </ModulePage>
  );
}

/** HOD only: department staff and their subjects. */
export default function FacultyStaffPage() {
  const { scope, error } = useFacultyScope();
  if (error) {
    return <ModulePage className="fa-page"><SectionState tone="err" title="Could not load your access">Refresh the page to try again.</SectionState></ModulePage>;
  }
  if (!scope) return <ModulePage className="fa-page"><SectionState title="Loading…" /></ModulePage>;
  if (!scope.can_see_staff) {
    return (
      <ModulePage className="fa-page">
        <SectionState
          title="Available to your head of department"
          action={<Link className="sd-btn sd-btn--teal sd-btn--sm" href="/faculty/dashboard"><Icon name="back" size={16} /> Back to dashboard</Link>}
        >
          Your subjects and students are under Subjects and Students.
        </SectionState>
      </ModulePage>
    );
  }
  return <StaffList scope={scope} />;
}

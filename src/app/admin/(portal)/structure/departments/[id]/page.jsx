'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Icon,
  ModulePage,
  Panel,
  StatusPill,
  SectionState,
  RecordHero,
  TabNav,
  TabPanel,
  DangerZone,
  Callout,
  PeopleList,
  countLabel,
} from '@/components/shared/module-ui';
import { usePageHeader } from '@/components/shared/PageHeader';
import DepartmentFormDrawer from '@/components/admin/departments/DepartmentFormDrawer';
import { useDepartmentStatus } from '@/components/admin/departments/useDepartmentStatus';
import {
  DEPARTMENTS_PATH,
  LEVELS_LATER,
  isActiveDept,
  fullName,
  dateLabel,
  httpStatus,
  loadDepartmentPeople,
} from '@/components/admin/departments/departmentModel';
import { departmentsApi, fetchData } from '@/lib/api/superadmin/modules';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useAuth } from '@/hooks/useAuth';
import { useUrlState } from '@/hooks/useUrlState';

const TABS = ['overview', 'people'];
const ROLE_LABEL = { hod: 'HOD', faculty: 'Faculty' };

/**
 * Department record — the hub for one department (docs/ux/ux-architecture.md, Slice 1).
 * Identity → HOD → people → levels below → status (danger zone).
 */
function DepartmentRecord() {
  const { id } = useParams();
  const { tenantId } = useAuth();
  const [url, setUrl] = useUrlState({ tab: 'overview', created: '' });
  const tab = TABS.includes(url.tab) ? url.tab : 'overview';
  const [drawer, setDrawer] = useState(null); // null | 'edit' | 'hod'

  const { data: dept, loading, error, reload } = useAsyncResource(
    () => fetchData(() => departmentsApi.get(id)),
    [id],
  );

  const { data: people, loading: peopleLoading, error: peopleError } = useAsyncResource(
    () => (dept ? loadDepartmentPeople(tenantId, dept) : Promise.resolve(null)),
    [dept?.id, dept?.name, tenantId],
  );

  const status = useDepartmentStatus({ onChanged: () => reload().catch(() => {}) });

  const active = isActiveDept(dept);
  const hasHod = Boolean(dept?.hod_name || dept?.hod_user_id);
  const staff = people?.staff || [];
  const students = people?.students || [];
  const hodUser = useMemo(
    () => staff.find((u) => dept?.hod_user_id && String(u.id) === String(dept.hod_user_id)) || null,
    [staff, dept?.hod_user_id],
  );

  usePageHeader(dept ? {
    title: dept.name,
    subtitle: [dept.code ? `Code ${dept.code}` : null, dept.college_name || null, active ? null : 'Inactive']
      .filter(Boolean).join(' · ') || 'Department',
    crumbs: [
      { label: 'Academic structure' },
      { label: 'Departments', href: DEPARTMENTS_PATH },
      { label: dept.name },
    ],
    actions: active ? (
      <>
        <button type="button" className={`sd-btn ${hasHod ? 'sd-btn--teal' : 'sd-btn--outline'}`} onClick={() => setDrawer('edit')}>
          <Icon name="edit" size={16} /> Edit department
        </button>
        {!hasHod ? (
          <button type="button" className="sd-btn sd-btn--amber" onClick={() => setDrawer('hod')}>
            <Icon name="userPlus" size={16} /> Assign HOD
          </button>
        ) : null}
      </>
    ) : (
      <button type="button" className="sd-btn sd-btn--teal" onClick={() => status.request(dept)}>
        <Icon name="refresh" size={16} /> Reactivate
      </button>
    ),
  } : {
    title: error ? 'Department' : 'Loading department…',
    subtitle: null,
    crumbs: [
      { label: 'Academic structure' },
      { label: 'Departments', href: DEPARTMENTS_PATH },
      { label: 'Department' },
    ],
  }, [dept, error, active, hasHod]);

  if (error) {
    const code = httpStatus(error);
    return (
      <ModulePage className="ad-page pm-slice">
        {code === 404 ? (
          <SectionState
            title="Department not found"
            action={<Link className="sd-btn sd-btn--ghost sd-btn--sm" href={DEPARTMENTS_PATH}><Icon name="back" size={16} /> Back to departments</Link>}
          >
            It may have been removed, or the link is wrong.
          </SectionState>
        ) : code === 403 ? (
          <SectionState
            tone="err"
            title="You don't have access to this department"
            action={<Link className="sd-btn sd-btn--ghost sd-btn--sm" href={DEPARTMENTS_PATH}><Icon name="back" size={16} /> Back to departments</Link>}
          >
            Departments are visible only to College Admins of the same college.
          </SectionState>
        ) : (
          <SectionState
            tone="err"
            title="Could not load this department"
            action={(
              <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload().catch(() => {})}>
                <Icon name="refresh" size={16} /> Try again
              </button>
            )}
          >
            {apiErrorMessage(error, 'Check your connection and try again.')}
          </SectionState>
        )}
      </ModulePage>
    );
  }

  if (loading && !dept) {
    return (
      <ModulePage className="ad-page pm-slice">
        <SectionState title="Loading department…" />
      </ModulePage>
    );
  }

  if (!dept) return null;

  const staffCount = peopleLoading ? null : staff.length;
  const studentCount = dept.student_count ?? (peopleLoading ? null : students.length);

  return (
    <ModulePage className="ad-page pm-slice">
      {url.created ? (
        <Callout
          title={`${dept.name} is ready`}
          links={[
            { label: 'Add staff', href: '/admin/staff', icon: 'userPlus' },
            { label: 'Add students', href: '/admin/students', icon: 'users' },
            { label: 'Upload a chapter', href: '/admin/content', icon: 'upload' },
          ]}
          onDismiss={() => setUrl({ created: '' })}
        >
          {hasHod
            ? 'Next, add the staff and students who belong to it, then upload its first chapter.'
            : 'Next, assign an HOD so chapters can be reviewed, then add staff and students.'}
        </Callout>
      ) : null}

      {!active ? (
        <Callout tone="warning" title="This department is inactive">
          It is hidden from active lists and pickers. Its records are kept. Reactivate it to use it again.
        </Callout>
      ) : null}

      <RecordHero
        overline="Department"
        title={dept.name}
        mono={dept.name}
        muted={!active}
        meta={(
          <>
            {dept.code ? <span className="un-code">{dept.code}</span> : null}
            <StatusPill active={active} />
          </>
        )}
        facts={[
          { label: 'Head of department', value: dept.hod_name || (dept.hod_user_id ? 'Assigned' : 'Not assigned'), tone: hasHod ? null : 'amber' },
          { label: 'Students enrolled', value: studentCount == null ? '—' : countLabel(studentCount) },
          { label: 'Staff', value: staffCount == null ? '—' : countLabel(staffCount) },
          { label: 'Added on', value: dateLabel(dept.created_at) || '—', tone: dept.created_at ? null : 'muted' },
        ]}
      />

      <TabNav
        label="Department sections"
        idBase="dept-tab"
        value={tab}
        onChange={(v) => setUrl({ tab: v })}
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'people', label: 'People', count: peopleLoading ? null : staff.length + students.length },
        ]}
      />

      <TabPanel value="overview" current={tab} idBase="dept-tab">
        <div className="pm-cols">
          <div className="pm-stack">
            <Panel title="Details" sub="What staff and students see for this department.">
              <dl className="pm-kv">
                <div><dt>Department name</dt><dd>{dept.name}</dd></div>
                <div><dt>Code</dt><dd>{dept.code || '—'}</dd></div>
                <div><dt>College</dt><dd>{dept.college_name || 'Your college'}</dd></div>
                <div><dt>Status</dt><dd>{active ? 'Active' : 'Inactive'}</dd></div>
                <div><dt>Added on</dt><dd>{dateLabel(dept.created_at) || '—'}</dd></div>
                <div><dt>Last updated</dt><dd>{dateLabel(dept.updated_at) || '—'}</dd></div>
              </dl>
            </Panel>

            <Panel title="Below this department" sub="Programmes, semesters and subjects arrive in a later release. Departments are live today.">
              <ol className="ad-levels">
                {LEVELS_LATER.map((lvl, i) => (
                  <li key={lvl.title}>
                    <span className="pm-step-n">{i + 1}</span>
                    <div>
                      <b>{lvl.title}</b>
                      <small>{lvl.body}</small>
                    </div>
                    <span className="sp-pill">Not available yet</span>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>

          <div className="pm-stack">
            <Panel
              title="Head of department"
              sub="Reviews and approves this department's chapter videos and MCQs."
              action={active && hasHod ? (
                <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setDrawer('hod')}>Change</button>
              ) : null}
            >
              {hasHod ? (
                <PeopleList
                  people={[{
                    id: dept.hod_user_id || 'hod',
                    name: dept.hod_name || fullName(hodUser) || 'Assigned',
                    email: hodUser?.email,
                    meta: 'HOD',
                  }]}
                />
              ) : (
                <SectionState
                  title="No HOD yet"
                  action={active ? (
                    <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setDrawer('hod')}>
                      <Icon name="userPlus" size={16} /> Assign HOD
                    </button>
                  ) : null}
                >
                  Chapters for this department can't be reviewed until someone is assigned.
                </SectionState>
              )}
            </Panel>

            <DangerZone
              title={active ? 'Deactivate department' : 'Reactivate department'}
              description={active
                ? 'Hides it from active lists and pickers. Records are kept and you can reactivate it at any time.'
                : 'Makes it available again for staff, students and chapters.'}
            >
              <button
                type="button"
                className={`sd-btn sd-btn--sm ${active ? 'sd-btn--danger' : 'sd-btn--outline'}`}
                disabled={status.busyId === dept.id}
                onClick={() => status.request(dept)}
              >
                <Icon name={active ? 'lock' : 'refresh'} size={16} />
                {status.busyId === dept.id ? 'Updating…' : active ? 'Deactivate' : 'Reactivate'}
              </button>
            </DangerZone>
          </div>
        </div>
      </TabPanel>

      <TabPanel value="people" current={tab} idBase="dept-tab">
        {peopleError ? (
          <SectionState tone="err" title="Could not load people">{apiErrorMessage(peopleError, 'Please try again.')}</SectionState>
        ) : null}
        <div className="pm-cols">
          <Panel
            title="Staff"
            sub="Faculty and HOD accounts placed in this department."
            action={<Link className="sp-link" href="/admin/staff">Manage in Staff & HOD <Icon name="arrow" size={14} /></Link>}
          >
            {peopleLoading ? <SectionState title="Loading staff…" /> : (
              <PeopleList
                people={staff.map((u) => ({
                  id: u.id,
                  name: fullName(u),
                  email: u.email,
                  meta: String(u.id) === String(dept.hod_user_id) ? 'HOD' : (ROLE_LABEL[u.role] || 'Faculty'),
                }))}
                empty={<SectionState title="No staff placed here yet">Add faculty in Staff & HOD and choose this department.</SectionState>}
              />
            )}
          </Panel>
          <Panel
            title="Students"
            sub={students.length > 10 ? `Showing 10 of ${countLabel(students.length)}` : 'Students placed in this department.'}
            action={<Link className="sp-link" href="/admin/students">Manage in Students <Icon name="arrow" size={14} /></Link>}
          >
            {peopleLoading ? <SectionState title="Loading students…" /> : (
              <PeopleList
                people={students.slice(0, 10).map((u) => ({
                  id: u.id,
                  name: fullName(u),
                  email: u.email,
                  meta: u.year_of_study ? `Year ${u.year_of_study}` : null,
                }))}
                empty={<SectionState title="No students placed here yet">Add students and pick this department as their placement.</SectionState>}
              />
            )}
          </Panel>
        </div>
        {people?.capped ? (
          <p className="ad-muted">Matched from the first 100 accounts per role in your college.</p>
        ) : null}
      </TabPanel>

      <DepartmentFormDrawer
        open={Boolean(drawer)}
        department={dept}
        tenantId={tenantId}
        focus={drawer === 'hod' ? 'hod' : null}
        onClose={() => setDrawer(null)}
        onSaved={() => { setDrawer(null); reload().catch(() => {}); }}
      />
      {status.dialogs}
    </ModulePage>
  );
}

export default function DepartmentRecordPage() {
  return (
    <Suspense fallback={<SectionState title="Loading department…" />}>
      <DepartmentRecord />
    </Suspense>
  );
}

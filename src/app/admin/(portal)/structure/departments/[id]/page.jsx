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
import HodPickerModal from '@/components/admin/departments/HodPickerModal';
import { useDepartmentStatus } from '@/components/admin/departments/useDepartmentStatus';
import {
  DEPARTMENTS_PATH,
  LEVELS_BELOW,
  isActiveDept,
  fullName,
  dateLabel,
  httpStatus,
  loadDepartmentPeople,
  departmentHod,
  hodCanReview,
} from '@/components/admin/departments/departmentModel';
import { departmentsApi, fetchData } from '@/lib/api/superadmin/modules';
import { academicsApi } from '@/lib/api/superadmin/academics';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useAuth } from '@/hooks/useAuth';
import { useTabParam, useUrlState } from '@/hooks/useUrlState';

const TABS = ['overview', 'people'];
const ROLE_LABEL = { hod: 'HOD', faculty: 'Faculty' };

/**
 * Department record — the hub for one department (docs/ux/ux-architecture.md, Slice 1).
 * Identity → HOD → people → levels below → status (danger zone).
 */
function DepartmentRecord() {
  const { id } = useParams();
  const { tenantId } = useAuth();
  const [url, setUrl] = useUrlState({ created: '' });
  // Tab switches push history, so Back returns to the previous tab (same as other modules).
  const [tab, setTab] = useTabParam(TABS, 'overview');
  const [drawer, setDrawer] = useState(null); // null | 'edit' | 'hod'

  const { data: dept, loading, error, reload } = useAsyncResource(
    () => fetchData(() => departmentsApi.get(id)),
    [id],
  );
  const { data: below } = useAsyncResource(
    () => fetchData(() => academicsApi.summary({ department_id: id })),
    [id],
  );

  const { data: people, loading: peopleLoading, error: peopleError } = useAsyncResource(
    () => (dept ? loadDepartmentPeople(tenantId, dept) : Promise.resolve(null)),
    [dept?.id, dept?.name, tenantId],
  );

  const status = useDepartmentStatus({ onChanged: () => reload().catch(() => {}) });

  const active = isActiveDept(dept);
  const staff = people?.staff || [];
  const students = people?.students || [];
  // One source for the header fact, the HOD panel and the People tab (departmentHod).
  const hod = useMemo(
    () => departmentHod(dept, people?.collegeStaff || staff),
    [dept, people, staff],
  );
  const hasHod = hodCanReview(hod);
  const hodUser = hod.user;
  const hodId = hodCanReview(hod) && hodUser ? String(hodUser.id) : null;
  const hodFact = peopleLoading && !people
    ? (dept?.hod_name || '…')
    : hod.state === 'none'
      ? 'Not assigned'
      : hod.state === 'elsewhere'
        ? `${hod.name} (in ${hod.otherDepartment || 'another department'})`
        : hod.name;

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
  }, [dept, error, active, hasHod, peopleLoading]);

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
          { label: 'Head of department', value: hodFact, tone: hasHod || (peopleLoading && !people) ? null : 'amber' },
          { label: 'Students enrolled', value: studentCount == null ? '—' : countLabel(studentCount) },
          { label: 'Staff', value: staffCount == null ? '—' : countLabel(staffCount) },
          { label: 'Added on', value: dateLabel(dept.created_at) || '—', tone: dept.created_at ? null : 'muted' },
        ]}
      />

      <TabNav
        label="Department sections"
        idBase="dept-tab"
        value={tab}
        onChange={setTab}
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

            <Panel
              title="Below this department"
              sub="Programmes, semesters, subjects and chapters in this department."
              action={(
                <Link className="sp-link" href={`/admin/structure/programmes?department=${dept.id}`}>
                  Manage <Icon name="arrow" size={14} />
                </Link>
              )}
            >
              <ol className="ad-levels">
                {LEVELS_BELOW.map((lvl, i) => (
                  <li key={lvl.title}>
                    <span className="pm-step-n">{i + 1}</span>
                    <div>
                      <b>{lvl.title}</b>
                      <small>{lvl.body}</small>
                    </div>
                    <span className={`sp-pill${below && below[lvl.key] ? ' sp-pill--teal' : ''}`}>
                      {below ? countLabel(below[lvl.key] || 0) : '…'}
                    </span>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>

          <div className="pm-stack">
            <Panel
              title="Head of department"
              sub="Reviews and approves this department's chapter videos and MCQs."
              action={active && hod.state !== 'none' ? (
                <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setDrawer('hod')}>
                  {hod.state === 'role' ? 'Set as head' : 'Change'}
                </button>
              ) : null}
            >
              {peopleLoading && !people ? <SectionState title="Loading…" /> : hod.state === 'none' ? (
                <SectionState
                  title="No HOD yet"
                  action={active ? (
                    <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setDrawer('hod')}>
                      <Icon name="userPlus" size={16} /> Assign HOD
                    </button>
                  ) : null}
                >
                  Until someone is assigned, only faculty assigned to a subject can review that subject&apos;s chapters.
                  Chapters not linked to a subject wait for an HOD.
                </SectionState>
              ) : (
                <>
                  <PeopleList
                    people={[{
                      id: hodUser?.id || dept.hod_user_id || 'hod',
                      name: hod.name,
                      email: hodUser?.email,
                      meta: hod.state === 'elsewhere' ? `In ${hod.otherDepartment || 'another department'}` : 'HOD',
                    }]}
                  />
                  {hod.state === 'role' ? (
                    <p className="ad-muted">
                      Has the HOD role in this department, so they already review its chapters.
                      Set them as head to show them on department records.
                    </p>
                  ) : null}
                  {hod.state === 'elsewhere' ? (
                    <p className="pm-form-error" role="status">
                      {hod.name} is placed in {hod.otherDepartment || 'another department'}, so they can&apos;t review this
                      department&apos;s chapters. Choose someone placed in {dept.name}.
                    </p>
                  ) : null}
                </>
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
                  meta: hodId && String(u.id) === hodId ? 'HOD' : (ROLE_LABEL[u.role] || 'Faculty'),
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
        open={drawer === 'edit'}
        department={dept}
        tenantId={tenantId}
        onClose={() => setDrawer(null)}
        onSaved={() => { setDrawer(null); reload().catch(() => {}); }}
      />
      <HodPickerModal
        open={drawer === 'hod'}
        department={dept}
        tenantId={tenantId}
        preselect={hod.state === 'role' ? hodUser?.id : ''}
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

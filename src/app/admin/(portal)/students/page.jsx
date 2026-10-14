'use client';

import { useCallback, useMemo, useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import StudentPlacementFields from '@/components/shared/StudentPlacementFields';
import StudentPlacementModal from '@/components/shared/StudentPlacementModal';
import StudentBulkImport from '@/components/admin/StudentBulkImport';
import { QuirriRHFField, QuirriCombobox } from '@/components/superadmin/quirri-ui';
import { useQuirriTip } from '@/components/superadmin/QuirriTooltip';
import {
  Icon,
  ModulePage,
  ModuleBanner,
  KpiRow,
  FilterBar,
  SegTabs,
  SearchBox,
  Panel,
  StatusPill,
  IconButton,
  InfoList,
  DetailDrawer,
  DrawerSection,
  FormSection,
  ConfirmNote,
  SectionState,
  Pager,
  initials,
  countLabel,
} from '@/components/shared/module-ui';
import { usersApi } from '@/lib/api/superadmin/users';
import { departmentsApi, fetchData } from '@/lib/api/superadmin/modules';
import { unwrap, asList } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useAuth } from '@/hooks/useAuth';
import { ROLES } from '@/lib/permissions';
import { isDeactivated, isPending, statusVariant, userStatusLabel } from '@/lib/admin/userStatus';
import { studentDepartmentChangeSchema, tenantStudentCreateSchema } from '@/lib/validation';
import { getApiErrorMessage } from '@/lib/api/errors';

const TONE = { red: 'err', amber: 'low', green: 'good' };

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending activation' },
  { value: 'inactive', label: 'Deactivated' },
];

function fullName(user) {
  return user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || '—';
}

function dateLabel(value) {
  if (!value) return 'Never';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function lastActive(user) {
  return dateLabel(user?.last_active || user?.last_login || user?.updated_at);
}

/* ------------------------------------------------------------------ form */
function CreateStudentModal({ open, tenantId, departmentOptions, onClose, onSaved }) {
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(tenantStudentCreateSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      department_id: '',
      course_duration_years: '',
      year_of_study: '',
      program_id: '',
      semester_id: '',
    },
    mode: 'onBlur',
  });
  const [acting, setActing] = useState(false);
  const [departmentId, programId, semesterId] = useWatch({ control, name: ['department_id', 'program_id', 'semester_id'] });
  const changePlacement = useCallback(({ program_id: p, semester_id: s }) => {
    setValue('program_id', p || '', { shouldValidate: Boolean(p && s) });
    setValue('semester_id', s || '', { shouldValidate: Boolean(p && s) });
  }, [setValue]);

  const onCreate = handleSubmit(async (values) => {
    if (!tenantId) {
      toast.error('Your college tenant is missing from this session. Sign in again.');
      return;
    }
    setActing(true);
    try {
      await usersApi.createUser({
        ...values,
        department_id: values.department_id || undefined,
        phone_number: values.phone_number || undefined,
        // With a semester picked, the server works out the year and duration.
        course_duration_years: values.semester_id ? undefined : (values.course_duration_years ?? undefined),
        year_of_study: values.semester_id ? undefined : (values.year_of_study ?? undefined),
        program_id: values.program_id || undefined,
        semester_id: values.semester_id || undefined,
        role: ROLES.STUDENT,
        tenant_id: tenantId,
      });
      toast.success('Student created — activation link sent');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to create student'));
    } finally {
      setActing(false);
    }
  });

  return (
    <QuirriModal
      open={open}
      onClose={onClose}
      title="Add student"
      crumb="The student sets their own password from an activation link"
      wide
      footer={(
        <>
          <button type="button" className="sd-btn sd-btn--ghost" onClick={onClose}>Cancel</button>
          <div className="right">
            <button type="button" className="sd-btn sd-btn--amber" onClick={onCreate} disabled={acting}>
              <Icon name="send" size={16} />
              {acting ? 'Creating…' : 'Create and send invite'}
            </button>
          </div>
        </>
      )}
    >
      <form onSubmit={onCreate} noValidate className="un-form">
        <FormSection n={1} title="Student details" sub="We send the activation link to this email address.">
          <div className="grid2">
            <QuirriRHFField control={control} name="first_name" fieldType="personName" label="First name" />
            <QuirriRHFField control={control} name="last_name" fieldType="personName" label="Last name" />
          </div>
          <div className="grid2">
            <QuirriRHFField
              control={control}
              name="email"
              fieldType="email"
              label="Email address"
              placeholder="student@college.edu"
            />
            <QuirriRHFField
              control={control}
              name="phone_number"
              fieldType="phone"
              label="Phone number"
              placeholder="+91…"
            />
          </div>
        </FormSection>
        <FormSection n={2} title="Academic placement" sub="Optional. You can set these later.">
          <Controller
            control={control}
            name="department_id"
            render={({ field, fieldState }) => (
              <QuirriCombobox
                id="student-department"
                label="Department"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                error={fieldState.error?.message}
                placeholder="Optional — type to search"
                options={departmentOptions}
                emptyMessage="No active departments yet"
                hint="Pick a department from your college structure."
                full
              />
            )}
          />
          <StudentPlacementFields
            idPrefix="create-student"
            departmentId={departmentId}
            programId={programId}
            semesterId={semesterId}
            onChange={changePlacement}
          />
          {errors.semester_id ? <div className="hint field-error" role="alert">{errors.semester_id.message}</div> : null}
          {!semesterId ? (
            <div className="grid2">
              <QuirriRHFField
                control={control}
                name="course_duration_years"
                fieldType="positiveInt"
                label="Programme duration (years)"
                placeholder="e.g. 4"
                hint="Only if no programme is picked — e.g. 3 for Arts, 4 for B.Tech."
              />
              <QuirriRHFField
                control={control}
                name="year_of_study"
                fieldType="positiveInt"
                label="Current year of study"
                placeholder="e.g. 2"
                hint="Cannot be more than the programme duration."
              />
            </div>
          ) : null}
        </FormSection>
        {Object.keys(errors).length > 0 ? (
          <div className="hint field-error" role="alert">
            Check the highlighted fields and try again.
          </div>
        ) : null}
      </form>
    </QuirriModal>
  );
}

function ChangeDepartmentModal({ open, user, departmentOptions, onClose, onSaved }) {
  const currentId = user?.department_id ? String(user.department_id) : '';
  const currentName = user?.department_name || user?.department || '';
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(studentDepartmentChangeSchema),
    defaultValues: { department_id: currentId },
    mode: 'onBlur',
  });
  const [acting, setActing] = useState(false);
  const selected = watch('department_id');
  const unchanged = Boolean(currentId) && selected === currentId;
  const otherDepartments = departmentOptions.some((option) => option.value !== currentId);

  const onSave = handleSubmit(async (values) => {
    if (!user?.id || values.department_id === currentId) return;
    setActing(true);
    try {
      const res = await usersApi.updateUser(user.id, { department_id: values.department_id });
      toast.success(currentId ? 'Department changed. Previous department records were removed.' : 'Department assigned.');
      onSaved(unwrap(res));
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not change department'));
    } finally {
      setActing(false);
    }
  });

  return (
    <QuirriModal
      open={open}
      onClose={onClose}
      title={currentId ? 'Change department?' : 'Assign department'}
      crumb={user ? `${fullName(user)} · ${user.email || ''}` : null}
      footer={(
        <>
          <button type="button" className="sd-btn sd-btn--ghost" onClick={onClose} disabled={acting}>Cancel</button>
          <div className="right">
            <button
              type="button"
              className="sd-btn sd-btn--amber"
              onClick={onSave}
              disabled={acting || unchanged || (!otherDepartments && Boolean(currentId))}
            >
              {acting ? 'Saving…' : currentId ? 'Change department' : 'Assign department'}
            </button>
          </div>
        </>
      )}
    >
      <form onSubmit={onSave} noValidate className="un-form">
        {currentId ? (
          <ConfirmNote danger title="They start again in the new department.">
            {`Lecture progress, chapter assessments, and tutor chats from ${currentName || 'the previous department'} are removed. Interview history stays.`}
          </ConfirmNote>
        ) : null}
        <Controller
          control={control}
          name="department_id"
          render={({ field, fieldState }) => (
            <QuirriCombobox
              id="change-student-department"
              label="Department"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              error={fieldState.error?.message}
              placeholder="Type to search"
              options={departmentOptions}
              emptyMessage="No active departments yet"
              hint={otherDepartments
                ? 'Choose the department this student should study in.'
                : 'Create another department in Structure before you can move this student.'}
              full
            />
          )}
        />
        {Object.keys(errors).length > 0 ? (
          <div className="hint field-error" role="alert">Check the highlighted fields and try again.</div>
        ) : null}
      </form>
    </QuirriModal>
  );
}

/* ---------------------------------------------------------------- page */
export default function StudentsPage() {
  const { tenantId } = useAuth();
  const { show, hide, TipLayer } = useQuirriTip();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [acting, setActing] = useState(false);
  const [drawerUser, setDrawerUser] = useState(null);
  const [confirmUser, setConfirmUser] = useState(null);
  const [deptUser, setDeptUser] = useState(null);
  const [placementUser, setPlacementUser] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const { data: deptData } = useAsyncResource(
    () => fetchData(() => departmentsApi.list({ is_active: true, page: 1, pageSize: 100 })),
    [tenantId],
  );
  const departmentOptions = useMemo(
    () => asList(deptData, []).map((d) => ({
      value: d.id,
      label: d.code ? `${d.name} (${d.code})` : d.name,
    })),
    [deptData],
  );

  // A new search / status starts again at page 1.
  const setSearchAndReset = (value) => { setSearch(value); setPage(1); };
  const setStatusAndReset = (value) => { setStatus(value); setPage(1); };

  const { data, loading, error, reload } = useAsyncResource(async () => {
    const res = await usersApi.getUsers({
      page,
      pageSize: PAGE_SIZE,
      search,
      role: ROLES.STUDENT,
      status,
      tenantId: tenantId || undefined,
    });
    return unwrap(res);
  }, [search, status, tenantId, page]);

  // Status counts for the whole college (not just this page).
  const { data: countData, reload: reloadCounts } = useAsyncResource(async () => {
    const one = (s) => usersApi.getUsers({ page: 1, pageSize: 1, role: ROLES.STUDENT, status: s, tenantId: tenantId || undefined })
      .then(unwrap).then((r) => (typeof r?.total === 'number' ? r.total : 0));
    const [active, pending, inactive] = await Promise.all([one('active'), one('pending'), one('inactive')]);
    return { active, pending, inactive };
  }, [tenantId]);
  const reloadAll = useCallback(async () => { await Promise.all([reload(), reloadCounts()]); }, [reload, reloadCounts]);

  const students = useMemo(() => {
    if (Array.isArray(data)) return data;
    return asList(data?.users || data, []);
  }, [data]);

  const total = typeof data?.total === 'number' ? data.total : students.length;
  const counts = countData || { active: null, pending: null, inactive: null };
  const ready = !(loading && !students.length);

  const handleToggleStatus = async (user) => {
    setActing(true);
    try {
      if (isDeactivated(user)) {
        await usersApi.reactivate(user.id);
        toast.success('Student reactivated');
      } else {
        await usersApi.deactivate(user.id);
        toast.success('Student deactivated');
      }
      await reloadAll();
    } catch (err) {
      toast.error(err?.message || 'Failed to update status');
    } finally {
      setActing(false);
    }
  };

  const handleResend = async (user) => {
    setActing(true);
    try {
      await usersApi.resendInvite(user.email);
      toast.success('Invite resent');
    } catch (err) {
      toast.error(err?.message || 'Failed to resend invite');
    } finally {
      setActing(false);
    }
  };

  const closeDrawer = useCallback(() => setDrawerUser(null), []);

  const askToggle = (user) => {
    setDrawerUser(null);
    setConfirmUser(user);
  };

  const confirmToggle = async () => {
    const user = confirmUser;
    if (!user) return;
    await handleToggleStatus(user);
    setConfirmUser(null);
  };

  const RowActions = ({ user }) => (
    <div className="un-actions">
      <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setDrawerUser(user)}>
        View
      </button>
      {isPending(user) ? (
        <span
          onMouseEnter={(e) => show(e, 'Resend activation email', 'top')}
          onMouseLeave={hide}
        >
          <IconButton
            icon="send"
            label={`Resend invite to ${fullName(user)}`}
            disabled={acting}
            onClick={() => handleResend(user)}
          />
        </span>
      ) : isDeactivated(user) ? (
        <IconButton
          icon="refresh"
          label={`Reactivate ${fullName(user)}`}
          disabled={acting}
          onClick={() => askToggle(user)}
        />
      ) : (
        <IconButton
          icon="lock"
          danger
          label={`Deactivate ${fullName(user)}`}
          disabled={acting}
          onClick={() => askToggle(user)}
        />
      )}
    </div>
  );

  const confirmDeactivating = confirmUser ? !isDeactivated(confirmUser) : false;
  const filtered = Boolean(search || status);

  return (
    <ModulePage className="ad-page">
      <ModuleBanner
        icon="users"
        eyebrow="People"
        title="Students"
        lede="Add students one at a time or import up to 100 from a CSV. Each student gets an activation link and sets their own password — you never set it for them."
        actions={(
          <>
            <button type="button" className="sd-btn sd-btn--glass" onClick={() => setImportOpen(true)}>
              <Icon name="upload" size={16} /> Bulk import
            </button>
            <button type="button" className="sd-btn sd-btn--amber" onClick={() => setCreateOpen(true)}>
              <Icon name="plus" size={16} /> Add student
            </button>
          </>
        )}
      />

      <KpiRow
        label="Students summary"
        items={[
          { icon: 'users', label: filtered ? 'Matching students' : 'Students', value: ready ? countLabel(total) : null, sub: filtered ? 'For these filters' : 'In your college' },
          { icon: 'tick', label: 'Active', value: counts.active != null ? countLabel(counts.active) : null, sub: 'Can sign in' },
          { icon: 'mail', label: 'Pending activation', value: counts.pending != null ? countLabel(counts.pending) : null, sub: 'Invite sent, not yet used' },
          { icon: 'lock', label: 'Deactivated', value: counts.inactive != null ? countLabel(counts.inactive) : null, sub: 'Soft-deleted, restorable' },
        ]}
      />

      <FilterBar label="Filter students">
        <SearchBox
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearchAndReset(e.target.value)}
        />
        <SegTabs label="Filter by status" options={STATUS_FILTERS} value={status} onChange={setStatusAndReset} />
      </FilterBar>

      {error ? (
        <SectionState
          tone="err"
          title="Could not load students"
          action={(
            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload()}>
              <Icon name="refresh" size={16} /> Try again
            </button>
          )}
        >
          {error?.message || 'Please try again.'}
        </SectionState>
      ) : null}

      {loading && !students.length ? <SectionState title="Loading students…" /> : null}

      {!loading && !error && !students.length ? (
        <SectionState
          title={filtered ? 'No students match these filters' : 'No students yet'}
          action={!filtered ? (
            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setCreateOpen(true)}>
              <Icon name="plus" size={16} /> Add the first student
            </button>
          ) : null}
        >
          {filtered ? 'Try a different name, email or status.' : 'Add a student to send them an activation invite.'}
        </SectionState>
      ) : null}

      {students.length ? (
        <Panel
          title="Student directory"
          sub={`${countLabel(total)} student${total === 1 ? '' : 's'}`}
          bodyClassName={null}
        >
          <div className="sp-table-wrap">
            <table className="sp-table un-table ad-stack">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Department</th>
                  <th>Programme</th>
                  <th>Status</th>
                  <th>Last active</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {students.map((user) => {
                  const name = fullName(user);
                  return (
                    <tr key={user.id}>
                      <td>
                        <button type="button" className="ad-person-btn pm-person" onClick={() => setDrawerUser(user)}>
                          <span className="pm-av" aria-hidden="true">{initials(name, 'S')}</span>
                          <span>
                            <b>{name}</b>
                            <small>{user.email}</small>
                          </span>
                        </button>
                      </td>
                      <td data-label="Department">{user.department_name || user.department || '—'}</td>
                      <td data-label="Programme">
                        {user.program_name ? (
                          <span className="ad-cell-2">
                            <span>{user.program_name}</span>
                            <small>{user.semester_name || 'Semester not set'}</small>
                          </span>
                        ) : <span className="ad-muted">Not set</span>}
                      </td>
                      <td data-label="Status">
                        <StatusPill active on={userStatusLabel(user)} tone={TONE[statusVariant(user)]} />
                      </td>
                      <td data-label="Last active">{lastActive(user)}</td>
                      <td><RowActions user={user} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pager page={page} pageSize={PAGE_SIZE} total={total} shown={students.length} onPage={setPage} noun="students" />
        </Panel>
      ) : null}

      <DetailDrawer
        open={Boolean(drawerUser)}
        onClose={closeDrawer}
        eyebrow="Student"
        title={drawerUser ? fullName(drawerUser) : ''}
        mono={drawerUser ? fullName(drawerUser) : null}
        pills={drawerUser ? (
          <>
            <span className="sp-pill sp-pill--glass">{drawerUser.email}</span>
            <StatusPill active on={userStatusLabel(drawerUser)} tone={TONE[statusVariant(drawerUser)]} />
          </>
        ) : null}
        stats={drawerUser ? [
          { label: 'Year of study', value: drawerUser.year_of_study ? countLabel(drawerUser.year_of_study) : '—' },
          { label: 'Semester', value: drawerUser.semester_name || '—' },
          { label: 'Programme length', value: drawerUser.course_duration_years ? `${drawerUser.course_duration_years} years` : '—' },
        ] : null}
        footer={drawerUser ? (
          <>
            <button
              type="button"
              className={`sd-btn sd-btn--sm ${isDeactivated(drawerUser) ? 'sd-btn--outline' : 'sd-btn--danger'}`}
              disabled={acting}
              onClick={() => askToggle(drawerUser)}
            >
              {isDeactivated(drawerUser) ? 'Reactivate' : 'Deactivate'}
            </button>
            {isPending(drawerUser) ? (
              <button
                type="button"
                className="sd-btn sd-btn--teal sd-btn--sm"
                disabled={acting}
                onClick={() => handleResend(drawerUser)}
              >
                <Icon name="send" size={16} /> Resend invite
              </button>
            ) : null}
          </>
        ) : null}
      >
        {drawerUser ? (
          <>
            <DrawerSection title="Contact">
              <InfoList
                items={[
                  { label: 'Email', value: drawerUser.email, full: true },
                  { label: 'Phone', value: drawerUser.phone_number || drawerUser.phone },
                ]}
              />
            </DrawerSection>
            <DrawerSection title="Academic">
              <InfoList
                items={[
                  { label: 'Department', value: drawerUser.department_name || drawerUser.department, full: true },
                  { label: 'Programme', value: drawerUser.program_name || 'Not set' },
                  { label: 'Current semester', value: drawerUser.semester_name || 'Not set' },
                ]}
              />
              {departmentOptions.length ? (
                <div className="ad-drawer-actions">
                  <button
                    type="button"
                    className="sd-btn sd-btn--outline sd-btn--sm"
                    onClick={() => setDeptUser(drawerUser)}
                  >
                    {drawerUser.department_id ? 'Change department' : 'Assign department'}
                  </button>
                  {drawerUser.department_id ? (
                    <button
                      type="button"
                      className="sd-btn sd-btn--outline sd-btn--sm"
                      onClick={() => setPlacementUser(drawerUser)}
                    >
                      <Icon name="tree" size={16} /> {drawerUser.program_id ? 'Change programme' : 'Set programme'}
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="hint">Create a department in Structure before you can place this student.</p>
              )}
            </DrawerSection>
            <DrawerSection title="Account">
              <InfoList
                items={[
                  { label: 'Status', value: userStatusLabel(drawerUser) },
                  { label: 'Last active', value: lastActive(drawerUser) },
                  { label: 'Added on', value: drawerUser.created_at ? dateLabel(drawerUser.created_at) : null },
                ]}
              />
            </DrawerSection>
          </>
        ) : null}
      </DetailDrawer>

      <QuirriModal
        open={Boolean(confirmUser)}
        onClose={() => setConfirmUser(null)}
        title={confirmDeactivating ? 'Deactivate student?' : 'Reactivate student?'}
        crumb={confirmUser ? `${fullName(confirmUser)} · ${confirmUser.email || ''}` : null}
        footer={(
          <>
            <button type="button" className="sd-btn sd-btn--ghost" onClick={() => setConfirmUser(null)} disabled={acting}>
              Cancel
            </button>
            <div className="right">
              <button
                type="button"
                className={`sd-btn ${confirmDeactivating ? 'un-btn-danger' : 'sd-btn--teal'}`}
                onClick={confirmToggle}
                disabled={acting}
              >
                {acting ? 'Updating…' : confirmDeactivating ? 'Deactivate' : 'Reactivate'}
              </button>
            </div>
          </>
        )}
      >
        {confirmUser ? (
          <ConfirmNote
            danger={confirmDeactivating}
            title={confirmDeactivating ? 'This is a soft delete.' : 'The student can sign in again.'}
          >
            {confirmDeactivating
              ? `${fullName(confirmUser)} can no longer sign in. Their progress and records are kept, and you can reactivate them at any time.`
              : `${fullName(confirmUser)} gets access to their subjects and progress again.`}
          </ConfirmNote>
        ) : null}
      </QuirriModal>

      {deptUser ? (
        <ChangeDepartmentModal
          key={deptUser.id}
          open
          user={deptUser}
          departmentOptions={departmentOptions}
          onClose={() => setDeptUser(null)}
          onSaved={(updated) => {
            if (updated && typeof updated === 'object') {
              setDrawerUser((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
            }
            reload();
          }}
        />
      ) : null}

      {placementUser ? (
        <StudentPlacementModal
          key={placementUser.id}
          user={placementUser}
          onClose={() => setPlacementUser(null)}
          onSaved={async (updated) => {
            setPlacementUser(null);
            if (updated && typeof updated === 'object') {
              setDrawerUser((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
            }
            await reload();
          }}
        />
      ) : null}

      <StudentBulkImport
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={reloadAll}
        sampleDepartment={departmentOptions[0]?.label?.replace(/ \(.*\)$/, '')}
      />

      {createOpen ? (
        <CreateStudentModal
          key="create-student"
          open={createOpen}
          tenantId={tenantId}
          departmentOptions={departmentOptions}
          onClose={() => setCreateOpen(false)}
          onSaved={reloadAll}
        />
      ) : null}
      <TipLayer />
    </ModulePage>
  );
}

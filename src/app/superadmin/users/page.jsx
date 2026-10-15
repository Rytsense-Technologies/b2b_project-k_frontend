'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import StudentPlacementFields from '@/components/shared/StudentPlacementFields';
import StudentPlacementModal from '@/components/shared/StudentPlacementModal';
import { QuirriRHFField, QuirriSelect } from '@/components/superadmin/quirri-ui';
import {
  ModulePage,
  ModuleHead,
  TabNav,
  TabPanel,
  SegTabs,
  Panel,
  InfoList,
  DetailDrawer,
  DrawerSection,
  FormSection,
  ConfirmNote,
  Pager,
  Icon,
  SectionState,
  SearchBox,
  initials,
  countLabel,
} from '@/components/shared/module-ui';
import { Distribution } from '@/components/shared/data-viz';
import RowMenu from '@/components/superadmin/RowMenu';
import { useUrlState, useTabParam } from '@/hooks/useUrlState';
import { useDebouncedUrlSearch, pageParam } from '@/lib/superadmin/listState';
import { usersApi } from '@/lib/api/superadmin/users';
import { collegesApi, departmentsApi, fetchData } from '@/lib/api/superadmin/modules';
import { unwrap, asList, apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { ROLES } from '@/lib/permissions';
import { platformUserCreateSchema } from '@/lib/validation';
import { useQuirriTip } from '@/components/superadmin/QuirriTooltip';
import { useAuth } from '@/hooks/useAuth';
import { formatDateTime, formatIndianPhone, collegeOptionLabel } from '@/lib/superadmin/format';

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: ROLES.SUPERADMIN, label: 'Super Admin' },
  { value: ROLES.COLLEGE_ADMIN, label: 'College Admin' },
  { value: ROLES.HOD, label: 'HOD' },
  { value: ROLES.FACULTY, label: 'Faculty' },
  { value: ROLES.STUDENT, label: 'Student' },
];

const CREATE_ROLES = ROLE_OPTIONS.filter((o) => o.value);

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'inactive', label: 'Deactivated' },
];

const PAGE_SIZE = 25;

const EMPTY_USER = {
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  role: ROLES.COLLEGE_ADMIN,
  college_id: '',
  department: '',
  department_id: '',
  program_id: '',
  semester_id: '',
  course_duration_years: '',
  year_of_study: '',
  assigned_years: '',
  assigned_semesters: '',
};

const STATUS_TONE = { green: 'good', amber: 'low', off: 'off', red: 'err' };

// The API's `status` is authoritative: a fresh invite is is_active=false + status
// "pending_activation" and must read as pending, not deactivated.
function statusVariant(user) {
  if (isPending(user)) return 'amber';
  if (isDeactivated(user)) return 'off';
  const value = String(user?.status || '').toLowerCase();
  if (value === 'active') return 'green';
  if (value.includes('pending')) return 'amber';
  if (user?.is_active !== false && user?.is_verified !== false) return 'green';
  return 'red';
}

function userStatusLabel(user) {
  if (isPending(user)) return 'Pending activation';
  if (isDeactivated(user)) return 'Deactivated';
  const raw = String(user?.status || 'Active').replace(/_/g, ' ');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Role is a category, so it may use the categorical set (redesign spec, superadmin.md §6). */
const ROLE_COLOR = {
  [ROLES.SUPERADMIN]: 'var(--cat-4)',
  [ROLES.COLLEGE_ADMIN]: 'var(--cat-1)',
  [ROLES.HOD]: 'var(--cat-5)',
  [ROLES.FACULTY]: 'var(--cat-2)',
  [ROLES.STUDENT]: 'var(--cat-6)',
};
const ROLE_CLASS = {
  [ROLES.SUPERADMIN]: 'c4',
  [ROLES.COLLEGE_ADMIN]: 'c1',
  [ROLES.HOD]: 'c5',
  [ROLES.FACULTY]: 'c2',
  [ROLES.STUDENT]: 'c6',
};

function RolePill({ role }) {
  return <span className={`sa-role sa-role--${ROLE_CLASS[role] || 'none'}`}>{roleLabel(role)}</span>;
}

function roleLabel(role) {
  const found = ROLE_OPTIONS.find((r) => r.value === role);
  return found?.label || role || '—';
}

function isPending(user) {
  const v = String(user?.status || '').toLowerCase();
  if (v) return v.includes('pending');
  return user?.is_verified === false && user?.is_active !== false;
}

function isDeactivated(user) {
  const v = String(user?.status || '').toLowerCase();
  if (v) return v.includes('deactiv') || v === 'inactive' || v === 'disabled';
  return user?.is_active === false;
}

function displayName(user) {
  return user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || '—';
}

function institutionOf(user) {
  return user?.institution || user?.college || user?.tenant_name || null;
}

function lastActive(user) {
  return formatDateTime(user?.last_login_at, 'Never');
}

const SELF_REASON = 'This is your own account. Another Super Admin must change its role or deactivate it.';

function UserStatus({ user }) {
  return (
    <span className={`sp-pill sp-pill--${STATUS_TONE[statusVariant(user)]}`}>
      <i className="un-dot" aria-hidden="true" />
      {userStatusLabel(user)}
    </span>
  );
}

/* ------------------------------------------------------------ create form */
function CreateUserModal({ open, colleges, defaultCollegeId, onClose, onSaved }) {
  const {
    control,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors, submitCount },
  } = useForm({
    resolver: zodResolver(platformUserCreateSchema),
    defaultValues: {
      ...EMPTY_USER,
      college_id: defaultCollegeId || '',
    },
    mode: 'onBlur',
  });
  const [acting, setActing] = useState(false);
  const selectedRole = useWatch({ control, name: 'role' });
  const isStudent = selectedRole === ROLES.STUDENT;
  const isTeaching = selectedRole === ROLES.FACULTY || selectedRole === ROLES.HOD;
  const needsDept = isStudent || isTeaching;
  const collegeId = useWatch({ control, name: 'college_id' });
  const selectedDepartmentId = useWatch({ control, name: 'department_id' });
  const placementProgram = useWatch({ control, name: 'program_id' });
  const placementSemester = useWatch({ control, name: 'semester_id' });
  const changePlacement = useCallback(({ program_id: p, semester_id: s }) => {
    setValue('program_id', p || '');
    setValue('semester_id', s || '');
  }, [setValue]);

  // Departments of the chosen institution; the pick resets when the institution changes.
  const { data: deptData, loading: deptLoading } = useAsyncResource(
    () => (needsDept && collegeId
      ? fetchData(() => departmentsApi.list({ college_id: collegeId, pageSize: 100 }))
      : Promise.resolve(null)),
    [needsDept, collegeId],
  );
  const departments = useMemo(
    () => asList(deptData, []).filter((d) => d.is_active !== false),
    [deptData],
  );
  useEffect(() => { setValue('department_id', ''); }, [collegeId, setValue]);
  // Switching role hides fields whose errors would otherwise keep the summary line up.
  useEffect(() => { clearErrors(); }, [selectedRole, clearErrors]);

  const onCreate = handleSubmit(async (values) => {
    setActing(true);
    try {
      await usersApi.createUser({
        ...values,
        department_id: needsDept ? (values.department_id || undefined) : undefined,
        department: needsDept
          ? (departments.find((d) => d.id === values.department_id)?.name || undefined)
          : undefined,
        phone_number: values.phone_number || undefined,
        course_duration_years: isStudent ? (values.course_duration_years ?? undefined) : undefined,
        year_of_study: isStudent ? (values.year_of_study ?? undefined) : undefined,
        program_id: isStudent ? (values.program_id || undefined) : undefined,
        semester_id: isStudent ? (values.semester_id || undefined) : undefined,
        assigned_years: isTeaching ? (values.assigned_years || undefined) : undefined,
        assigned_semesters: isTeaching ? (values.assigned_semesters || undefined) : undefined,
      });
      toast.success('User created — activation link sent');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to create user'));
    } finally {
      setActing(false);
    }
  });

  return (
    <QuirriModal
      open={open}
      onClose={onClose}
      title="Create user"
      crumb="The user sets their own password from an activation link"
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
      <form onSubmit={onCreate} noValidate className="un-form sa-form">
        <FormSection n={1} title="Person" sub="Name and contact details. The activation link goes to this email.">
          <div className="grid2">
            <QuirriRHFField
              control={control}
              name="first_name"
              fieldType="personName"
              label="First name"
            />
            <QuirriRHFField
              control={control}
              name="last_name"
              fieldType="personName"
              label="Last name"
            />
            <QuirriRHFField
              control={control}
              name="email"
              fieldType="email"
              label="Email address"
              placeholder="name@college.edu"
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

        <FormSection n={2} title="Role and institution" sub="What the user can do, and where.">
          <div className="grid2">
            <Controller
              control={control}
              name="role"
              render={({ field, fieldState }) => (
                <QuirriSelect
                  id="create-role"
                  label="Role"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  error={fieldState.error?.message}
                  options={CREATE_ROLES.map((opt) => ({ value: opt.value, label: opt.label }))}
                />
              )}
            />
            <Controller
              control={control}
              name="college_id"
              render={({ field, fieldState }) => (
                <QuirriSelect
                  id="create-college"
                  label="Institution"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  placeholder="Select institution"
                  error={fieldState.error?.message}
                  hint="Required for College Admin, HOD, Faculty, and Student. Optional for Super Admin."
                  options={colleges.filter((c) => c.is_active !== false).map((c, _i, all) => ({ value: c.id, label: collegeOptionLabel(c, all) }))}
                />
              )}
            />
          </div>
          {needsDept ? (
            <Controller
              control={control}
              name="department_id"
              render={({ field, fieldState }) => (
                <QuirriSelect
                  id="create-department"
                  label="Department"
                  full
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  disabled={!collegeId || deptLoading || !departments.length}
                  placeholder={
                    !collegeId ? 'Select an institution first'
                      : deptLoading ? 'Loading departments…'
                        : departments.length ? 'Select department' : 'No departments yet'
                  }
                  hint={collegeId && !deptLoading && !departments.length
                    ? 'Optional. Add departments to this institution on the Departments page.'
                    : 'Optional. Scopes the person to one department.'}
                  error={fieldState.error?.message}
                  options={departments.map((d) => ({ value: d.id, label: d.code ? `${d.name} (${d.code})` : d.name }))}
                />
              )}
            />
          ) : null}
        </FormSection>

        {isStudent ? (
          <FormSection n={3} title="Programme and semester" sub="Optional. Puts the student in the right subjects and chapters.">
            <StudentPlacementFields
              idPrefix="create"
              departmentId={selectedDepartmentId}
              programId={placementProgram}
              semesterId={placementSemester}
              onChange={changePlacement}
            />
          </FormSection>
        ) : null}

        {isStudent && !placementSemester ? (
          <FormSection n={4} title="Study details" sub="Optional. Helps place the student in the right year.">
            <div className="grid2">
              <QuirriRHFField
                control={control}
                name="course_duration_years"
                fieldType="positiveInt"
                label="Programme duration (years)"
                placeholder="e.g. 4"
                hint="Optional — e.g. 3 for Arts, 4 for BTech."
              />
              <QuirriRHFField
                control={control}
                name="year_of_study"
                fieldType="positiveInt"
                label="Current year of study"
                placeholder="e.g. 2"
                hint="Cannot exceed programme duration when both are set."
              />
            </div>
          </FormSection>
        ) : null}

        {isTeaching ? (
          <FormSection n={3} title="Teaching load" sub="Optional. Years and semesters this person teaches.">
            <div className="grid2">
              <QuirriRHFField
                control={control}
                name="assigned_years"
                fieldType="search"
                label="Assigned years"
                placeholder="e.g. 1, 2, 3"
                hint="Optional — comma-separated year numbers (1–8)."
              />
              <QuirriRHFField
                control={control}
                name="assigned_semesters"
                fieldType="search"
                label="Assigned semesters"
                placeholder="e.g. 5, 6"
                hint="Optional — comma-separated semester numbers (1–16)."
              />
            </div>
          </FormSection>
        ) : null}

        {submitCount > 0 && Object.keys(errors).length > 0 ? (
          <div className="hint field-error" role="alert">
            Check the highlighted fields and try again.
          </div>
        ) : null}
        <ConfirmNote icon="key" title="No password field — by design">
          The account is created inactive and an activation link is sent. The administrator never knows the user&apos;s password.
        </ConfirmNote>
      </form>
    </QuirriModal>
  );
}

/* ------------------------------------------------------ status confirm */
function StatusConfirm({ user, busy, onCancel, onConfirm }) {
  if (!user) return null;
  const deactivating = !isDeactivated(user);
  const name = displayName(user);
  return (
    <QuirriModal
      open
      onClose={onCancel}
      title={deactivating ? 'Deactivate user?' : 'Reactivate user?'}
      crumb={[name, user.email].filter(Boolean).join(' · ')}
      footer={(
        <>
          <button type="button" className="sd-btn sd-btn--ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <div className="right">
            <button
              type="button"
              className={`sd-btn ${deactivating ? 'un-btn-danger' : 'sd-btn--teal'}`}
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? 'Updating…' : deactivating ? 'Deactivate' : 'Reactivate'}
            </button>
          </div>
        </>
      )}
    >
      <ConfirmNote
        danger={deactivating}
        title={deactivating ? 'Nothing is deleted.' : 'The user can sign in again.'}
      >
        {deactivating
          ? `${name} can no longer sign in. Their records are kept and you can reactivate the account at any time.`
          : `${name} regains access with their existing role and institution.`}
      </ConfirmNote>
    </QuirriModal>
  );
}

/* -------------------------------------------------------------- drawer */
function UserDrawer({ user, isSelf, acting, onClose, onResend, onRevoke, onToggle, onChangeRole, onPlacement }) {
  if (!user) return null;
  const name = displayName(user);
  const pending = isPending(user);
  const deactivated = isDeactivated(user);

  let footer;
  if (pending) {
    footer = (
      <>
        <button type="button" className="sd-btn sd-btn--danger sd-btn--sm" onClick={() => onRevoke(user)} disabled={acting || isSelf}>
          Cancel invite
        </button>
        <button type="button" className="sd-btn sd-btn--teal sd-btn--sm" onClick={() => onResend(user)} disabled={acting}>
          <Icon name="send" size={16} /> Resend invite
        </button>
      </>
    );
  } else if (deactivated) {
    footer = (
      <button type="button" className="sd-btn sd-btn--teal sd-btn--sm" onClick={() => onToggle(user)} disabled={acting}>
        <Icon name="refresh" size={16} /> Reactivate
      </button>
    );
  } else if (isSelf) {
    // Own account: no role / deactivate actions (the API refuses both); the Access section says why.
    footer = null;
  } else {
    footer = (
      <>
        <button type="button" className="sd-btn sd-btn--danger sd-btn--sm" onClick={() => onToggle(user)} disabled={acting}>
          Deactivate
        </button>
        <button type="button" className="sd-btn sd-btn--teal sd-btn--sm" onClick={() => onChangeRole(user)} disabled={acting}>
          <Icon name="shield" size={16} /> Change role
        </button>
      </>
    );
  }
  if (user.role === ROLES.STUDENT && !deactivated && user.department_id) {
    footer = (
      <>
        {footer}
        <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => onPlacement(user)} disabled={acting}>
          <Icon name="tree" size={16} /> Set programme
        </button>
      </>
    );
  }

  return (
    <DetailDrawer
      open
      onClose={onClose}
      eyebrow="Platform user"
      title={name}
      mono={name}
      pills={(
        <>
          <span className="sp-pill sp-pill--glass">{roleLabel(user.role)}</span>
          <UserStatus user={user} />
        </>
      )}
      footer={footer}
    >
      <DrawerSection title="Account">
        <InfoList
          items={[
            { label: 'Email', value: user.email, full: true },
            { label: 'Phone', value: formatIndianPhone(user.phone_number || user.phone) || null },
            { label: 'Role', value: roleLabel(user.role) },
            { label: 'Institution', value: institutionOf(user) },
            { label: 'Department', value: user.department || user.department_name },
            ...(user.role === ROLES.STUDENT ? [
              { label: 'Programme', value: user.program_name || 'Not set' },
              { label: 'Semester', value: user.semester_name || 'Not set' },
            ] : []),
            { label: 'Status', value: userStatusLabel(user) },
            { label: 'Last active', value: lastActive(user) },
          ]}
        />
      </DrawerSection>

      <DrawerSection title="Access">
        {pending ? (
          <SectionState title="Waiting for activation">
            The user has not set a password yet. Resend the invite if the link has expired.
          </SectionState>
        ) : deactivated ? (
          <SectionState title="Account deactivated">
            The user cannot sign in. Reactivate to restore access with the same role.
          </SectionState>
        ) : (
          <SectionState title={isSelf ? 'Your account' : 'Signed up and active'}>
            {isSelf ? SELF_REASON : 'Role changes are guarded — an admin cannot raise a user above their own role.'}
          </SectionState>
        )}
      </DrawerSection>
    </DetailDrawer>
  );
}

/* ---------------------------------------------------------------- page */
const STAFF_ROLES = [ROLES.COLLEGE_ADMIN, ROLES.HOD, ROLES.FACULTY];

/** Module tabs: each one is the same table with a role / status preset. */
const TABS = [
  { value: 'all', label: 'All users' },
  { value: 'students', label: 'Students' },
  { value: 'staff', label: 'Staff' },
  { value: 'superadmins', label: 'Super Admins' },
  { value: 'pending', label: 'Pending invites' },
];
const TAB_KEYS = TABS.map((t) => t.value);

/**
 * One call with include_counts=true: counts_by_role and counts_by_status for the caller's scope
 * plus the institution / department / search filters (role and status filters are ignored).
 */
async function loadUserCounts({ q, institution, department }) {
  const res = unwrap(await usersApi.getUsers({
    page: 1, pageSize: 1, includeCounts: true, search: q, tenantId: institution, departmentId: department,
  }));
  const byRole = res?.counts_by_role || {};
  const byStatus = res?.counts_by_status || {};
  const roles = Object.fromEntries(Object.values(ROLES).map((r) => [r, Number(byRole[r]) || 0]));
  // The Super Admins tab ignores institution / department (Super Admins have none), so its badge
  // is counted the same way: platform-wide, search only.
  let superadminsTab = roles[ROLES.SUPERADMIN];
  if (institution || department) {
    const sa = unwrap(await usersApi.getUsers({ page: 1, pageSize: 1, role: ROLES.SUPERADMIN, search: q }));
    superadminsTab = typeof sa?.total === 'number' ? sa.total : null;
  }
  return {
    superadminsTab,
    all: Object.values(byRole).reduce((a, n) => a + (Number(n) || 0), 0),
    active: Number(byStatus.active) || 0,
    pending: Number(byStatus.pending_activation) || 0,
    deactivated: Number(byStatus.deactivated) || 0,
    roles,
  };
}

function UsersView() {
  const [tab] = useTabParam(TAB_KEYS, 'all');
  const [url, setUrl] = useUrlState({ q: '', role: '', institution: '', department: '', status: '', page: '1' });
  const page = pageParam(url.page);
  const [search, setSearch] = useDebouncedUrlSearch(url.q, (q) => setUrl({ q, page: '1' }));
  const [createOpen, setCreateOpen] = useState(false);
  const [roleModal, setRoleModal] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [acting, setActing] = useState(false);
  const [drawerUser, setDrawerUser] = useState(null);
  const [placementUser, setPlacementUser] = useState(null);
  const [confirmUser, setConfirmUser] = useState(null);
  const [revokeUser, setRevokeUser] = useState(null);
  const { TipLayer } = useQuirriTip();
  const { user: me } = useAuth();
  const isSelf = useCallback((u) => Boolean(me?.id && u?.id && String(me.id) === String(u.id)), [me?.id]);

  const { data: collegeData } = useAsyncResource(
    () => fetchData(() => collegesApi.list({ pageSize: 100 })),
    [],
  );
  const colleges = useMemo(() => asList(collegeData, []), [collegeData]);
  const collegeById = useMemo(() => new Map(colleges.map((c) => [String(c.id), c])), [colleges]);

  const { data: deptData } = useAsyncResource(
    () => (url.institution
      ? fetchData(() => departmentsApi.list({ college_id: url.institution, pageSize: 100 }))
      : Promise.resolve(null)),
    [url.institution],
  );
  const departments = useMemo(() => asList(deptData, []), [deptData]);

  const { data: counts, reload: reloadCounts } = useAsyncResource(
    () => loadUserCounts({ q: url.q, institution: url.institution, department: url.department }),
    [url.q, url.institution, url.department],
  );
  const countScope = url.q || url.institution || url.department ? 'Matching search and institution' : 'Platform totals';

  // Role / status presets per tab; the role select narrows within All and Staff.
  const roleOptions = tab === 'staff'
    ? [{ value: '', label: 'All staff roles' }, ...ROLE_OPTIONS.filter((o) => STAFF_ROLES.includes(o.value))]
    : ROLE_OPTIONS;
  const roleChoice = roleOptions.some((o) => o.value === url.role) ? url.role : '';
  const query = useMemo(() => {
    let role = roleChoice;
    if (tab === 'students') role = ROLES.STUDENT;
    else if (tab === 'superadmins') role = ROLES.SUPERADMIN;
    else if (tab === 'staff' && !role) role = STAFF_ROLES.join(',');
    else if (tab === 'pending') role = roleChoice;
    return {
      page,
      pageSize: PAGE_SIZE,
      search: url.q,
      role,
      status: tab === 'pending' ? 'pending' : url.status,
      tenantId: tab === 'superadmins' ? '' : url.institution,
      departmentId: tab === 'superadmins' ? '' : url.department,
    };
  }, [tab, roleChoice, page, url.q, url.status, url.institution, url.department]);

  const { data, loading, error, reload } = useAsyncResource(
    async () => unwrap(await usersApi.getUsers(query)),
    [query],
  );

  const users = useMemo(
    () => (Array.isArray(data) ? data : asList(data?.users || data, [])),
    [data],
  );
  const total = data?.total ?? users.length;
  const filtersOn = Boolean(url.q || roleChoice || url.status || url.institution || url.department);

  const refresh = async () => {
    await reload();
    reloadCounts().catch(() => {});
  };

  // One URL write: the tab plus a reset of the role / status presets (search and institution stay).
  const changeTab = (v) => {
    setUrl({ tab: v === 'all' ? null : v, role: '', status: '', page: '1' }, { push: true });
  };

  const institutionCell = (u) => {
    const c = u?.tenant_id ? collegeById.get(String(u.tenant_id)) : null;
    if (c) {
      return (
        <span className="sa-inst">
          <span>{c.name}</span>
          <small>{[c.code, c.is_active === false ? 'inactive' : null].filter(Boolean).join(' · ')}</small>
        </span>
      );
    }
    return institutionOf(u) || <span className="sa-muted">Platform</span>;
  };

  const handleToggleStatus = async (user) => {
    setActing(true);
    try {
      if (isDeactivated(user)) {
        await usersApi.reactivate(user.id);
        toast.success('User reactivated');
      } else {
        await usersApi.deactivate(user.id);
        toast.success('User deactivated');
      }
      await refresh();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to update status'));
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
      toast.error(apiErrorMessage(err, 'Failed to resend invite'));
    } finally {
      setActing(false);
    }
  };

  const confirmRevoke = async () => {
    const user = revokeUser;
    if (!user) return;
    setActing(true);
    try {
      await usersApi.revokeInvite(user.id);
      toast.success(`Invite for ${user.email} cancelled`);
      setRevokeUser(null);
      setDrawerUser(null);
      await refresh();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not cancel the invite'));
    } finally {
      setActing(false);
    }
  };

  const openRoleChange = (user) => {
    setDrawerUser(null);
    setRoleModal(user);
    setNewRole(user.role || '');
  };

  const handleRoleSave = async () => {
    if (!roleModal?.id || !newRole) return;
    setActing(true);
    try {
      await usersApi.updateUserRole(roleModal.id, newRole);
      toast.success('Role updated');
      setRoleModal(null);
      await refresh();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to update role'));
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
    if (!confirmUser) return;
    await handleToggleStatus(confirmUser);
    setConfirmUser(null);
  };

  const menuItems = (user) => {
    const pending = isPending(user);
    const deactivated = isDeactivated(user);
    const self = isSelf(user);
    return [
      { label: 'View details', icon: 'eye', onClick: () => setDrawerUser(user) },
      pending ? { label: 'Resend invite', icon: 'send', disabled: acting, onClick: () => handleResend(user) } : null,
      pending && !self ? { label: 'Cancel invite', icon: 'x', danger: true, disabled: acting, onClick: () => setRevokeUser(user) } : null,
      !pending && !deactivated && !self ? { label: 'Change role', icon: 'shield', disabled: acting, onClick: () => openRoleChange(user) } : null,
      user.role === ROLES.STUDENT && !deactivated && user.department_id
        ? { label: 'Set programme', icon: 'tree', disabled: acting, onClick: () => setPlacementUser(user) } : null,
      !pending && !deactivated && !self ? { label: 'Deactivate', icon: 'lock', danger: true, disabled: acting, onClick: () => askToggle(user) } : null,
      deactivated ? { label: 'Reactivate', icon: 'refresh', disabled: acting, onClick: () => askToggle(user) } : null,
    ];
  };

  const n = (v) => (v == null ? null : countLabel(v));
  const staffCount = counts
    ? STAFF_ROLES.reduce((a, r) => (a == null || counts.roles[r] == null ? null : a + counts.roles[r]), 0)
    : null;
  const tabs = TABS.map((t) => ({
    ...t,
    count: !counts ? undefined : {
      all: n(counts.all),
      students: n(counts.roles[ROLES.STUDENT]),
      staff: n(staffCount),
      superadmins: n(counts.superadminsTab),
      pending: n(counts.pending),
    }[t.value] ?? undefined,
  }));

  const roleParts = CREATE_ROLES.map((r) => ({
    label: r.label,
    value: counts?.roles[r.value] || 0,
    color: ROLE_COLOR[r.value],
  }));
  const statusParts = [
    { label: 'Active', value: counts?.active || 0, color: 'var(--cat-2)' },
    { label: 'Pending activation', value: counts?.pending || 0, color: 'var(--highlight)' },
    { label: 'Deactivated', value: counts?.deactivated || 0, color: 'var(--neutral-200)' },
  ];
  const tabTitle = TABS.find((t) => t.value === tab)?.label || 'Users';

  return (
    <ModulePage className="sa-page">
      <TipLayer />
      <ModuleHead
        actions={(
          <button type="button" className="sd-btn sd-btn--amber" onClick={() => setCreateOpen(true)}>
            <Icon name="userPlus" size={16} /> Create user
          </button>
        )}
      />

      <TabNav tabs={tabs} value={tab} onChange={changeTab} label="User groups" idBase="users" />

      <TabPanel value={tab} current={tab} idBase="users">
        {tab === 'all' ? (
          <div className="dv-grid">
            <Panel title="Users by role" sub={`${countScope}, every status.`}>
              {counts ? <Distribution label="Users by role" parts={roleParts} /> : <p className="dv-empty">Loading…</p>}
            </Panel>
            <Panel title="Account status" sub={`${countScope}, every role.`}>
              {counts ? <Distribution label="Account status" parts={statusParts} /> : <p className="dv-empty">Loading…</p>}
            </Panel>
          </div>
        ) : null}

        <Panel
          title={tabTitle}
          sub={data ? `${countLabel(total)} ${total === 1 ? 'person' : 'people'}${filtersOn ? ' match these filters' : ''}` : null}
          bodyClassName={null}
          toolbar={(
            <>
              <SearchBox
                placeholder="Search name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {tab === 'all' || tab === 'staff' || tab === 'pending' ? (
                <div className="sa-filter-select sa-filter-select--wide">
                  <QuirriSelect
                    ariaLabel="Filter by role"
                    value={roleChoice}
                    onChange={(e) => setUrl({ role: e.target.value, page: '1' })}
                    options={roleOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
                  />
                </div>
              ) : null}
              {tab !== 'superadmins' ? (
                <>
                  <div className="sa-filter-select sa-filter-select--wide">
                    <QuirriSelect
                      ariaLabel="Filter by institution"
                      value={url.institution}
                      onChange={(e) => setUrl({ institution: e.target.value, department: '', page: '1' })}
                      placeholder="All institutions"
                      options={colleges.map((c) => ({ value: String(c.id), label: collegeOptionLabel(c, colleges) }))}
                    />
                  </div>
                  <div className="sa-filter-select sa-filter-select--wide">
                    <QuirriSelect
                      ariaLabel="Filter by department"
                      value={url.department}
                      onChange={(e) => setUrl({ department: e.target.value, page: '1' })}
                      placeholder="Department"
                      disabled={!url.institution || !departments.length}
                      options={departments.map((d) => ({ value: String(d.id), label: d.code ? `${d.name} (${d.code})` : d.name }))}
                    />
                  </div>
                </>
              ) : null}
              {tab !== 'pending' ? (
                <SegTabs
                  label="Filter by status"
                  options={STATUS_FILTERS}
                  value={url.status}
                  onChange={(v) => setUrl({ status: v, page: '1' })}
                />
              ) : null}
              {filtersOn ? (
                <button
                  type="button"
                  className="sd-btn sd-btn--ghost sd-btn--sm"
                  onClick={() => setUrl({ q: '', role: '', institution: '', department: '', status: '', page: '1' })}
                >
                  Clear
                </button>
              ) : null}
            </>
          )}
        >
          {error ? (
            <div className="sa-panel-state">
              <SectionState
                tone="err"
                title="Could not load users"
                action={(
                  <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload()}>
                    <Icon name="refresh" size={16} /> Try again
                  </button>
                )}
              >
                {apiErrorMessage(error, 'Please try again.')}
              </SectionState>
            </div>
          ) : null}

          {loading && !users.length ? <div className="sa-panel-state"><SectionState title="Loading users…" /></div> : null}

          {!loading && !error && !users.length ? (
            <div className="sa-panel-state">
              <SectionState
                title={filtersOn ? 'No users match these filters' : tab === 'pending' ? 'No pending invites' : 'No users here yet'}
                action={!filtersOn && tab === 'all' ? (
                  <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setCreateOpen(true)}>
                    <Icon name="userPlus" size={16} /> Create the first user
                  </button>
                ) : null}
              >
                {filtersOn
                  ? 'Try a different name, role, institution or status.'
                  : tab === 'pending' ? 'Everyone you invited has set a password.' : 'People you invite appear here once created.'}
              </SectionState>
            </div>
          ) : null}

          {users.length ? (
            <div className="sp-table-wrap">
              <table className="sp-table un-table sa-table-tight sa-users-table sa-stack">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Institution</th>
                    <th>Status</th>
                    <th>Last active</th>
                    <th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const name = displayName(user);
                    return (
                      <tr key={user.id}>
                        <td>
                          <button type="button" className="un-name-btn pm-person" onClick={() => setDrawerUser(user)}>
                            <span className={`pm-av${isDeactivated(user) ? ' sa-av--muted' : ''}`}>{initials(name)}</span>
                            <span>
                              <b>{name}{isSelf(user) ? <span className="sp-pill sa-self-pill sa-you">You</span> : null}</b>
                              <small>{user.email}</small>
                            </span>
                          </button>
                        </td>
                        <td data-label="Role"><RolePill role={user.role} /></td>
                        <td data-label="Institution">{institutionCell(user)}</td>
                        <td data-label="Status" className="sa-nowrap"><UserStatus user={user} /></td>
                        <td data-label="Last active" className="sa-muted sa-nowrap">{lastActive(user)}</td>
                        <td className="sa-actions-cell">
                          <div className="un-actions">
                            <RowMenu label={`Actions for ${name}`} items={menuItems(user)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </Panel>

        <Pager
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          shown={users.length}
          onPage={(p) => setUrl({ page: String(p) }, { push: true })}
          noun="users"
        />
      </TabPanel>

      <UserDrawer
        user={drawerUser}
        isSelf={isSelf(drawerUser)}
        acting={acting}
        onClose={closeDrawer}
        onResend={handleResend}
        onRevoke={(u) => setRevokeUser(u)}
        onToggle={askToggle}
        onChangeRole={openRoleChange}
        onPlacement={(u) => { setDrawerUser(null); setPlacementUser(u); }}
      />

      <QuirriModal
        open={Boolean(revokeUser)}
        onClose={() => !acting && setRevokeUser(null)}
        title="Cancel this invite?"
        crumb={revokeUser ? `${displayName(revokeUser)} · ${revokeUser.email || ''}` : null}
        footer={(
          <>
            <button type="button" className="sd-btn sd-btn--ghost" onClick={() => setRevokeUser(null)} disabled={acting}>Keep invite</button>
            <div className="right">
              <button type="button" className="sd-btn un-btn-danger" onClick={confirmRevoke} disabled={acting}>
                {acting ? 'Cancelling…' : 'Cancel invite'}
              </button>
            </div>
          </>
        )}
      >
        <ConfirmNote danger title="Their activation link stops working.">
          This person never signed in, so nothing else is lost. You can invite the same email again later.
        </ConfirmNote>
      </QuirriModal>

      {placementUser ? (
        <StudentPlacementModal
          user={placementUser}
          onClose={() => setPlacementUser(null)}
          onSaved={async () => { setPlacementUser(null); await reload(); }}
        />
      ) : null}

      <StatusConfirm
        user={confirmUser}
        busy={Boolean(confirmUser) && acting}
        onCancel={() => setConfirmUser(null)}
        onConfirm={confirmToggle}
      />

      {createOpen ? (
        <CreateUserModal
          key="create-user"
          open={createOpen}
          colleges={colleges}
          defaultCollegeId={url.institution || ''}
          onClose={() => setCreateOpen(false)}
          onSaved={refresh}
        />
      ) : null}

      <QuirriModal
        open={Boolean(roleModal)}
        onClose={() => setRoleModal(null)}
        title="Change role"
        crumb="Role change is guarded — an admin cannot escalate a user above their own role."
        footer={(
          <>
            <button type="button" className="sd-btn sd-btn--ghost" onClick={() => setRoleModal(null)}>Cancel</button>
            <div className="right">
              <button type="button" className="sd-btn sd-btn--amber" onClick={handleRoleSave} disabled={acting}>
                <Icon name="tick" size={16} />
                {acting ? 'Saving…' : 'Save role'}
              </button>
            </div>
          </>
        )}
      >
        {roleModal ? (
          <div className="un-form sa-form">
            <div className="pm-person sa-role-who">
              <span className="pm-av">{initials(displayName(roleModal))}</span>
              <div>
                <b>{displayName(roleModal)}</b>
                <small>{[roleLabel(roleModal.role), institutionOf(roleModal)].filter(Boolean).join(' · ')}</small>
              </div>
            </div>
            <QuirriSelect
              id="change-role"
              label="New role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              options={CREATE_ROLES.map((opt) => ({ value: opt.value, label: opt.label }))}
            />
          </div>
        ) : null}
      </QuirriModal>
    </ModulePage>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<SectionState title="Loading users…" />}>
      <UsersView />
    </Suspense>
  );
}

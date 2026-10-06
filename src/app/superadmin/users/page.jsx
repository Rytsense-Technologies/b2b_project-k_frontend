'use client';

import { useCallback, useMemo, useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { QuirriRHFField, QuirriSelect } from '@/components/superadmin/quirri-ui';
import {
  ModulePage,
  ModuleBanner,
  KpiRow,
  FilterBar,
  SegTabs,
  Panel,
  IconButton,
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
import { usersApi } from '@/lib/api/superadmin/users';
import { collegesApi, fetchData } from '@/lib/api/superadmin/modules';
import { unwrap, asList, apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { ROLES } from '@/lib/permissions';
import { platformUserCreateSchema } from '@/lib/validation';
import { useQuirriTip } from '@/components/superadmin/QuirriTooltip';

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
  course_duration_years: '',
  year_of_study: '',
  assigned_years: '',
  assigned_semesters: '',
};

const STATUS_TONE = { green: 'good', amber: 'low', red: 'err' };

function statusVariant(user) {
  if (user?.is_active === false) return 'red';
  if (user?.is_verified === false || user?.is_active === false) return 'amber';
  const value = String(user?.status || '').toLowerCase();
  if (value === 'active') return 'green';
  if (value.includes('pending')) return 'amber';
  if (user?.is_active !== false && user?.is_verified !== false) return 'green';
  return 'red';
}

function userStatusLabel(user) {
  if (user?.is_active === false) return 'Deactivated';
  if (user?.is_verified === false) return 'Pending activation';
  const raw = String(user?.status || 'Active').replace(/_/g, ' ');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function roleTone(role) {
  const r = String(role || '').toLowerCase();
  if (r.includes('super') || r.includes('college') || r === 'admin' || r === 'hod') return 'sp-pill--teal';
  return '';
}

function roleLabel(role) {
  const found = ROLE_OPTIONS.find((r) => r.value === role);
  return found?.label || role || '—';
}

function isPending(user) {
  return user?.is_verified === false || String(user?.status || '').toLowerCase().includes('pending');
}

function isDeactivated(user) {
  if (user?.is_active === false) return true;
  const v = String(user?.status || '').toLowerCase();
  return v.includes('deactiv') || v === 'inactive';
}

function displayName(user) {
  return user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || '—';
}

function institutionOf(user) {
  return user?.institution || user?.college || user?.tenant_name || null;
}

function lastActive(user) {
  return user?.last_active || user?.last_login || user?.updated_at || 'Never';
}

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
    formState: { errors },
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

  const onCreate = handleSubmit(async (values) => {
    setActing(true);
    try {
      await usersApi.createUser({
        ...values,
        department: values.department || undefined,
        phone_number: values.phone_number || undefined,
        course_duration_years: isStudent ? (values.course_duration_years ?? undefined) : undefined,
        year_of_study: isStudent ? (values.year_of_study ?? undefined) : undefined,
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
                  options={colleges.map((c) => ({ value: c.id, label: c.name }))}
                />
              )}
            />
          </div>
          {needsDept ? (
            <QuirriRHFField
              control={control}
              name="department"
              fieldType="academicLabel"
              label="Department"
              placeholder="Optional until academic structure is live"
              hint="Free text for now — a department picker comes with the academic structure."
              full
            />
          ) : null}
        </FormSection>

        {isStudent ? (
          <FormSection n={3} title="Study details" sub="Optional. Helps place the student in the right year.">
            <div className="grid2">
              <QuirriRHFField
                control={control}
                name="course_duration_years"
                fieldType="positiveInt"
                label="Program duration (years)"
                placeholder="e.g. 4"
                hint="Optional — e.g. 3 for Arts, 4 for BTech."
              />
              <QuirriRHFField
                control={control}
                name="year_of_study"
                fieldType="positiveInt"
                label="Current year of study"
                placeholder="e.g. 2"
                hint="Cannot exceed program duration when both are set."
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

        {Object.keys(errors).length > 0 ? (
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
        title={deactivating ? 'This is a soft delete.' : 'The user can sign in again.'}
      >
        {deactivating
          ? `${name} can no longer sign in. Their records are kept and you can reactivate the account at any time.`
          : `${name} regains access with their existing role and institution.`}
      </ConfirmNote>
    </QuirriModal>
  );
}

/* -------------------------------------------------------------- drawer */
function UserDrawer({ user, acting, onClose, onResend, onToggle, onChangeRole }) {
  if (!user) return null;
  const name = displayName(user);
  const pending = isPending(user);
  const deactivated = isDeactivated(user);

  let footer;
  if (pending) {
    footer = (
      <button type="button" className="sd-btn sd-btn--teal sd-btn--sm" onClick={() => onResend(user)} disabled={acting}>
        <Icon name="send" size={16} /> Resend invite
      </button>
    );
  } else if (deactivated) {
    footer = (
      <button type="button" className="sd-btn sd-btn--teal sd-btn--sm" onClick={() => onToggle(user)} disabled={acting}>
        <Icon name="refresh" size={16} /> Reactivate
      </button>
    );
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
            { label: 'Phone', value: user.phone_number || user.phone },
            { label: 'Role', value: roleLabel(user.role) },
            { label: 'Institution', value: institutionOf(user) },
            { label: 'Department', value: user.department || user.department_name },
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
          <SectionState title="Signed up and active">
            Role changes are guarded — an admin cannot raise a user above their own role.
          </SectionState>
        )}
      </DrawerSection>
    </DetailDrawer>
  );
}

/* ---------------------------------------------------------------- page */
export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [institution, setInstitution] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [roleModal, setRoleModal] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [acting, setActing] = useState(false);
  const [drawerUser, setDrawerUser] = useState(null);
  const [confirmUser, setConfirmUser] = useState(null);
  const { show, hide, TipLayer } = useQuirriTip();

  const { data: collegeData } = useAsyncResource(
    () => fetchData(() => collegesApi.list({})),
    [],
  );
  const colleges = useMemo(() => asList(collegeData, []), [collegeData]);

  const listKey = useMemo(
    () => ({ search, role, status, institution, page }),
    [search, role, status, institution, page],
  );

  const { data, loading, error, reload } = useAsyncResource(async () => {
    const isPendingFilter = status === 'pending';
    const res = await usersApi.getUsers({
      page: isPendingFilter ? 1 : page,
      pageSize: isPendingFilter ? 100 : PAGE_SIZE,
      search,
      role,
      status: isPendingFilter ? '' : status,
      tenantId: institution,
    });
    return unwrap(res);
  }, [listKey]);

  const users = useMemo(() => {
    let rows = Array.isArray(data) ? data : asList(data?.users || data, []);
    if (status === 'pending') {
      rows = rows.filter((u) => isPending(u) && !isDeactivated(u));
    }
    return rows;
  }, [data, status]);

  const total = status === 'pending'
    ? users.length
    : (data?.total ?? users.length);
  const pageSize = status === 'pending' ? Math.max(users.length, 1) : (data?.page_size ?? PAGE_SIZE);
  const filtered = Boolean(search || role || status || institution);
  const listedAll = users.length >= total;
  const scopeNote = listedAll ? 'In this list' : 'On this page';

  const summary = useMemo(() => {
    const out = { active: 0, pending: 0, deactivated: 0, roles: {} };
    users.forEach((u) => {
      if (isDeactivated(u)) out.deactivated += 1;
      else if (isPending(u)) out.pending += 1;
      else out.active += 1;
      const key = u.role || 'other';
      out.roles[key] = (out.roles[key] || 0) + 1;
    });
    return out;
  }, [users]);

  const roleChips = CREATE_ROLES
    .filter((r) => summary.roles[r.value])
    .map((r) => ({ label: r.label, count: summary.roles[r.value] }));

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
      await reload();
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
      await reload();
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

  const RowActions = ({ user }) => {
    const name = displayName(user);
    return (
      <div className="un-actions">
        <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setDrawerUser(user)}>
          View
        </button>
        {isPending(user) ? (
          <IconButton icon="send" label={`Resend invite to ${name}`} disabled={acting} onClick={() => handleResend(user)} />
        ) : isDeactivated(user) ? (
          <IconButton icon="refresh" label={`Reactivate ${name}`} disabled={acting} onClick={() => askToggle(user)} />
        ) : (
          <>
            <IconButton icon="shield" label={`Change role for ${name}`} disabled={acting} onClick={() => openRoleChange(user)} />
            <IconButton icon="lock" label={`Deactivate ${name}`} danger disabled={acting} onClick={() => askToggle(user)} />
          </>
        )}
      </div>
    );
  };

  const tipText = 'Bulk CSV import is not available yet';

  return (
    <ModulePage className="sa-page">
      <TipLayer />
      <ModuleBanner
        icon="users"
        eyebrow="Platform access"
        title="Platform users"
        lede="Every user across every institution. Only Super Admin can reach this view — each institution sees only its own people."
        chips={roleChips.length ? roleChips.map((c) => (
          <span key={c.label}>{c.label} · {countLabel(c.count)}</span>
        )) : null}
        actions={(
          <>
            <button
              type="button"
              className="sd-btn sd-btn--glass"
              disabled
              aria-label="Bulk upload — not available yet"
              onMouseEnter={(e) => show(e, tipText, 'top')}
              onMouseLeave={hide}
              onFocus={(e) => show(e, tipText, 'top')}
              onBlur={hide}
            >
              <Icon name="upload" size={16} /> Bulk upload
            </button>
            <button type="button" className="sd-btn sd-btn--amber" onClick={() => setCreateOpen(true)}>
              <Icon name="userPlus" size={16} /> Create user
            </button>
          </>
        )}
      />

      <KpiRow
        label="Users summary"
        items={[
          { icon: 'users', label: 'Users', value: data ? countLabel(total) : null, sub: filtered ? 'Matching these filters' : 'Across all institutions' },
          { icon: 'tick', label: 'Active', value: data ? countLabel(summary.active) : null, sub: scopeNote },
          { icon: 'mail', label: 'Pending activation', value: data ? countLabel(summary.pending) : null, sub: 'Invite sent, not signed in' },
          { icon: 'lock', label: 'Deactivated', value: data ? countLabel(summary.deactivated) : null, sub: 'Soft-deleted, restorable' },
        ]}
      />

      <FilterBar label="Filter users">
        <SearchBox
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <QuirriSelect
          ariaLabel="Filter by role"
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          options={ROLE_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
        />
        <QuirriSelect
          ariaLabel="Filter by institution"
          value={institution}
          onChange={(e) => {
            setInstitution(e.target.value);
            setPage(1);
          }}
          placeholder="All institutions"
          options={colleges.map((c) => ({ value: c.id, label: c.name }))}
        />
        <SegTabs
          label="Filter by status"
          options={STATUS_FILTERS}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
      </FilterBar>

      {error ? (
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
      ) : null}

      {loading && !users.length ? <SectionState title="Loading users…" /> : null}

      {!loading && !error && !users.length ? (
        <SectionState
          title={filtered ? 'No users match these filters' : 'No users yet'}
          action={!filtered ? (
            <button type="button" className="sd-btn sd-btn--teal sd-btn--sm" onClick={() => setCreateOpen(true)}>
              <Icon name="userPlus" size={16} /> Create the first user
            </button>
          ) : null}
        >
          {filtered ? 'Try a different name, role, institution or status.' : 'People you invite appear here once created.'}
        </SectionState>
      ) : null}

      {users.length ? (
        <Panel
          title="All users"
          sub={`${countLabel(total)} ${total === 1 ? 'person' : 'people'}${filtered ? ' match these filters' : ' on the platform'}`}
          bodyClassName={null}
        >
          <div className="sp-table-wrap">
            <table className="sp-table un-table sa-users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Institution</th>
                  <th>Status</th>
                  <th>Last active</th>
                  <th aria-label="Actions" />
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
                            <b>{name}</b>
                            <small>{user.email}</small>
                          </span>
                        </button>
                      </td>
                      <td><span className={`sp-pill ${roleTone(user.role)}`.trim()}>{roleLabel(user.role)}</span></td>
                      <td>{institutionOf(user) || <span className="sa-muted">Platform</span>}</td>
                      <td className="sa-nowrap"><UserStatus user={user} /></td>
                      <td className="sa-muted sa-nowrap">{lastActive(user)}</td>
                      <td><RowActions user={user} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      <Pager
        page={status === 'pending' ? 1 : page}
        pageSize={pageSize}
        total={total}
        shown={users.length}
        onPage={setPage}
        noun="users"
      />

      <UserDrawer
        user={drawerUser}
        acting={acting}
        onClose={closeDrawer}
        onResend={handleResend}
        onToggle={askToggle}
        onChangeRole={openRoleChange}
      />

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
          defaultCollegeId=""
          onClose={() => setCreateOpen(false)}
          onSaved={reload}
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

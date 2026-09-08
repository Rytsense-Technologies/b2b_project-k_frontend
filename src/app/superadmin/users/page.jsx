'use client';

import { useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import QuirriBadge from '@/components/superadmin/QuirriBadge';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { SearchBox, IconPlus, QuirriRHFField, QuirriSelect } from '@/components/superadmin/quirri-ui';
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
  { value: ROLES.FACULTY, label: 'Faculty' },
  { value: ROLES.STUDENT, label: 'Student' },
];

const CREATE_ROLES = ROLE_OPTIONS.filter((o) => o.value);

const PAGE_SIZE = 25;

const EMPTY_USER = {
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  role: ROLES.COLLEGE_ADMIN,
  college_id: '',
};

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
  return user?.status || 'Active';
}

function rolePill(role) {
  const r = String(role || '').toLowerCase();
  if (r.includes('super')) return 'violet';
  if (r.includes('college') || r.includes('admin')) return 'violet';
  if (r.includes('faculty')) return 'grey';
  return 'grey';
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

  const onCreate = handleSubmit(async (values) => {
    setActing(true);
    try {
      await usersApi.createUser(values);
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
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <div className="right">
            <button type="button" className="btn btn-primary" onClick={onCreate} disabled={acting}>
              {acting ? 'Creating…' : 'Create & send invite'}
            </button>
          </div>
        </>
      )}
    >
      <form onSubmit={onCreate} noValidate>
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
        </div>
        <QuirriRHFField
          control={control}
          name="email"
          fieldType="email"
          label="Email address"
          placeholder="name@college.edu"
          full
        />
        <QuirriRHFField
          control={control}
          name="phone_number"
          fieldType="phone"
          label="Phone number"
          placeholder="+91…"
          full
        />
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
                hint="Required for College Admin, Faculty, and Student. Optional for Super Admin."
                options={colleges.map((c) => ({ value: c.id, label: c.name }))}
              />
            )}
          />
        </div>
        {Object.keys(errors).length > 0 ? (
          <div className="hint field-error" role="alert" style={{ marginTop: 8 }}>
            Check the highlighted fields and try again.
          </div>
        ) : null}
        <div className="notice info" style={{ marginTop: 4 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <div>
            <b>No password field — by design</b>
            The account is created inactive and an activation link is sent. The administrator never knows the user&apos;s password.
          </div>
        </div>
      </form>
    </QuirriModal>
  );
}

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
  const pageSize = data?.page_size ?? PAGE_SIZE;
  const totalPages = status === 'pending'
    ? 1
    : Math.max(1, Math.ceil(total / pageSize));

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

  return (
    <div className="animate-fade-in">
      <TipLayer />
      <div className="section-head">
        <div>
          <div className="t">Platform Users</div>
          <div className="d">
            Every user across every institution. Only Super Admin can reach this view — each institution sees only its own people.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 9 }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled
            aria-label="Bulk upload — not available yet"
            onMouseEnter={(e) => show(e, 'Bulk CSV import lands with EPIC-12', 'top')}
            onMouseLeave={hide}
            onFocus={(e) => show(e, 'Bulk CSV import lands with EPIC-12', 'top')}
            onBlur={hide}
          >
            Bulk upload
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setCreateOpen(true)}
          >
            {IconPlus}
            Create User
          </button>
        </div>
      </div>

      <div className="toolbar">
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
        <QuirriSelect
          ariaLabel="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          placeholder="All statuses"
          options={[
            { value: 'active', label: 'Active' },
            { value: 'pending', label: 'Pending activation' },
            { value: 'inactive', label: 'Deactivated' },
          ]}
        />
      </div>

      {error ? (
        <div className="notice err" style={{ marginBottom: 12 }}>
          <div>
            <b>Could not load users</b>
            {apiErrorMessage(error, 'Please try again.')}
          </div>
        </div>
      ) : null}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Institution</th>
              <th>Status</th>
              <th>Last active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && !users.length ? (
              <tr><td colSpan={6}>Loading users…</td></tr>
            ) : null}
            {!loading && !users.length ? (
              <tr><td colSpan={6}>No users found.</td></tr>
            ) : null}
            {users.map((user) => {
              const name = user.name || [user.first_name, user.last_name].filter(Boolean).join(' ') || '—';
              return (
                <tr key={user.id}>
                  <td>
                    <span className="strong">{name}</span>
                    <div className="sub">{user.email}</div>
                  </td>
                  <td>
                    <QuirriBadge variant={rolePill(user.role)} plain>
                      {roleLabel(user.role)}
                    </QuirriBadge>
                  </td>
                  <td>{user.institution || user.college || user.tenant_name || '—'}</td>
                  <td>
                    <QuirriBadge variant={statusVariant(user)}>
                      {userStatusLabel(user)}
                    </QuirriBadge>
                  </td>
                  <td className="sub">{user.last_active || user.last_login || user.updated_at || 'Never'}</td>
                  <td className="actions">
                    {isPending(user) ? (
                      <a onClick={() => !acting && handleResend(user)} role="button" tabIndex={0}>Resend invite</a>
                    ) : isDeactivated(user) ? (
                      <a onClick={() => !acting && handleToggleStatus(user)} role="button" tabIndex={0}>Reactivate</a>
                    ) : (
                      <>
                        <a onClick={() => !acting && openRoleChange(user)} role="button" tabIndex={0}>Change role</a>
                        <a className="danger" onClick={() => !acting && handleToggleStatus(user)} role="button" tabIndex={0}>Deactivate</a>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {totalPages > 1 ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--line)' }}>
            <span className="sub">{total} total · page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>

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
            <button type="button" className="btn btn-ghost" onClick={() => setRoleModal(null)}>Cancel</button>
            <div className="right">
              <button type="button" className="btn btn-primary" onClick={handleRoleSave} disabled={acting}>
                {acting ? 'Saving…' : 'Save role'}
              </button>
            </div>
          </>
        )}
      >
        <div className="field">
          <QuirriSelect
            id="change-role"
            label="Role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            options={CREATE_ROLES.map((opt) => ({ value: opt.value, label: opt.label }))}
          />
        </div>
      </QuirriModal>
    </div>
  );
}

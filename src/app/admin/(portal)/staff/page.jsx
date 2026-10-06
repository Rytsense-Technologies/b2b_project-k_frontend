'use client';

import { useCallback, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { QuirriRHFField, QuirriSelect, QuirriCombobox } from '@/components/superadmin/quirri-ui';
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
  initials,
  countLabel,
} from '@/components/shared/module-ui';
import { usersApi } from '@/lib/api/superadmin/users';
import { departmentsApi, fetchData } from '@/lib/api/superadmin/modules';
import { unwrap, asList } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useAuth } from '@/hooks/useAuth';
import { ROLES } from '@/lib/permissions';
import { tenantFacultyCreateSchema } from '@/lib/validation';
import { getApiErrorMessage } from '@/lib/api/errors';

const STAFF_ROLE_OPTIONS = [
  { value: ROLES.FACULTY, label: 'Faculty' },
  { value: ROLES.HOD, label: 'HOD' },
];

const TONE = { red: 'err', amber: 'low', green: 'good' };

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending activation' },
  { value: 'inactive', label: 'Deactivated' },
];

function statusVariant(user) {
  if (user?.is_active === false) return 'red';
  if (user?.is_verified === false) return 'amber';
  const value = String(user?.status || '').toLowerCase();
  if (value === 'active') return 'green';
  if (value.includes('pending')) return 'amber';
  if (user?.is_active !== false && user?.is_verified !== false) return 'green';
  return 'red';
}

function userStatusLabel(user) {
  if (user?.is_active === false) return 'Deactivated';
  if (user?.is_verified === false) return 'Pending activation';
  const s = String(user?.status || 'Active').replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function isPending(user) {
  return user?.is_verified === false || String(user?.status || '').toLowerCase().includes('pending');
}

function isDeactivated(user) {
  if (user?.is_active === false) return true;
  const v = String(user?.status || '').toLowerCase();
  return v.includes('deactiv') || v === 'inactive';
}

function roleLabel(user) {
  const role = String(user?.role || '').toLowerCase();
  if (role === ROLES.HOD || role === 'hod') return 'HOD';
  return 'Faculty';
}

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

function scopeLabel(value) {
  if (Array.isArray(value)) return value.length ? value.join(', ') : null;
  return value || null;
}

function RolePill({ user }) {
  const hod = roleLabel(user) === 'HOD';
  return <span className={`sp-pill${hod ? ' sp-pill--teal' : ''}`}>{roleLabel(user)}</span>;
}

/* ------------------------------------------------------------------ form */
function CreateFacultyModal({ open, tenantId, departmentOptions, onClose, onSaved }) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(tenantFacultyCreateSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      role: ROLES.FACULTY,
      department_id: '',
      assigned_years: '',
      assigned_semesters: '',
    },
    mode: 'onBlur',
  });
  const [acting, setActing] = useState(false);

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
        assigned_years: values.assigned_years || undefined,
        assigned_semesters: values.assigned_semesters || undefined,
        role: values.role || ROLES.FACULTY,
        tenant_id: tenantId,
      });
      toast.success(
        values.role === ROLES.HOD
          ? 'HOD created — activation link sent'
          : 'Faculty created — activation link sent',
      );
      onSaved();
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to create staff member'));
    } finally {
      setActing(false);
    }
  });

  return (
    <QuirriModal
      open={open}
      onClose={onClose}
      title="Add staff"
      crumb="Create a faculty or HOD account. They set their own password from an activation link."
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
        <FormSection n={1} title="Staff details" sub="We send the activation link to this email address.">
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
              placeholder="faculty@college.edu"
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
        <FormSection n={2} title="Role and department" sub="An HOD reviews chapters for their department.">
          <div className="grid2">
            <Controller
              control={control}
              name="role"
              render={({ field, fieldState }) => (
                <QuirriSelect
                  id="staff-role"
                  label="Role"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  error={fieldState.error?.message}
                  options={STAFF_ROLE_OPTIONS}
                />
              )}
            />
            <Controller
              control={control}
              name="department_id"
              render={({ field, fieldState }) => (
                <QuirriCombobox
                  id="staff-department"
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
                />
              )}
            />
          </div>
        </FormSection>
        <FormSection n={3} title="Teaching scope" sub="Optional. Subject-level assignment comes later.">
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
        {Object.keys(errors).length > 0 ? (
          <div className="hint field-error" role="alert">
            Check the highlighted fields and try again.
          </div>
        ) : null}
      </form>
    </QuirriModal>
  );
}

/* ---------------------------------------------------------------- page */
export default function StaffPage() {
  const { tenantId } = useAuth();
  const { show, hide, TipLayer } = useQuirriTip();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [acting, setActing] = useState(false);
  const [drawerUser, setDrawerUser] = useState(null);
  const [confirmUser, setConfirmUser] = useState(null);

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

  const { data, loading, error, reload } = useAsyncResource(async () => {
    const [facultyRes, hodRes] = await Promise.all([
      usersApi.getUsers({
        page: 1,
        limit: 50,
        search,
        role: ROLES.FACULTY,
        status,
        tenantId: tenantId || undefined,
      }),
      usersApi.getUsers({
        page: 1,
        limit: 50,
        search,
        role: ROLES.HOD,
        status,
        tenantId: tenantId || undefined,
      }),
    ]);
    const faculty = asList(unwrap(facultyRes)?.items || unwrap(facultyRes), []);
    const hods = asList(unwrap(hodRes)?.items || unwrap(hodRes), []);
    const byId = new Map();
    [...faculty, ...hods].forEach((u) => {
      if (u?.id) byId.set(u.id, u);
    });
    return { items: [...byId.values()] };
  }, [search, status, tenantId]);

  const staff = useMemo(() => {
    if (Array.isArray(data)) return data;
    return asList(data?.items || data?.users || data, []);
  }, [data]);

  /* Role filter is applied to the rows already loaded (both roles are fetched). */
  const rows = useMemo(
    () => (roleFilter ? staff.filter((u) => roleLabel(u) === roleFilter) : staff),
    [staff, roleFilter],
  );

  const counts = useMemo(() => ({
    hod: staff.filter((u) => roleLabel(u) === 'HOD').length,
    faculty: staff.filter((u) => roleLabel(u) === 'Faculty').length,
    pending: staff.filter((u) => !isDeactivated(u) && isPending(u)).length,
  }), [staff]);
  const ready = !(loading && !staff.length);

  const handleToggleStatus = async (user) => {
    setActing(true);
    try {
      if (isDeactivated(user)) {
        await usersApi.reactivate(user.id);
        toast.success('Staff member reactivated');
      } else {
        await usersApi.deactivate(user.id);
        toast.success('Staff member deactivated');
      }
      await reload();
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
  const filtered = Boolean(search || status || roleFilter);

  return (
    <ModulePage className="ad-page">
      <ModuleBanner
        icon="userPlus"
        eyebrow="People"
        title="Staff and HOD"
        lede="Faculty and HOD accounts in your college. Each department's HOD reviews chapters before students see them."
        chips={(
          <>
            <span className="is-on">HOD</span>
            <Icon name="chev" size={14} />
            <span>Faculty</span>
            <Icon name="chev" size={14} />
            <span>Students</span>
          </>
        )}
        actions={(
          <button type="button" className="sd-btn sd-btn--amber" onClick={() => setCreateOpen(true)}>
            <Icon name="plus" size={16} /> Add staff
          </button>
        )}
      />

      <KpiRow
        label="Staff summary"
        items={[
          { icon: 'users', label: filtered ? 'Matching staff' : 'Staff', value: ready ? countLabel(staff.length) : null, sub: 'Faculty and HOD accounts' },
          { icon: 'shield', label: 'HOD', value: ready ? countLabel(counts.hod) : null, sub: 'Review chapters' },
          { icon: 'user', label: 'Faculty', value: ready ? countLabel(counts.faculty) : null, sub: 'Teaching staff' },
          { icon: 'mail', label: 'Pending activation', value: ready ? countLabel(counts.pending) : null, sub: 'Invite sent, not yet used' },
        ]}
      />

      <FilterBar label="Filter staff">
        <SearchBox
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <QuirriSelect
          ariaLabel="Filter by role"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          placeholder="All roles"
          options={[
            { value: 'HOD', label: 'HOD' },
            { value: 'Faculty', label: 'Faculty' },
          ]}
        />
        <SegTabs label="Filter by status" options={STATUS_FILTERS} value={status} onChange={setStatus} />
      </FilterBar>

      {error ? (
        <SectionState
          tone="err"
          title="Could not load staff"
          action={(
            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload()}>
              <Icon name="refresh" size={16} /> Try again
            </button>
          )}
        >
          {error?.message || 'Please try again.'}
        </SectionState>
      ) : null}

      {loading && !staff.length ? <SectionState title="Loading staff…" /> : null}

      {!loading && !error && !rows.length ? (
        <SectionState
          title={filtered ? 'No staff match these filters' : 'No staff yet'}
          action={!filtered ? (
            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setCreateOpen(true)}>
              <Icon name="plus" size={16} /> Add the first staff member
            </button>
          ) : null}
        >
          {filtered ? 'Try a different name, email, role or status.' : 'Add faculty or an HOD to send them an activation invite.'}
        </SectionState>
      ) : null}

      {rows.length ? (
        <Panel
          title="Staff directory"
          sub={`Showing ${countLabel(rows.length)} of ${countLabel(staff.length)}`}
          bodyClassName={null}
        >
          <div className="sp-table-wrap">
            <table className="sp-table un-table ad-stack">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Last active</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((user) => {
                  const name = fullName(user);
                  return (
                    <tr key={user.id}>
                      <td>
                        <button type="button" className="ad-person-btn pm-person" onClick={() => setDrawerUser(user)}>
                          <span className="pm-av" aria-hidden="true">{initials(name, 'F')}</span>
                          <span>
                            <b>{name}</b>
                            <small>{user.email}</small>
                          </span>
                        </button>
                      </td>
                      <td data-label="Role"><RolePill user={user} /></td>
                      <td data-label="Department">{user.department_name || user.department || '—'}</td>
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
        </Panel>
      ) : null}

      <DetailDrawer
        open={Boolean(drawerUser)}
        onClose={closeDrawer}
        eyebrow={drawerUser ? roleLabel(drawerUser) : 'Staff'}
        title={drawerUser ? fullName(drawerUser) : ''}
        mono={drawerUser ? fullName(drawerUser) : null}
        pills={drawerUser ? (
          <>
            <span className="sp-pill sp-pill--glass">{roleLabel(drawerUser)}</span>
            <StatusPill active on={userStatusLabel(drawerUser)} tone={TONE[statusVariant(drawerUser)]} />
          </>
        ) : null}
        stats={drawerUser ? [
          { label: 'Role', value: roleLabel(drawerUser) },
          { label: 'Last active', value: lastActive(drawerUser) },
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
            <DrawerSection title="Department and teaching scope">
              <InfoList
                items={[
                  { label: 'Department', value: drawerUser.department_name || drawerUser.department, full: true },
                  { label: 'Assigned years', value: scopeLabel(drawerUser.assigned_years) },
                  { label: 'Assigned semesters', value: scopeLabel(drawerUser.assigned_semesters) },
                ]}
              />
            </DrawerSection>
          </>
        ) : null}
      </DetailDrawer>

      <QuirriModal
        open={Boolean(confirmUser)}
        onClose={() => setConfirmUser(null)}
        title={confirmDeactivating ? 'Deactivate staff member?' : 'Reactivate staff member?'}
        crumb={confirmUser ? `${fullName(confirmUser)} · ${roleLabel(confirmUser)}` : null}
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
            title={confirmDeactivating ? 'This is a soft delete.' : 'They can sign in again.'}
          >
            {confirmDeactivating
              ? `${fullName(confirmUser)} can no longer sign in or review chapters. Their records are kept, and you can reactivate them at any time.`
              : `${fullName(confirmUser)} gets their ${roleLabel(confirmUser)} access back.`}
          </ConfirmNote>
        ) : null}
      </QuirriModal>

      {createOpen ? (
        <CreateFacultyModal
          key="create-staff"
          open={createOpen}
          tenantId={tenantId}
          departmentOptions={departmentOptions}
          onClose={() => setCreateOpen(false)}
          onSaved={reload}
        />
      ) : null}
      <TipLayer />
    </ModulePage>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import QuirriBadge from '@/components/superadmin/QuirriBadge';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { SearchBox, IconPlus, QuirriRHFField, QuirriSelect } from '@/components/superadmin/quirri-ui';
import { useQuirriTip } from '@/components/superadmin/QuirriTooltip';
import { usersApi } from '@/lib/api/superadmin/users';
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
  return user?.status || 'Active';
}

function isPending(user) {
  return user?.is_verified === false || String(user?.status || '').toLowerCase().includes('pending');
}

function isDeactivated(user) {
  if (user?.is_active === false) return true;
  const v = String(user?.status || '').toLowerCase();
  return v.includes('deactiv') || v === 'inactive';
}

function CreateFacultyModal({ open, tenantId, onClose, onSaved }) {
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
      department: '',
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
        department: values.department || undefined,
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
      crumb="College admins can create faculty or HOD — optional teaching scope until EPIC-06"
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
          <QuirriRHFField control={control} name="first_name" fieldType="personName" label="First name" />
          <QuirriRHFField control={control} name="last_name" fieldType="personName" label="Last name" />
        </div>
        <QuirriRHFField
          control={control}
          name="email"
          fieldType="email"
          label="Email address"
          placeholder="faculty@college.edu"
          full
        />
        <div className="grid2">
          <QuirriRHFField
            control={control}
            name="phone_number"
            fieldType="phone"
            label="Phone number"
            placeholder="+91…"
          />
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
        </div>
        <QuirriRHFField
          control={control}
          name="department"
          fieldType="academicLabel"
          label="Department"
          placeholder="Optional until academic structure is live"
          hint="Free-text for now — department picker arrives with EPIC-06."
          full
        />
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
        {Object.keys(errors).length > 0 ? (
          <div className="hint field-error" role="alert" style={{ marginTop: 8 }}>
            Check the highlighted fields and try again.
          </div>
        ) : null}
      </form>
    </QuirriModal>
  );
}

export default function StaffPage() {
  const { tenantId } = useAuth();
  const { show, hide, TipLayer } = useQuirriTip();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [acting, setActing] = useState(false);

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

  return (
    <div className="animate-fade-in">
      <div className="section-head">
        <div>
          <div className="t">Staff &amp; HOD</div>
          <div className="d">
            Faculty and HOD accounts in your college. Subject-level assignment arrives with EPIC-06.
          </div>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          {IconPlus}
          Add faculty
        </button>
      </div>

      <div className="toolbar">
        <SearchBox
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <QuirriSelect
          ariaLabel="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
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
          <div><b>Could not load staff</b>{error?.message || 'Please try again.'}</div>
        </div>
      ) : null}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Staff</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Last active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && !staff.length ? (
              <tr><td colSpan={6}>Loading staff…</td></tr>
            ) : null}
            {!loading && !staff.length ? (
              <tr><td colSpan={6}>No faculty yet. Add one to send an activation invite.</td></tr>
            ) : null}
            {staff.map((user) => {
              const name = user.name || [user.first_name, user.last_name].filter(Boolean).join(' ') || '—';
              return (
                <tr key={user.id}>
                  <td>
                    <span className="strong">{name}</span>
                    <div className="sub">{user.email}</div>
                  </td>
                  <td>
                    <QuirriBadge variant="grey" plain>Faculty</QuirriBadge>
                  </td>
                  <td className="sub">{user.department || '—'}</td>
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
                      <a className="danger" onClick={() => !acting && handleToggleStatus(user)} role="button" tabIndex={0}>Deactivate</a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {createOpen ? (
        <CreateFacultyModal
          open={createOpen}
          tenantId={tenantId}
          onClose={() => setCreateOpen(false)}
          onSaved={reload}
        />
      ) : null}
      <TipLayer />
    </div>
  );
}

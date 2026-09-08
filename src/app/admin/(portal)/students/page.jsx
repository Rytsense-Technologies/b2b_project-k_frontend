'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { tenantMemberCreateSchema } from '@/lib/validation';

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

function CreateStudentModal({ open, tenantId, onClose, onSaved }) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(tenantMemberCreateSchema),
    defaultValues: { first_name: '', last_name: '', email: '', department: '' },
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
        role: ROLES.STUDENT,
        tenant_id: tenantId,
      });
      toast.success('Student created — activation link sent');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Failed to create student');
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
          placeholder="student@college.edu"
          full
        />
        <QuirriRHFField
          control={control}
          name="department"
          fieldType="academicLabel"
          label="Department"
          placeholder="Optional until academic structure is live"
          hint="Free-text for now — department picker arrives with EPIC-06."
          full
        />
        {Object.keys(errors).length > 0 ? (
          <div className="hint field-error" role="alert" style={{ marginTop: 8 }}>
            Check the highlighted fields and try again.
          </div>
        ) : null}
      </form>
    </QuirriModal>
  );
}

export default function StudentsPage() {
  const { tenantId } = useAuth();
  const { show, hide, TipLayer } = useQuirriTip();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [acting, setActing] = useState(false);

  const { data, loading, error, reload } = useAsyncResource(async () => {
    const res = await usersApi.getUsers({
      page: 1,
      limit: 50,
      search,
      role: ROLES.STUDENT,
      status,
      tenantId: tenantId || undefined,
    });
    return unwrap(res);
  }, [search, status, tenantId]);

  const students = useMemo(() => {
    if (Array.isArray(data)) return data;
    return asList(data?.users || data, []);
  }, [data]);

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
          <div className="t">Students</div>
          <div className="d">
            Add students individually or import in bulk when EPIC-12 is live. Each one receives an activation link — you never set their password.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 9 }}>
          <button
            type="button"
            className="btn btn-ghost"
            disabled
            aria-label="Bulk import — not available yet"
            onMouseEnter={(e) => show(e, 'Bulk CSV import lands with EPIC-12', 'top')}
            onMouseLeave={hide}
            onFocus={(e) => show(e, 'Bulk CSV import lands with EPIC-12', 'top')}
            onBlur={hide}
          >
            Bulk import
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            {IconPlus}
            Add student
          </button>
        </div>
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
          <div><b>Could not load students</b>{error?.message || 'Please try again.'}</div>
        </div>
      ) : null}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Department</th>
              <th>Status</th>
              <th>Last active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && !students.length ? (
              <tr><td colSpan={5}>Loading students…</td></tr>
            ) : null}
            {!loading && !students.length ? (
              <tr><td colSpan={5}>No students yet. Add one to send an activation invite.</td></tr>
            ) : null}
            {students.map((user) => {
              const name = user.name || [user.first_name, user.last_name].filter(Boolean).join(' ') || '—';
              return (
                <tr key={user.id}>
                  <td>
                    <span className="strong">{name}</span>
                    <div className="sub">{user.email}</div>
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
        <CreateStudentModal
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

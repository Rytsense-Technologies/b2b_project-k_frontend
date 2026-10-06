'use client';

import { useCallback, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
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
  initials,
  countLabel,
} from '@/components/shared/module-ui';
import { usersApi } from '@/lib/api/superadmin/users';
import { departmentsApi, fetchData } from '@/lib/api/superadmin/modules';
import { unwrap, asList } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useAuth } from '@/hooks/useAuth';
import { ROLES } from '@/lib/permissions';
import { tenantStudentCreateSchema } from '@/lib/validation';
import { getApiErrorMessage } from '@/lib/api/errors';

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
        course_duration_years: values.course_duration_years ?? undefined,
        year_of_study: values.year_of_study ?? undefined,
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
          <div className="grid2">
            <QuirriRHFField
              control={control}
              name="course_duration_years"
              fieldType="positiveInt"
              label="Programme duration (years)"
              placeholder="e.g. 4"
              hint="Optional — e.g. 3 for Arts, 4 for B.Tech."
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
export default function StudentsPage() {
  const { tenantId } = useAuth();
  const { show, hide, TipLayer } = useQuirriTip();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
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

  const total = typeof data?.total === 'number' ? data.total : students.length;
  const counts = useMemo(() => ({
    active: students.filter((u) => !isDeactivated(u) && !isPending(u)).length,
    pending: students.filter((u) => !isDeactivated(u) && isPending(u)).length,
    inactive: students.filter((u) => isDeactivated(u)).length,
  }), [students]);
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
  const filtered = Boolean(search || status);

  return (
    <ModulePage className="ad-page">
      <ModuleBanner
        icon="users"
        eyebrow="People"
        title="Students"
        lede="Add students one at a time. Each student gets an activation link and sets their own password — you never set it for them."
        actions={(
          <>
            <button
              type="button"
              className="sd-btn sd-btn--glass"
              disabled
              aria-label="Bulk import — not available yet"
              onMouseEnter={(e) => show(e, 'Bulk import is not available yet', 'top')}
              onMouseLeave={hide}
              onFocus={(e) => show(e, 'Bulk import is not available yet', 'top')}
              onBlur={hide}
            >
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
          { icon: 'tick', label: 'Active', value: ready ? countLabel(counts.active) : null, sub: 'Can sign in' },
          { icon: 'mail', label: 'Pending activation', value: ready ? countLabel(counts.pending) : null, sub: 'Invite sent, not yet used' },
          { icon: 'lock', label: 'Deactivated', value: ready ? countLabel(counts.inactive) : null, sub: 'Soft-deleted, restorable' },
        ]}
      />

      <FilterBar label="Filter students">
        <SearchBox
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <SegTabs label="Filter by status" options={STATUS_FILTERS} value={status} onChange={setStatus} />
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
          sub={`Showing ${countLabel(students.length)} of ${countLabel(total)}`}
          bodyClassName={null}
        >
          <div className="sp-table-wrap">
            <table className="sp-table un-table ad-stack">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Department</th>
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
                ]}
              />
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

      {createOpen ? (
        <CreateStudentModal
          key="create-student"
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

'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import RevokeInviteModal from '@/components/admin/RevokeInviteModal';
import StaffSubjectsModal from '@/components/admin/StaffSubjectsModal';
import { academicsApi } from '@/lib/api/superadmin/academics';
import { QuirriRHFField, QuirriSelect, QuirriCombobox } from '@/components/superadmin/quirri-ui';
import { useQuirriTip } from '@/components/superadmin/QuirriTooltip';
import {
  Icon,
  ModulePage,
  ModuleHead,
  TabNav,
  TabPanel,
  KpiRow,
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
import { MetricList, dataColor } from '@/components/shared/data-viz';
import { analyticsApi } from '@/lib/api/analytics';
import { useTabParam, useUrlState } from '@/hooks/useUrlState';
import { usersApi } from '@/lib/api/superadmin/users';
import { departmentsApi, fetchData } from '@/lib/api/superadmin/modules';
import { unwrap, asList } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useAuth } from '@/hooks/useAuth';
import { ROLES } from '@/lib/permissions';
import { isDeactivated, isPending, statusVariant, userStatusLabel } from '@/lib/admin/userStatus';
import { tenantFacultyCreateSchema } from '@/lib/validation';
import { getApiErrorMessage } from '@/lib/api/errors';

const STAFF_ROLE_OPTIONS = [
  { value: ROLES.FACULTY, label: 'Faculty' },
  { value: ROLES.HOD, label: 'HOD' },
];

const TONE = { red: 'err', amber: 'low', green: 'good', off: 'off' };

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending activation' },
  { value: 'inactive', label: 'Deactivated' },
];

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

/** Drawer tile: date only, so the large stat value does not wrap. */
function lastActiveDate(user) {
  const value = user?.last_login_at || user?.last_active || user?.last_login;
  return value ? dateLabel(value) : 'Never';
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
    setError,
    clearErrors,
    watch,
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
  const isHod = watch('role') === ROLES.HOD;
  const deptValue = watch('department_id');

  useEffect(() => {
    if (!isHod || deptValue) clearErrors('department_id');
  }, [isHod, deptValue, clearErrors]);

  const onCreate = handleSubmit(async (values) => {
    if (!tenantId) {
      toast.error('Your college tenant is missing from this session. Sign in again.');
      return;
    }
    // An HOD heads one department, so they must be placed in it.
    if (values.role === ROLES.HOD && !values.department_id) {
      setError('department_id', { type: 'required', message: 'Choose the department this HOD will head' });
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
                  placeholder={isHod ? 'Required for an HOD — type to search' : 'Optional — type to search'}
                  options={departmentOptions}
                  emptyMessage="No active departments yet"
                  hint={isHod ? 'An HOD must belong to the department they head.' : 'Pick a department from your college structure.'}
                />
              )}
            />
          </div>
        </FormSection>
        <FormSection n={3} title="Teaching scope" sub="Optional. Assign the exact subjects they teach from the Staff list after creating the account.">
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
const TABS = ['staff', 'coverage'];
const PAGE_SIZE = 10; // quirri-b2c-student-ui: lists page at 10
const STAFF_ROLES = `${ROLES.HOD},${ROLES.FACULTY}`;

function SubjectChips({ names }) {
  if (!names?.length) return <span className="ad-muted">None yet</span>;
  // Plain text, not pills (clean pass, 20 Oct 2026): "Data Structures, Networks +2 more".
  return (
    <span className="ad-subj-text">
      {names.slice(0, 2).join(', ')}
      {names.length > 2 ? <small> +{names.length - 2} more</small> : null}
    </span>
  );
}

function StaffWorkspace() {
  const { tenantId } = useAuth();
  const { show, hide, TipLayer } = useQuirriTip();
  const [tab, setTab] = useTabParam(TABS, 'staff');
  const [url, setUrl] = useUrlState({ q: '', role: '', dept: '', status: '', page: '1' });
  const [searchInput, setSearchInput] = useState(url.q);
  const page = Math.max(1, Number(url.page) || 1);
  const [createOpen, setCreateOpen] = useState(false);
  const [acting, setActing] = useState(false);
  const [drawerUser, setDrawerUser] = useState(null);
  const [confirmUser, setConfirmUser] = useState(null);
  const [subjectsUser, setSubjectsUser] = useState(null);
  // Pending invites are cancelled, not deactivated (POST /users/{id}/revoke-invite).
  const [revokeUser, setRevokeUser] = useState(null);

  // URL → input (Back/Forward), input → URL (debounced)
  useEffect(() => { setSearchInput(url.q); }, [url.q]);
  useEffect(() => {
    if (searchInput === url.q) return undefined;
    const t = setTimeout(() => setUrl({ q: searchInput.trim(), page: '1' }), 300);
    return () => clearTimeout(t);
  }, [searchInput, url.q, setUrl]);

  const { data: subjectMapData, reload: reloadSubjectMap } = useAsyncResource(
    () => fetchData(() => academicsApi.staffSubjectMap()),
    [tenantId],
  );
  const subjectMap = subjectMapData?.items || {};

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

  // One paginated call for both roles (GET /users?role=hod,faculty) — no 50-per-role cap.
  const { data, loading, error, reload } = useAsyncResource(async () => {
    const res = await usersApi.getUsers({
      page,
      pageSize: PAGE_SIZE,
      search: url.q,
      role: url.role || STAFF_ROLES,
      status: url.status,
      departmentId: url.dept,
      tenantId: tenantId || undefined,
    });
    return unwrap(res);
  }, [url.q, url.role, url.status, url.dept, page, tenantId]);

  const staff = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return asList(data?.items || data?.users || data, []);
  }, [data]);
  const total = typeof data?.total === 'number' ? data.total : staff.length;
  const firstLoad = loading && !data;

  // College-wide counts — they do not move when the list is filtered.
  const { data: countData, reload: reloadCounts } = useAsyncResource(async () => {
    const one = (params) => usersApi.getUsers({ page: 1, pageSize: 1, tenantId: tenantId || undefined, ...params })
      .then(unwrap).then((r) => (typeof r?.total === 'number' ? r.total : 0));
    const [hod, faculty, pending] = await Promise.all([
      one({ role: ROLES.HOD }),
      one({ role: ROLES.FACULTY }),
      one({ role: STAFF_ROLES, status: 'pending' }),
    ]);
    return { hod, faculty, pending };
  }, [tenantId]);
  const reloadAll = useCallback(async () => { await Promise.all([reload(), reloadCounts()]); }, [reload, reloadCounts]);

  // Subject coverage: every subject students can reach (/analytics/college subjects[]) against
  // the staff → subject names map (/academics/staff-subjects).
  const { data: overview, loading: overviewLoading, error: overviewError } = useAsyncResource(
    () => analyticsApi.college({ range: 'last_30_days' }),
    [tenantId],
  );
  const coverage = useMemo(() => {
    if (!overview || !subjectMapData) return null;
    // Match by subject id (staff-subjects `subjects`); fall back to names on an older API.
    const byId = subjectMapData.subjects;
    const taught = byId
      ? new Set(Object.values(byId).flat().map((x) => String(x.id)))
      : new Set(Object.values(subjectMap).flat());
    const deptIdByName = new Map((overview.departments || []).map((d) => [d.department, d.department_id]));
    const byDept = new Map();
    const missing = [];
    (overview.subjects || []).forEach((s) => {
      const dept = s.department || 'No department';
      const row = byDept.get(dept) || { dept, id: deptIdByName.get(dept) || dept, total: 0, covered: 0 };
      row.total += 1;
      if (taught.has(byId ? String(s.subject_id) : s.subject)) row.covered += 1;
      else missing.push(s);
      byDept.set(dept, row);
    });
    const depts = [...byDept.values()].sort((a, b) => a.dept.localeCompare(b.dept));
    return { depts, missing, total: (overview.subjects || []).length };
  }, [overview, subjectMapData, subjectMap]);

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
      {!isDeactivated(user) ? (
        <span onMouseEnter={(e) => show(e, 'Assign subjects', 'top')} onMouseLeave={hide}>
          <IconButton icon="book" label={`Assign subjects to ${fullName(user)}`} onClick={() => setSubjectsUser(user)} />
        </span>
      ) : null}
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
        <span onMouseEnter={(e) => show(e, 'Reactivate', 'top')} onMouseLeave={hide}>
          <IconButton
            icon="refresh"
            label={`Reactivate ${fullName(user)}`}
            disabled={acting}
            onClick={() => askToggle(user)}
          />
        </span>
      ) : (
        <span onMouseEnter={(e) => show(e, 'Deactivate', 'top')} onMouseLeave={hide}>
          <IconButton
            icon="lock"
            danger
            label={`Deactivate ${fullName(user)}`}
            disabled={acting}
            onClick={() => askToggle(user)}
          />
        </span>
      )}
    </div>
  );

  const confirmDeactivating = confirmUser ? !isDeactivated(confirmUser) : false;
  const filtered = Boolean(url.q || url.status || url.role || url.dept);
  const clearFilters = () => {
    setSearchInput('');
    setUrl({ q: '', role: '', dept: '', status: '', page: '1' });
  };
  const counts = countData || {};
  const missingCount = coverage ? coverage.missing.length : null;

  return (
    <ModulePage className="ad-page">
      <ModuleHead
        actions={(
          <button type="button" className="sd-btn sd-btn--amber" onClick={() => setCreateOpen(true)}>
            <Icon name="plus" size={16} /> Add staff
          </button>
        )}
      />

      <TabNav
        label="Staff sections"
        idBase="staff-tab"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'staff', label: 'Staff', count: countData ? countLabel(counts.hod + counts.faculty) : null },
          { value: 'coverage', label: 'Subject coverage', count: missingCount ? countLabel(missingCount) : null },
        ]}
      />

      <KpiRow
        label="Staff summary"
        items={[
          { icon: 'shield', label: 'HOD', value: countData ? countLabel(counts.hod) : null, sub: 'Review and approve chapters' },
          { icon: 'user', label: 'Faculty', value: countData ? countLabel(counts.faculty) : null, sub: 'Teaching staff' },
          { icon: 'mail', label: 'Pending activation', value: countData ? countLabel(counts.pending) : null, sub: 'Invite sent, not yet used' },
          {
            icon: 'book',
            label: 'Subjects without a teacher',
            value: missingCount == null ? null : countLabel(missingCount),
            tone: missingCount ? 'focus' : undefined,
            sub: coverage ? `Of ${countLabel(coverage.total)} subject${coverage.total === 1 ? '' : 's'} students can reach` : 'Checking subjects…',
          },
        ]}
      />

      <TabPanel value="staff" current={tab} idBase="staff-tab">
        <Panel
          title="Staff directory"
          sub={firstLoad ? 'Loading…' : `${countLabel(total)} staff member${total === 1 ? '' : 's'}${filtered ? (total === 1 ? ' matches these filters' : ' match these filters') : ''}`}
          bodyClassName={null}
          toolbar={(
            <>
              <SearchBox
                placeholder="Search name or email…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <QuirriSelect
                ariaLabel="Filter by role"
                value={url.role}
                onChange={(e) => setUrl({ role: e.target.value, page: '1' })}
                placeholder="All roles"
                options={[
                  { value: ROLES.HOD, label: 'HOD' },
                  { value: ROLES.FACULTY, label: 'Faculty' },
                ]}
              />
              <QuirriSelect
                ariaLabel="Filter by department"
                value={url.dept}
                onChange={(e) => setUrl({ dept: e.target.value, page: '1' })}
                placeholder="All departments"
                options={departmentOptions}
              />
              <SegTabs label="Filter by status" options={STATUS_FILTERS} value={url.status} onChange={(v) => setUrl({ status: v, page: '1' })} />
              {filtered ? (
                <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={clearFilters}>Clear</button>
              ) : null}
            </>
          )}
        >
          {error ? (
            <div className="sp-panel-b">
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
            </div>
          ) : null}

          {firstLoad ? <div className="sp-panel-b"><SectionState title="Loading staff…" /></div> : null}

          {!loading && !error && data && !staff.length ? (
            <div className="sp-panel-b">
              <SectionState
                title={filtered ? 'No staff match these filters' : 'No staff yet'}
                action={filtered ? (
                  <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={clearFilters}>Clear filters</button>
                ) : (
                  <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setCreateOpen(true)}>
                    <Icon name="plus" size={16} /> Add the first staff member
                  </button>
                )}
              >
                {filtered ? 'Try a different name, email, role, department or status.' : 'Add faculty or an HOD to send them an activation invite.'}
              </SectionState>
            </div>
          ) : null}

          {staff.length ? (
            <div className="sp-table-wrap">
              <table className="sp-table un-table ad-stack">
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Subjects</th>
                    <th>Status</th>
                    <th>Last active</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {staff.map((user) => {
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
                        <td data-label="Department" className="ad-nowrap">{user.department_name || user.department || '—'}</td>
                        <td data-label="Subjects"><SubjectChips names={subjectMap[user.id]} /></td>
                        <td data-label="Status">
                          <StatusPill active on={userStatusLabel(user)} tone={TONE[statusVariant(user)]} />
                        </td>
                        <td data-label="Last active" className="ad-nowrap">{lastActiveDate(user)}</td>
                        <td><RowActions user={user} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
          <Pager page={page} pageSize={PAGE_SIZE} total={total} shown={staff.length} onPage={(p) => setUrl({ page: String(p) }, { push: true })} noun="staff" />
        </Panel>
      </TabPanel>

      <TabPanel value="coverage" current={tab} idBase="staff-tab">
        {overviewError ? (
          <SectionState tone="err" title="Could not load subjects">
            {overviewError?.message || 'Refresh the page to try again.'}
          </SectionState>
        ) : null}
        <div className="dv-grid ad-cover-grid">
          <Panel title="Subjects with a teacher" sub="Share of each department's subjects that have at least one staff member">
            {coverage ? (
              <MetricList
                label="Subjects with a teacher by department"
                suffix="%"
                items={coverage.depts.map((d) => ({
                  key: String(d.id),
                  label: d.dept,
                  value: d.total ? Math.round((100 * d.covered) / d.total) : 0,
                  sub: `${countLabel(d.covered)} of ${countLabel(d.total)}`,
                }))}
                empty="No subjects yet. Add them under Academic structure › Programmes & subjects."
              />
            ) : <p className="dv-empty">{overviewLoading ? 'Loading…' : 'No data yet.'}</p>}
          </Panel>
          <Panel
            title="Subjects without a teacher"
            sub="On the Staff tab, use Assign subjects on a staff member's row or record"
            bodyClassName={null}
          >
            {!coverage ? (
              <div className="sp-panel-b"><p className="dv-empty">{overviewLoading ? 'Loading…' : 'No data yet.'}</p></div>
            ) : coverage.missing.length ? (
              <ul className="ad-uncovered">
                {coverage.missing.map((s) => (
                  <li key={s.subject_id}>
                    <i className="dv-dot" style={{ background: dataColor(s.subject_id) }} aria-hidden="true" />
                    <div>
                      <b>{s.subject}</b>
                      <small>{[s.code, s.department].filter(Boolean).join(' · ')}</small>
                    </div>
                    <span className="ad-not-assigned">Not assigned</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="sp-panel-b">
                <div className="ad-empty">
                  <span className="ad-empty-ic" aria-hidden="true"><Icon name="tick" size={20} /></span>
                  <div>
                    <b>{coverage.total ? 'Every subject has a teacher' : 'No subjects yet'}</b>
                    <small>{coverage.total ? 'New subjects appear here until someone is assigned.' : 'Subjects you add under Academic structure appear here.'}</small>
                  </div>
                </div>
              </div>
            )}
          </Panel>
        </div>
      </TabPanel>

      <DetailDrawer
        open={Boolean(drawerUser)}
        onClose={closeDrawer}
        eyebrow={drawerUser ? roleLabel(drawerUser) : 'Staff'}
        title={drawerUser ? fullName(drawerUser) : ''}
        mono={drawerUser ? fullName(drawerUser) : null}
        pills={drawerUser ? (
          <StatusPill active on={userStatusLabel(drawerUser)} tone={TONE[statusVariant(drawerUser)]} />
        ) : null}
        stats={drawerUser ? [
          { label: 'Subjects', value: countLabel(subjectMap[drawerUser.id]?.length || 0) },
          { label: 'Last active', value: lastActiveDate(drawerUser) },
        ] : null}
        footer={drawerUser ? (
          <>
            <button
              type="button"
              className={`sd-btn sd-btn--sm ${isDeactivated(drawerUser) ? 'sd-btn--outline' : 'sd-btn--danger'}`}
              disabled={acting}
              onClick={() => (isPending(drawerUser)
                ? setRevokeUser(drawerUser)
                : askToggle(drawerUser))}
            >
              {isDeactivated(drawerUser) ? 'Reactivate' : isPending(drawerUser) ? 'Cancel invite' : 'Deactivate'}
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
            <DrawerSection
              title="Subjects taught"
              action={!isDeactivated(drawerUser) ? (
                <button type="button" className="sd-btn sd-btn--outline sd-btn--sm" onClick={() => setSubjectsUser(drawerUser)}>
                  <Icon name="book" size={16} /> Assign subjects
                </button>
              ) : null}
            >
              {subjectMap[drawerUser.id]?.length ? (
                <ul className="ad-chip-list">
                  {subjectMap[drawerUser.id].map((name) => (
                    <li key={name} className="sp-pill ad-subj-pill">
                      <i style={{ background: dataColor(name) }} aria-hidden="true" />
                      {name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ad-muted">No subjects assigned yet.</p>
              )}
            </DrawerSection>
          </>
        ) : null}
      </DetailDrawer>

      {revokeUser ? (
        <RevokeInviteModal
          user={revokeUser}
          name={fullName(revokeUser)}
          onClose={() => setRevokeUser(null)}
          onDone={async () => { setRevokeUser(null); setDrawerUser(null); await reloadAll(); }}
        />
      ) : null}

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

      {subjectsUser ? (
        <StaffSubjectsModal
          key={subjectsUser.id}
          staff={{ ...subjectsUser, name: fullName(subjectsUser) }}
          onClose={() => setSubjectsUser(null)}
          onSaved={async () => { setSubjectsUser(null); await reloadSubjectMap(); }}
        />
      ) : null}

      {createOpen ? (
        <CreateFacultyModal
          key="create-staff"
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

export default function StaffPage() {
  return (
    <Suspense fallback={<SectionState title="Loading staff…" />}>
      <StaffWorkspace />
    </Suspense>
  );
}

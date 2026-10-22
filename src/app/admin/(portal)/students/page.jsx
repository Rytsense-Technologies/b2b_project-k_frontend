'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import RevokeInviteModal from '@/components/admin/RevokeInviteModal';
import StudentPlacementFields from '@/components/shared/StudentPlacementFields';
import StudentPlacementModal from '@/components/shared/StudentPlacementModal';
import StudentBulkImport from '@/components/admin/StudentBulkImport';
import { QuirriRHFField, QuirriCombobox, QuirriSelect } from '@/components/superadmin/quirri-ui';
import { useQuirriTip } from '@/components/superadmin/QuirriTooltip';
import {
  Icon,
  ModulePage,
  ModuleHead,
  TabNav,
  TabPanel,
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
import { ModernDonut } from '@/components/shared/data-viz';
import { useTabParam, useUrlState } from '@/hooks/useUrlState';
import { usersApi } from '@/lib/api/superadmin/users';
import { departmentsApi, fetchData } from '@/lib/api/superadmin/modules';
import { unwrap, asList } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { academicsApi } from '@/lib/api/superadmin/academics';
import { useAuth } from '@/hooks/useAuth';
import { ROLES } from '@/lib/permissions';
import { isDeactivated, isPending, statusVariant, userStatusLabel } from '@/lib/admin/userStatus';
import { studentDepartmentChangeSchema, tenantStudentCreateSchema } from '@/lib/validation';
import { getApiErrorMessage } from '@/lib/api/errors';

const TONE = { red: 'err', amber: 'low', green: 'good', off: 'off' };

// Pending invites have their own tab; the directory filters by Active / Deactivated.
const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
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
  const value = user?.last_login_at || user?.last_active || user?.last_login;
  if (!value) return 'Never';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Never';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
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
            {`Lecture progress, chapter assessments, and tutor chats from ${currentName || 'the previous department'} are removed.`}
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

/**
 * Yearly rollover (POST /users/bulk-promote-year): preview first (dry_run), then an explicit
 * confirm. The server promotes every active student of this college by one year, capped at
 * each student's own programme length.
 */
function PromoteYearModal({ open, onClose, onDone }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let live = true;
    setPreview(null);
    setError('');
    setBusy(true);
    usersApi.bulkPromoteYear({ dryRun: true })
      .then((res) => { if (live) setPreview(unwrap(res)); })
      .catch((err) => { if (live) setError(getApiErrorMessage(err, 'Could not prepare the preview.')); })
      .finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, [open]);

  const confirm = async () => {
    setBusy(true);
    try {
      const res = unwrap(await usersApi.bulkPromoteYear({ dryRun: false }));
      toast.success(`${countLabel(res?.promoted_count ?? 0)} student${res?.promoted_count === 1 ? '' : 's'} moved to the next year`);
      await onDone();
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not promote students'));
    } finally {
      setBusy(false);
    }
  };

  const promoted = preview?.promoted_count ?? 0;
  return (
    <QuirriModal
      open={open}
      onClose={() => { if (!busy) onClose(); }}
      title="Promote students to the next year?"
      crumb="Every active student in your college · once per academic year"
      footer={(
        <>
          <button type="button" className="sd-btn sd-btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <div className="right">
            <button type="button" className="sd-btn sd-btn--teal" onClick={confirm} disabled={busy || !preview || !promoted}>
              {busy && preview ? 'Promoting…' : promoted ? `Promote ${countLabel(promoted)} student${promoted === 1 ? '' : 's'}` : 'Promote'}
            </button>
          </div>
        </>
      )}
    >
      <div className="un-form">
        {error ? <ConfirmNote danger title="Preview failed">{error}</ConfirmNote> : null}
        {!preview && !error ? <SectionState title="Checking every student…" /> : null}
        {preview ? (
          <>
            <ConfirmNote title="Nothing has changed yet.">
              This is a preview. Each student moves up one year, never past their own programme length.
            </ConfirmNote>
            <div className="ad-promote-sum">
              <div><b>{countLabel(preview.promoted_count)}</b><small>Move to the next year</small></div>
              <div><b>{countLabel(preview.already_final_year_count)}</b><small>Already in final year (left as is)</small></div>
              <div className={preview.skipped_missing_data_count ? 'is-focus' : ''}>
                <b>{countLabel(preview.skipped_missing_data_count)}</b><small>Skipped: year or programme length not set</small>
              </div>
            </div>
            {preview.skipped_missing_data_count ? (
              <p className="ad-muted">
                Set the programme (or year and length) for skipped students from their record, then run this again.
                {` ${(preview.skipped_missing_data || []).slice(0, 3).map((s) => s.email).filter(Boolean).join(', ')}`}
                {preview.skipped_missing_data_count > 3 ? '…' : ''}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </QuirriModal>
  );
}

/* ---------------------------------------------------------------- page */
const TABS = ['all', 'pending', 'import'];
const PAGE_SIZE = 10; // quirri-b2c-student-ui: lists page at 10
const YEAR_OPTIONS = [1, 2, 3, 4, 5].map((y) => ({ value: String(y), label: `Year ${y}` }));
// Raw hex: the donut ring is SVG (CSS variables do not resolve in its stroke attribute).
const STATUS_HEX = { active: '#5CB414', pending: '#F5821F', inactive: '#BCC1C3' };

function StudentsWorkspace() {
  const { tenantId } = useAuth();
  const { show, hide, TipLayer } = useQuirriTip();
  const [tab, setTab] = useTabParam(TABS, 'all');
  const [url, setUrl] = useUrlState({ q: '', dept: '', prog: '', sem: '', year: '', status: '', page: '1' });
  const [searchInput, setSearchInput] = useState(url.q);
  const page = Math.max(1, Number(url.page) || 1);
  const [createOpen, setCreateOpen] = useState(false);
  const [acting, setActing] = useState(false);
  const [drawerUser, setDrawerUser] = useState(null);
  const [confirmUser, setConfirmUser] = useState(null);
  const [deptUser, setDeptUser] = useState(null);
  const [placementUser, setPlacementUser] = useState(null);
  // Pending invites are cancelled, not deactivated (POST /users/{id}/revoke-invite).
  const [revokeUser, setRevokeUser] = useState(null);
  const [promoteOpen, setPromoteOpen] = useState(false);

  // URL → input (Back/Forward), input → URL (debounced)
  useEffect(() => { setSearchInput(url.q); }, [url.q]);
  useEffect(() => {
    if (searchInput === url.q) return undefined;
    const t = setTimeout(() => setUrl({ q: searchInput.trim(), page: '1' }), 300);
    return () => clearTimeout(t);
  }, [searchInput, url.q, setUrl]);

  const { data: deptData } = useAsyncResource(
    () => fetchData(() => departmentsApi.list({ is_active: true, page: 1, pageSize: 100 })),
    [tenantId],
  );
  const departments = useMemo(() => asList(deptData, []), [deptData]);
  const departmentOptions = useMemo(
    () => departments.map((d) => ({
      value: d.id,
      label: d.code ? `${d.name} (${d.code})` : d.name,
    })),
    [departments],
  );

  // Programme -> semester filter options, scoped to the chosen department (academics API).
  const { data: programData } = useAsyncResource(
    () => fetchData(() => academicsApi.listPrograms(url.dept ? { department_id: url.dept } : {})),
    [tenantId, url.dept],
  );
  const programOptions = useMemo(
    () => asList(programData, []).filter((p) => p.is_active !== false).map((p) => ({ value: p.id, label: p.code ? `${p.name} (${p.code})` : p.name })),
    [programData],
  );
  const { data: programDetail } = useAsyncResource(
    () => (url.prog ? fetchData(() => academicsApi.getProgram(url.prog)) : Promise.resolve(null)),
    [url.prog],
  );
  const semesterOptions = useMemo(
    () => (programDetail?.semesters || []).filter((x) => x.is_active !== false).map((x) => ({ value: x.id, label: x.name })),
    [programDetail],
  );

  // The list for the open tab: All (optionally Active / Deactivated) or Pending invites.
  const listStatus = tab === 'pending' ? 'pending' : url.status;
  const { data, loading, error, reload } = useAsyncResource(async () => {
    if (tab === 'import') return null;
    const res = await usersApi.getUsers({
      page,
      pageSize: PAGE_SIZE,
      search: url.q,
      role: ROLES.STUDENT,
      status: listStatus,
      departmentId: url.dept,
      programId: tab === 'all' ? url.prog : '',
      semesterId: tab === 'all' ? url.sem : '',
      yearOfStudy: tab === 'all' ? url.year : '',
      tenantId: tenantId || undefined,
    });
    return unwrap(res);
  }, [tab, url.q, listStatus, url.dept, url.prog, url.sem, url.year, tenantId, page]);

  // Status counts for the whole college (not just this page) — tab counts + status split.
  const { data: countData, reload: reloadCounts } = useAsyncResource(async () => {
    const one = (s) => usersApi.getUsers({ page: 1, pageSize: 1, role: ROLES.STUDENT, status: s, tenantId: tenantId || undefined })
      .then(unwrap).then((r) => (typeof r?.total === 'number' ? r.total : 0));
    const [active, pending, inactive] = await Promise.all([one('active'), one('pending'), one('inactive')]);
    return { active, pending, inactive };
  }, [tenantId]);
  const reloadAll = useCallback(async () => { await Promise.all([reload(), reloadCounts()]); }, [reload, reloadCounts]);

  const students = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return asList(data?.users || data, []);
  }, [data]);

  const total = typeof data?.total === 'number' ? data.total : students.length;
  const counts = countData || { active: null, pending: null, inactive: null };
  const everyone = countData ? counts.active + counts.pending + counts.inactive : null;
  const firstLoad = loading && !data;

  // Top 5 active departments + "Other departments" so the ring always adds up to every student placed.
  const deptBars = useMemo(() => {
    const rows = departments
      .map((d) => ({ key: String(d.id), label: d.name, value: Number(d.student_count) || 0 }))
      .sort((a, b) => b.value - a.value);
    if (rows.length <= 6) return rows;
    const rest = rows.slice(5).reduce((a, r) => a + r.value, 0);
    return [...rows.slice(0, 5), { key: 'other', label: `Other departments (${rows.length - 5})`, value: rest, tone: 'neutral' }];
  }, [departments]);
  const placed = deptBars.reduce((a, r) => a + r.value, 0);
  // department student_count includes every account state; students in an inactive department
  // (or not placed in one yet) are in the Account status total but not here - say so.
  const unplaced = everyone != null && deptData ? Math.max(0, everyone - placed) : 0;

  const changeTab = (v) => {
    setTab(v);
    if (v === 'pending' && url.status) setUrl({ status: '', page: '1' });
  };

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
  const filtered = Boolean(url.q || url.dept || (tab === 'all' && (url.status || url.prog || url.sem || url.year)));
  const clearFilters = () => {
    setSearchInput('');
    setUrl({ q: '', dept: '', prog: '', sem: '', year: '', status: '', page: '1' });
    // Clear unmounts itself: move focus to the search box instead of letting it fall to BODY.
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => document.querySelector('.pm-panel-tools input')?.focus());
    }
  };

  const toolbar = (
    <>
      <SearchBox
        placeholder="Search name or email…"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
      />
      <QuirriSelect
        ariaLabel="Filter by department"
        value={url.dept}
        onChange={(e) => setUrl({ dept: e.target.value, prog: '', sem: '', page: '1' })}
        placeholder="All departments"
        options={departmentOptions}
      />
      {tab === 'all' ? (
        <>
          <QuirriSelect
            ariaLabel="Filter by programme"
            value={url.prog}
            onChange={(e) => setUrl({ prog: e.target.value, sem: '', page: '1' })}
            placeholder={programOptions.length ? 'All programmes' : 'No programmes'}
            options={programOptions}
          />
          <QuirriSelect
            ariaLabel="Filter by semester"
            value={url.sem}
            onChange={(e) => setUrl({ sem: e.target.value, page: '1' })}
            placeholder={url.prog ? 'All semesters' : 'Pick a programme first'}
            options={semesterOptions}
            disabled={!url.prog}
          />
          <QuirriSelect
            ariaLabel="Filter by year of study"
            value={url.year}
            onChange={(e) => setUrl({ year: e.target.value, page: '1' })}
            placeholder="All years"
            options={YEAR_OPTIONS}
          />
        </>
      ) : null}
      {tab === 'all' ? (
        <SegTabs
          label="Filter by status"
          options={STATUS_FILTERS}
          value={url.status}
          onChange={(v) => setUrl({ status: v, page: '1' })}
        />
      ) : null}
      {filtered ? (
        <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={clearFilters}>Clear</button>
      ) : null}
    </>
  );

  const listState = (
    <>
      {error ? (
        <div className="sp-panel-b">
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
        </div>
      ) : null}
      {firstLoad ? <div className="sp-panel-b"><SectionState title="Loading students…" /></div> : null}
      {!loading && !error && data && !students.length ? (
        <div className="sp-panel-b">
          {tab === 'pending' ? (
            <SectionState title={filtered ? 'No pending invites match these filters' : 'No pending invites'}>
              {filtered ? 'Try another name, email or department.' : 'Everyone you invited has activated their account.'}
            </SectionState>
          ) : (
            <SectionState
              title={filtered ? 'No students match these filters' : 'No students yet'}
              action={filtered ? (
                <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={clearFilters}>Clear filters</button>
              ) : (
                <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setCreateOpen(true)}>
                  <Icon name="plus" size={16} /> Add the first student
                </button>
              )}
            >
              {filtered ? 'Try a different name, email, department, programme, year or status.' : 'Add a student, or import a CSV, to send activation invites.'}
            </SectionState>
          )}
        </div>
      ) : null}
    </>
  );

  return (
    <ModulePage className="ad-page">
      <ModuleHead
        actions={tab !== 'import' ? (
          <>
            <button type="button" className="sd-btn sd-btn--outline" onClick={() => setPromoteOpen(true)}>
              <Icon name="trend" size={16} /> Promote to next year
            </button>
            <button type="button" className="sd-btn sd-btn--amber" onClick={() => setCreateOpen(true)}>
              <Icon name="plus" size={16} /> Add student
            </button>
          </>
        ) : null}
      />

      <TabNav
        label="Students sections"
        idBase="students-tab"
        value={tab}
        onChange={changeTab}
        tabs={[
          { value: 'all', label: 'All students', count: everyone == null ? null : countLabel(everyone) },
          { value: 'pending', label: 'Pending invites', count: counts.pending == null ? null : countLabel(counts.pending) },
          { value: 'import', label: 'Bulk import' },
        ]}
      />

      <TabPanel value="all" current={tab} idBase="students-tab">
        <div className="dv-grid ad-viz-row">
          <Panel
            title="Account status"
            sub="Every student in your college"
            className="mdc-card"
            action={countData ? (
              <div className="mdc-chip">
                <small>Total students</small>
                <b>{countLabel((counts.active || 0) + (counts.pending || 0) + (counts.inactive || 0))}</b>
              </div>
            ) : null}
          >
            {countData ? (
              <ModernDonut
                title="Account status"
                unit="Students"
                parts={[
                  { key: 'active', label: 'Active', value: counts.active, color: STATUS_HEX.active },
                  { key: 'pending', label: 'Pending invite', value: counts.pending, color: STATUS_HEX.pending },
                  { key: 'inactive', label: 'Deactivated', value: counts.inactive, color: STATUS_HEX.inactive },
                ]}
                empty="No students yet."
              />
            ) : <p className="dv-empty">Loading…</p>}
          </Panel>
          <Panel
            title="Students by department"
            sub="Placed in each active department"
            className="mdc-card"
            action={deptData ? (
              <div className="mdc-chip">
                <small>Total placed</small>
                <b>{countLabel(placed)}</b>
              </div>
            ) : null}
          >
            {deptData ? (
              <ModernDonut
                title="Students by department"
                unit="Students"
                parts={deptBars}
                link={{ href: '/admin/structure/departments', label: 'View departments' }}
                note={unplaced ? `${countLabel(unplaced)} of ${countLabel(everyone)} student${everyone === 1 ? '' : 's'} ${unplaced === 1 ? 'is' : 'are'} in an inactive department or not placed in one yet, so ${unplaced === 1 ? 'is' : 'are'} not counted here.` : undefined}
                empty="No departments yet. Create one under Academic structure."
              />
            ) : <p className="dv-empty">Loading…</p>}
          </Panel>
        </div>

        <Panel
          title="Student directory"
          sub={firstLoad ? 'Loading…' : `${countLabel(total)} student${total === 1 ? '' : 's'}${filtered ? (total === 1 ? ' matches these filters' : ' match these filters') : ''}`}
          bodyClassName={null}
          toolbar={toolbar}
        >
          {listState}
          {students.length ? (
            <div className="sp-table-wrap">
              <table className="sp-table un-table ad-stack">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Department</th>
                    <th>Programme</th>
                    <th className="num">Year</th>
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
                        <td data-label="Department">{user.department_name || user.department || <span className="ad-muted">Not placed</span>}</td>
                        <td data-label="Programme">
                          {user.program_name ? (
                            <span className="ad-cell-2">
                              <span>{user.program_name}</span>
                              <small>{user.semester_name || 'Semester not set'}</small>
                            </span>
                          ) : <span className="ad-muted">Not set</span>}
                        </td>
                        <td data-label="Year" className="num">{user.year_of_study ? countLabel(user.year_of_study) : '—'}</td>
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
          ) : null}
          <Pager page={page} pageSize={PAGE_SIZE} total={total} shown={students.length} onPage={(p) => setUrl({ page: String(p) }, { push: true })} noun="students" />
        </Panel>
      </TabPanel>

      <TabPanel value="pending" current={tab} idBase="students-tab">
        <Panel
          title="Pending invites"
          sub="Students who have not set a password yet. Resend the link, or cancel an invite sent by mistake."
          bodyClassName={null}
          toolbar={toolbar}
        >
          {listState}
          {students.length ? (
            <div className="sp-table-wrap">
              <table className="sp-table un-table ad-stack">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Department</th>
                    <th>Invited on</th>
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
                        <td data-label="Department">{user.department_name || user.department || <span className="ad-muted">Not placed</span>}</td>
                        <td data-label="Invited on">{user.created_at ? dateLabel(user.created_at) : '—'}</td>
                        <td>
                          <div className="un-actions">
                            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" disabled={acting} onClick={() => handleResend(user)}>
                              <Icon name="send" size={14} /> Resend
                            </button>
                            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setRevokeUser(user)}>
                              Cancel invite
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
          <Pager page={page} pageSize={PAGE_SIZE} total={total} shown={students.length} onPage={(p) => setUrl({ page: String(p) }, { push: true })} noun="invites" />
        </Panel>
      </TabPanel>

      <TabPanel value="import" current={tab} idBase="students-tab">
        <StudentBulkImport
          inline
          onImported={reloadAll}
          sampleDepartment={departmentOptions[0]?.label?.replace(/ \(.*\)$/, '')}
        />
      </TabPanel>

      <DetailDrawer
        open={Boolean(drawerUser)}
        onClose={closeDrawer}
        eyebrow="Student"
        title={drawerUser ? fullName(drawerUser) : ''}
        mono={drawerUser ? fullName(drawerUser) : null}
        pills={drawerUser ? (
          <StatusPill active on={userStatusLabel(drawerUser)} tone={TONE[statusVariant(drawerUser)]} />
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
      <PromoteYearModal open={promoteOpen} onClose={() => setPromoteOpen(false)} onDone={reloadAll} />
      <TipLayer />
    </ModulePage>
  );
}

export default function StudentsPage() {
  return (
    <Suspense fallback={<SectionState title="Loading students…" />}>
      <StudentsWorkspace />
    </Suspense>
  );
}

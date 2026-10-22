'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import {
  QuirriRHFField,
  QuirriSelect,
  QuirriCombobox,
} from '@/components/superadmin/quirri-ui';
import {
  ModulePage,
  ModuleHead,
  HeadChip,
  KpiRow,
  SegTabs,
  Panel,
  StatusPill,
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
import { collegesApi, departmentsApi, fetchData } from '@/lib/api/superadmin/modules';
import { usersApi } from '@/lib/api/superadmin/users';
import { asList, unwrap, apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { collegeOptionLabel } from '@/lib/superadmin/format';
import { departmentCreateSchema, departmentUpdateSchema } from '@/lib/validation';
import { ROLES } from '@/lib/permissions';
import { MetricList, ModernDonut, dataColor } from '@/components/shared/data-viz';
import { useUrlState } from '@/hooks/useUrlState';
import {
  useDebouncedUrlSearch, ACTIVE_FILTERS, activeParam, pageParam, totalOf,
} from '@/lib/superadmin/listState';

const EMPTY_FORM = {
  college_id: '',
  name: '',
  code: '',
  hod_user_id: '',
};

const PAGE_SIZE = 10;

function isActiveDept(dept) {
  return dept?.is_active !== false;
}

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).replace('Sept', 'Sep');
}

function personLabel(user) {
  const name = user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(' ');
  if (name && user?.email) return `${name} (${user.email})`;
  return name || user?.email || '—';
}

async function loadHodOptions(collegeId) {
  if (!collegeId) return [];
  const [facultyRes, hodRes] = await Promise.all([
    usersApi.getUsers({
      page: 1,
      pageSize: 100,
      role: ROLES.FACULTY,
      tenantId: collegeId,
      is_active: true,
    }),
    usersApi.getUsers({
      page: 1,
      pageSize: 100,
      role: ROLES.HOD,
      tenantId: collegeId,
      is_active: true,
    }),
  ]);
  const faculty = asList(unwrap(facultyRes)?.items || unwrap(facultyRes), []);
  const hods = asList(unwrap(hodRes)?.items || unwrap(hodRes), []);
  const byId = new Map();
  [...faculty, ...hods].forEach((u) => {
    if (u?.id) byId.set(u.id, u);
  });
  return [...byId.values()].map((u) => ({ value: u.id, label: personLabel(u) }));
}

/* ------------------------------------------------------------------ form */
function DepartmentFormModal({
  open,
  editingId,
  initialValues,
  colleges,
  onClose,
  onSaved,
}) {
  const schema = editingId ? departmentUpdateSchema : departmentCreateSchema;
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialValues || EMPTY_FORM,
    mode: 'onBlur',
  });
  const [saving, setSaving] = useState(false);
  const [hodOptions, setHodOptions] = useState([]);
  const [hodLoading, setHodLoading] = useState(false);
  const collegeId = watch('college_id');

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!collegeId) {
        setHodOptions([]);
        return;
      }
      setHodLoading(true);
      try {
        const opts = await loadHodOptions(collegeId);
        if (!cancelled) setHodOptions(opts);
      } catch {
        if (!cancelled) setHodOptions([]);
      } finally {
        if (!cancelled) setHodLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [collegeId]);

  const onSave = handleSubmit(async (values) => {
    setSaving(true);
    try {
      const hod = values.hod_user_id || null;
      const code = values.code || undefined;
      if (editingId) {
        await departmentsApi.update(editingId, {
          name: values.name,
          code: code || null,
          hod_user_id: hod,
        });
      } else {
        await departmentsApi.create({
          college_id: values.college_id,
          name: values.name,
          code,
          hod_user_id: hod || undefined,
        });
      }
      toast.success(editingId ? 'Department updated' : 'Department created');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to save department'));
    } finally {
      setSaving(false);
    }
  });

  return (
    <QuirriModal
      open={open}
      onClose={onClose}
      title={editingId ? 'Edit department' : 'New department'}
      crumb="A department belongs to one college"
      wide
      footer={(
        <>
          <button type="button" className="sd-btn sd-btn--ghost" onClick={onClose}>Cancel</button>
          <div className="right">
            <button type="button" className="sd-btn sd-btn--amber" onClick={onSave} disabled={saving}>
              <Icon name="tick" size={16} />
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create department'}
            </button>
          </div>
        </>
      )}
    >
      <form onSubmit={onSave} noValidate className="un-form sa-form">
        <FormSection n={1} title="College" sub={editingId ? 'A department cannot move to another college.' : 'Pick the college this department belongs to.'}>
          <Controller
            control={control}
            name="college_id"
            render={({ field, fieldState }) => (
              <QuirriSelect
                id="dept-college"
                label="College"
                value={field.value}
                onChange={(e) => {
                  field.onChange(e);
                  setValue('hod_user_id', '');
                }}
                onBlur={field.onBlur}
                name={field.name}
                error={fieldState.error?.message}
                disabled={Boolean(editingId)}
                placeholder="Select a college"
                options={colleges.map((c) => ({ value: c.id, label: collegeOptionLabel(c, colleges) }))}
              />
            )}
          />
        </FormSection>

        <FormSection n={2} title="Identity" sub="Name students and staff will see, and an optional short code.">
          <div className="grid2">
            <QuirriRHFField
              control={control}
              name="name"
              fieldType="academicLabel"
              label="Department name"
              placeholder="e.g. Computer Science"
            />
            <QuirriRHFField
              control={control}
              name="code"
              fieldType="code"
              label="Department code"
              placeholder="Optional"
              hint="Letters, numbers, underscore, or hyphen."
            />
          </div>
        </FormSection>

        <FormSection n={3} title="Head of department" sub="Optional. Choose from active faculty and HODs of the selected college.">
          <Controller
            control={control}
            name="hod_user_id"
            render={({ field, fieldState }) => (
              <QuirriCombobox
                id="dept-hod"
                label="HOD"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                error={fieldState.error?.message}
                disabled={!collegeId || hodLoading}
                placeholder={hodLoading ? 'Loading staff…' : 'Optional — type to search'}
                options={hodOptions}
                emptyMessage={collegeId ? 'No faculty or HOD for this college' : 'Select a college first'}
                full
              />
            )}
          />
        </FormSection>

        {Object.keys(errors).length > 0 ? (
          <div className="hint field-error" role="alert">
            Check the highlighted fields and try again.
          </div>
        ) : null}
        {editingId ? (
          <div className="un-form-note">
            <Icon name="info" size={16} />
            To stop or restart this department, use Deactivate or Reactivate in the list. Nothing is deleted.
          </div>
        ) : null}
      </form>
    </QuirriModal>
  );
}

/* ------------------------------------------------------ deactivate confirm */
function StatusConfirm({ row, busy, onCancel, onConfirm }) {
  if (!row) return null;
  const deactivating = isActiveDept(row);
  return (
    <QuirriModal
      open
      onClose={onCancel}
      title={deactivating ? 'Deactivate department?' : 'Reactivate department?'}
      crumb={[row.name, row.code].filter(Boolean).join(' · ')}
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
        title={deactivating ? 'Nothing is deleted.' : 'The department becomes active again.'}
      >
        {deactivating
          ? `${row.name} is hidden from active lists. Its records are kept and you can reactivate it at any time.`
          : `${row.name} will appear in active lists and can enrol students again.`}
      </ConfirmNote>
    </QuirriModal>
  );
}

/* -------------------------------------------------------------- drawer */
function DepartmentDrawer({ row, onClose, onEdit, onToggle }) {
  if (!row) return null;
  const active = isActiveDept(row);
  return (
    <DetailDrawer
      open
      onClose={onClose}
      eyebrow="Department"
      title={row.name}
      mono={row.name}
      pills={(
        <>
          {row.code ? <span className="sp-pill sp-pill--glass">{row.code}</span> : null}
          <span className={`sp-pill ${active ? 'sp-pill--good' : 'sp-pill--off'}`}>
            {active ? 'Active' : 'Inactive'}
          </span>
        </>
      )}
      stats={[
        { label: 'Students', value: countLabel(row.student_count ?? 0) },
        { label: 'HOD', value: row.hod_name ? 'Assigned' : 'Not set' },
      ]}
      footer={(
        <>
          <button type="button" className={`sd-btn sd-btn--sm ${active ? 'sd-btn--danger' : 'sd-btn--outline'}`} onClick={() => onToggle(row)}>
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
          <button type="button" className="sd-btn sd-btn--teal sd-btn--sm" onClick={() => onEdit(row)}>
            <Icon name="edit" size={16} /> Edit department
          </button>
        </>
      )}
    >
      <DrawerSection title="Details">
        <InfoList
          items={[
            { label: 'College', value: row.college_name, full: true },
            { label: 'Department code', value: row.code },
            { label: 'Status', value: active ? 'Active' : 'Inactive' },
            { label: 'Created', value: formatDate(row.created_at) },
            { label: 'Students', value: countLabel(row.student_count ?? 0) },
          ]}
        />
      </DrawerSection>

      <DrawerSection title="Head of department">
        {row.hod_name ? (
          <div className="pm-person">
            <span className="pm-av">{initials(row.hod_name)}</span>
            <div>
              <b>{row.hod_name}</b>
              <small>HOD · {row.college_name || 'College not set'}</small>
            </div>
          </div>
        ) : (
          <SectionState title="No HOD assigned">
            Edit the department to choose one from this college&apos;s faculty.
          </SectionState>
        )}
      </DrawerSection>
    </DetailDrawer>
  );
}

/* ---------------------------------------------------------------- page */
const HOD_FILTERS = [
  { value: '', label: 'Any HOD' },
  { value: 'none', label: 'No HOD' },
];

function DepartmentsView() {
  const [url, setUrl] = useUrlState({ q: '', college: '', status: 'all', hod: '', page: '1' });
  const page = pageParam(url.page);
  const noHod = url.hod === 'none';
  const [search, setSearch] = useDebouncedUrlSearch(url.q, (q) => setUrl({ q, page: '1' }));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formDefaults, setFormDefaults] = useState(EMPTY_FORM);
  const [togglingId, setTogglingId] = useState(null);
  const [forceTarget, setForceTarget] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);
  const [drawerRow, setDrawerRow] = useState(null);

  // All colleges, inactive ones too (marked), so their departments can still be found.
  const { data: collegeData } = useAsyncResource(
    () => fetchData(() => collegesApi.list({ page: 1, page_size: 100 })),
    [],
  );
  const colleges = useMemo(() => asList(collegeData, []), [collegeData]);
  const activeColleges = useMemo(() => colleges.filter((c) => c.is_active !== false), [colleges]);

  const listParams = useMemo(() => ({
    q: url.q || undefined,
    college_id: url.college || undefined,
    is_active: activeParam(url.status),
    page,
    pageSize: PAGE_SIZE,
  }), [url.q, url.status, url.college, page]);

  const { data, loading, error, reload } = useAsyncResource(
    () => fetchData(() => departmentsApi.list(listParams)),
    [listParams],
  );

  /* Summary over every department (max page size 100) of the chosen college, or the platform. */
  const { data: allData, reload: reloadAll } = useAsyncResource(
    () => fetchData(() => departmentsApi.list({ college_id: url.college || undefined, page: 1, pageSize: 100 })),
    [url.college],
  );
  const all = useMemo(() => asList(allData, []), [allData]);
  const allTotal = totalOf(allData, all);
  const activeAll = all.filter(isActiveDept);
  const withoutHod = activeAll.filter((d) => !(d.hod_name || d.hod_user_id)).length;
  const enrolled = activeAll.reduce((acc, d) => acc + (Number(d.student_count) || 0), 0);
  const collegeName = url.college ? colleges.find((c) => String(c.id) === url.college)?.name : null;
  const partial = allData && all.length < allTotal;
  const scope = partial
    ? `First ${countLabel(all.length)} of ${countLabel(allTotal)}`
    : collegeName ? `In ${collegeName}` : 'Across all colleges';

  const pageRows = useMemo(() => asList(data, []), [data]);
  // "No HOD" is a client filter over the loaded page (the API has no HOD filter).
  const departments = useMemo(
    () => (noHod ? pageRows.filter((d) => !(d.hod_name || d.hod_user_id)) : pageRows),
    [pageRows, noHod],
  );
  const total = totalOf(data, pageRows);
  const filtersOn = Boolean(url.q || url.college || url.status !== 'all' || noHod);
  const shownCount = noHod ? departments.length : total;

  const refreshAll = () => {
    reload();
    reloadAll().catch(() => {});
  };

  const openCreate = () => {
    setEditingId(null);
    setFormDefaults({ ...EMPTY_FORM, college_id: url.college || '' });
    setModalOpen(true);
  };

  const openEdit = (dept) => {
    setDrawerRow(null);
    setEditingId(dept.id);
    setFormDefaults({
      college_id: dept.college_id ? String(dept.college_id) : '',
      name: dept.name ?? '',
      code: dept.code ?? '',
      hod_user_id: dept.hod_user_id ? String(dept.hod_user_id) : '',
    });
    setModalOpen(true);
  };

  const runDeactivate = async (dept, force = false) => {
    setTogglingId(dept.id);
    try {
      await departmentsApi.deactivate(dept.id, { force });
      toast.success(force ? 'Department archived with enrolled students' : 'Department deactivated');
      setForceTarget(null);
      refreshAll();
    } catch (err) {
      if (err?.response?.status === 409 && !force) {
        setForceTarget(dept);
        return;
      }
      toast.error(apiErrorMessage(err, 'Failed to deactivate department'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleActive = async (dept) => {
    if (isActiveDept(dept)) {
      await runDeactivate(dept, false);
      return;
    }
    setTogglingId(dept.id);
    try {
      await departmentsApi.reactivate(dept.id);
      toast.success('Department reactivated');
      refreshAll();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to reactivate department'));
    } finally {
      setTogglingId(null);
    }
  };

  const closeDrawer = useCallback(() => setDrawerRow(null), []);
  const askToggle = (dept) => {
    setDrawerRow(null);
    setConfirmRow(dept);
  };
  const confirmToggle = async () => {
    if (!confirmRow) return;
    await handleToggleActive(confirmRow);
    setConfirmRow(null);
  };

  const studentBars = activeAll
    .map((d) => ({
      key: String(d.id),
      label: d.name,
      sub: url.college ? (d.code || null) : d.college_name,
      value: Number(d.student_count) || 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const hodParts = [
    { key: 'assigned', label: 'HOD assigned', value: activeAll.length - withoutHod, tone: 'good' },
    { key: 'none', label: 'No HOD', value: withoutHod, tone: 'warn' },
  ];

  return (
    <ModulePage className="sa-page">
      <ModuleHead
        chips={collegeName ? <HeadChip icon="building">{collegeName}</HeadChip> : null}
        actions={(
          <button type="button" className="sd-btn sd-btn--amber" onClick={openCreate}>
            <Icon name="plus" size={16} /> New department
          </button>
        )}
      />

      <KpiRow
        label="Departments summary"
        items={[
          { icon: 'tree', label: 'Departments', value: allData ? countLabel(allTotal) : null, sub: allData ? `${countLabel(activeAll.length)} active · ${scope.toLowerCase()}` : null },
          { icon: 'alert', label: 'Without an HOD', value: allData ? countLabel(withoutHod) : null, tone: withoutHod ? 'focus' : undefined, sub: allData ? (withoutHod ? 'Active departments that need one' : 'Every active department has one') : null },
          { icon: 'users', label: 'Students enrolled', value: allData ? countLabel(enrolled) : null, sub: allData ? `In active departments · ${scope.toLowerCase()}` : null },
        ]}
      />

      {activeAll.length > 1 ? (
        <div className="dv-grid">
          <Panel title="Students by department" sub={collegeName ? `Departments of ${collegeName}` : 'Largest departments across the platform'}>
            <MetricList label="Students by department" items={studentBars} />
          </Panel>
          <Panel
            title="HOD coverage"
            sub="Active departments with and without a head of department."
            className="mdc-card"
            action={<div className="mdc-chip"><small>Total departments</small><b>{countLabel(activeAll.length)}</b></div>}
          >
            <ModernDonut title="HOD coverage" unit="Departments" parts={hodParts} />
            {withoutHod ? (
              <button type="button" className="sp-link sa-link-btn sa-gap-top" onClick={() => setUrl({ hod: 'none', status: 'true', page: '1' })}>
                Show departments without an HOD <Icon name="arrow" size={14} />
              </button>
            ) : null}
          </Panel>
        </div>
      ) : null}

      <Panel
        title={url.status === 'true' ? 'Active departments' : url.status === 'false' ? 'Inactive departments' : 'All departments'}
        sub={data ? `${countLabel(shownCount)} ${shownCount === 1 ? 'department' : 'departments'}${filtersOn ? ' match these filters' : ''}${noHod && total > pageRows.length ? ' on this page' : ''}` : null}
        bodyClassName={null}
        toolbar={(
          <>
            <SearchBox
              placeholder="Search department or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="sa-filter-select">
              <QuirriSelect
                ariaLabel="Filter by college"
                value={url.college}
                onChange={(e) => setUrl({ college: e.target.value, page: '1' })}
                placeholder="All colleges"
                options={colleges.map((c) => ({ value: String(c.id), label: collegeOptionLabel(c, colleges) }))}
              />
            </div>
            <SegTabs
              label="Filter by status"
              options={ACTIVE_FILTERS}
              value={url.status}
              onChange={(v) => setUrl({ status: v, page: '1' })}
            />
            <button
              type="button"
              className={`sa-chip-toggle${noHod ? ' is-on' : ''}`}
              aria-pressed={noHod}
              onClick={() => setUrl({ hod: noHod ? '' : 'none', page: '1' })}
            >
              {HOD_FILTERS[1].label}
            </button>
            {filtersOn ? (
              <button
                type="button"
                className="sd-btn sd-btn--ghost sd-btn--sm"
                onClick={() => setUrl({ q: '', college: '', status: 'all', hod: '', page: '1' })}
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
              title="Could not load departments"
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

        {loading && !pageRows.length ? <div className="sa-panel-state"><SectionState title="Loading departments…" /></div> : null}

        {!loading && !error && !departments.length ? (
          <div className="sa-panel-state">
            <SectionState
              title={filtersOn ? 'No departments match these filters' : 'No departments yet'}
              action={!filtersOn ? (
                <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={openCreate}>
                  <Icon name="plus" size={16} /> Add the first department
                </button>
              ) : null}
            >
              {filtersOn ? 'Try a different name, college or status.' : 'Departments you add under a college appear here.'}
            </SectionState>
          </div>
        ) : null}

        {departments.length ? (
          <div className="sp-table-wrap">
            <table className="sp-table un-table sa-table-tight sa-stack">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>College</th>
                  <th>HOD</th>
                  <th className="num">Students</th>
                  <th>Status</th>
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => {
                  const active = isActiveDept(dept);
                  return (
                    <tr key={dept.id}>
                      <td>
                        <button type="button" className="un-name-btn" onClick={() => setDrawerRow(dept)}>
                          <span className="sa-dot" style={{ background: dataColor(String(dept.id)) }} aria-hidden="true" />
                          <span>
                            <b>{dept.name}</b>
                            <small>{dept.code || 'No code'}</small>
                          </span>
                        </button>
                      </td>
                      <td data-label="College">
                        {dept.college_id ? (
                          <Link className="sa-plain-link" href={`/superadmin/colleges/${dept.college_id}`}>{dept.college_name || '—'}</Link>
                        ) : (dept.college_name || '—')}
                      </td>
                      <td data-label="HOD">
                        {dept.hod_name ? dept.hod_name : <span className="pm-missing"><Icon name="alert" size={14} /> Not assigned</span>}
                      </td>
                      <td data-label="Students" className="num">{countLabel(dept.student_count ?? 0)}</td>
                      <td data-label="Status"><StatusPill active={active} /></td>
                      <td className="sa-actions-cell">
                        <div className="un-actions">
                          <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setDrawerRow(dept)}>View</button>
                          <IconButton icon="edit" label={`Edit ${dept.name}`} onClick={() => openEdit(dept)} />
                          <IconButton
                            icon={active ? 'lock' : 'refresh'}
                            label={active ? `Deactivate ${dept.name}` : `Reactivate ${dept.name}`}
                            danger={active}
                            disabled={togglingId === dept.id}
                            onClick={() => askToggle(dept)}
                          />
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
        shown={pageRows.length}
        onPage={(p) => setUrl({ page: String(p) }, { push: true })}
        noun="departments"
      />

      <DepartmentDrawer
        row={drawerRow}
        onClose={closeDrawer}
        onEdit={openEdit}
        onToggle={askToggle}
      />

      <StatusConfirm
        row={confirmRow}
        busy={Boolean(confirmRow && togglingId === confirmRow.id)}
        onCancel={() => setConfirmRow(null)}
        onConfirm={confirmToggle}
      />

      {modalOpen ? (
        <DepartmentFormModal
          key={editingId || 'create-dept'}
          open={modalOpen}
          editingId={editingId}
          initialValues={formDefaults}
          colleges={editingId ? colleges : activeColleges}
          onClose={() => setModalOpen(false)}
          onSaved={refreshAll}
        />
      ) : null}

      <QuirriModal
        open={Boolean(forceTarget)}
        onClose={() => setForceTarget(null)}
        title="Archive with enrolled students?"
        crumb={forceTarget?.name}
        footer={(
          <>
            <button type="button" className="sd-btn sd-btn--ghost" onClick={() => setForceTarget(null)}>
              Cancel
            </button>
            <div className="right">
              <button
                type="button"
                className="sd-btn un-btn-danger"
                disabled={togglingId === forceTarget?.id}
                onClick={() => forceTarget && runDeactivate(forceTarget, true)}
              >
                Archive anyway
              </button>
            </div>
          </>
        )}
      >
        {forceTarget ? (
          <ConfirmNote danger icon="alert" title="Students are still enrolled here.">
            {`This department has ${forceTarget.student_count ?? 'enrolled'} student(s). Archiving keeps their records but hides the department from active lists. This action is audited.`}
          </ConfirmNote>
        ) : null}
      </QuirriModal>
    </ModulePage>
  );
}

export default function DepartmentsPage() {
  return (
    <Suspense fallback={<SectionState title="Loading departments…" />}>
      <DepartmentsView />
    </Suspense>
  );
}

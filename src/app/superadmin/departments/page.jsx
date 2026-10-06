'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  ModuleBanner,
  KpiRow,
  FilterBar,
  SegTabs,
  ViewToggle,
  Panel,
  StatusPill,
  IconButton,
  Mono,
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
import { departmentCreateSchema, departmentUpdateSchema } from '@/lib/validation';
import { ROLES } from '@/lib/permissions';

const EMPTY_FORM = {
  college_id: '',
  name: '',
  code: '',
  hod_user_id: '',
};

const PAGE_SIZE = 25;

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

function isActiveDept(dept) {
  return dept?.is_active !== false;
}

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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
                options={colleges.map((c) => ({ value: c.id, label: c.name }))}
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
            Use Deactivate / Reactivate to change active status (soft delete).
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
        title={deactivating ? 'This is a soft delete.' : 'The department becomes active again.'}
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
          <span className={`sp-pill ${active ? 'sp-pill--good' : 'sp-pill--err'}`}>
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
export default function DepartmentsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [view, setView] = useState('grid');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formDefaults, setFormDefaults] = useState(EMPTY_FORM);
  const [togglingId, setTogglingId] = useState(null);
  const [forceTarget, setForceTarget] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);
  const [drawerRow, setDrawerRow] = useState(null);

  const { data: collegeData } = useAsyncResource(
    () => fetchData(() => collegesApi.list({ page: 1, page_size: 100, is_active: true })),
    [],
  );
  const colleges = useMemo(() => asList(collegeData, []), [collegeData]);

  const listParams = useMemo(() => ({
    q: search.trim() || undefined,
    college_id: collegeFilter || undefined,
    is_active: status === '' ? undefined : status === 'true',
    page,
    pageSize: PAGE_SIZE,
  }), [search, status, collegeFilter, page]);

  const { data, loading, error, reload } = useAsyncResource(
    () => fetchData(() => departmentsApi.list(listParams)),
    [listParams],
  );

  const departments = useMemo(() => asList(data, []), [data]);
  const total = data?.total ?? departments.length;
  const pageSize = data?.page_size ?? PAGE_SIZE;
  const listedAll = departments.length >= total;
  const filtered = Boolean(search || status || collegeFilter);
  const activeCount = departments.filter(isActiveDept).length;
  const studentSum = departments.reduce((acc, d) => acc + (Number(d.student_count) || 0), 0);
  const withHod = departments.filter((d) => d.hod_name || d.hod_user_id).length;
  const scopeNote = listedAll ? 'In this list' : 'On this page';

  const openCreate = () => {
    setEditingId(null);
    setFormDefaults({ ...EMPTY_FORM });
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
      reload();
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
    const active = dept.is_active !== false;
    if (active) {
      await runDeactivate(dept, false);
      return;
    }
    setTogglingId(dept.id);
    try {
      await departmentsApi.reactivate(dept.id);
      toast.success('Department reactivated');
      reload();
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

  const RowActions = ({ row }) => {
    const active = isActiveDept(row);
    return (
      <div className="un-actions">
        <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setDrawerRow(row)}>
          View
        </button>
        <IconButton icon="edit" label={`Edit ${row.name}`} onClick={() => openEdit(row)} />
        <IconButton
          icon={active ? 'lock' : 'refresh'}
          label={active ? `Deactivate ${row.name}` : `Reactivate ${row.name}`}
          danger={active}
          disabled={togglingId === row.id}
          onClick={() => askToggle(row)}
        />
      </div>
    );
  };

  return (
    <ModulePage className="sa-page">
      <ModuleBanner
        icon="tree"
        eyebrow="Academic hierarchy"
        title="Departments"
        lede="Departments sit beneath a college. Create them here, assign an optional HOD, and deactivate them when they are no longer used."
        chips={(
          <>
            <span>University</span>
            <Icon name="chev" size={14} />
            <span>College</span>
            <Icon name="chev" size={14} />
            <span className="is-on">Department</span>
          </>
        )}
        actions={(
          <button type="button" className="sd-btn sd-btn--amber" onClick={openCreate}>
            <Icon name="plus" size={16} /> New department
          </button>
        )}
      />

      <KpiRow
        label="Departments summary"
        items={[
          { icon: 'tree', label: 'Departments', value: data ? countLabel(total) : null, sub: filtered ? 'Matching these filters' : 'Across all colleges' },
          { icon: 'tick', label: 'Active', value: data ? countLabel(activeCount) : null, sub: scopeNote },
          { icon: 'user', label: 'With an HOD', value: data ? countLabel(withHod) : null, sub: scopeNote },
          { icon: 'users', label: 'Students', value: data ? countLabel(studentSum) : null, sub: listedAll ? 'Enrolled in listed departments' : 'Enrolled, this page' },
        ]}
      />

      <FilterBar label="Filter departments">
        <SearchBox
          placeholder="Search department or code…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <QuirriSelect
          ariaLabel="Filter by college"
          value={collegeFilter}
          onChange={(e) => {
            setCollegeFilter(e.target.value);
            setPage(1);
          }}
          placeholder="All colleges"
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
        <ViewToggle value={view} onChange={setView} />
      </FilterBar>

      {error ? (
        <SectionState
          tone="err"
          title="Could not load departments"
          action={(
            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload()}>
              <Icon name="refresh" size={16} /> Try again
            </button>
          )}
        >
          {apiErrorMessage(error, 'Please try again. If migrations are not applied yet, the API may be unavailable.')}
        </SectionState>
      ) : null}

      {loading && !departments.length ? <SectionState title="Loading departments…" /> : null}

      {!loading && !error && !departments.length ? (
        <SectionState
          title={filtered ? 'No departments match these filters' : 'No departments yet'}
          action={!filtered ? (
            <button type="button" className="sd-btn sd-btn--teal sd-btn--sm" onClick={openCreate}>
              <Icon name="plus" size={16} /> Add the first department
            </button>
          ) : null}
        >
          {filtered ? 'Try a different name, college or status.' : 'Departments you add under a college appear here.'}
        </SectionState>
      ) : null}

      {departments.length && view === 'grid' ? (
        <div className="un-grid sa-grid">
          {departments.map((dept) => {
            const active = isActiveDept(dept);
            return (
              <article key={dept.id} className={`un-card${active ? '' : ' is-inactive'}`}>
                <button type="button" className="un-card-main" onClick={() => setDrawerRow(dept)}>
                  <div className="un-card-top">
                    <Mono name={dept.name} muted={!active} />
                    <StatusPill active={active} />
                  </div>
                  <h3 className="sa-card-title">{dept.name}</h3>
                  <div className="un-card-meta">
                    {dept.code ? <span className="un-code">{dept.code}</span> : null}
                    <span><Icon name="building" size={13} /> {dept.college_name || 'College not set'}</span>
                  </div>
                  <div className="un-card-stats">
                    <div><b>{countLabel(dept.student_count ?? 0)}</b><small>Students</small></div>
                    <div>
                      <b className="sa-stat-text">{dept.hod_name || 'Not set'}</b>
                      <small>HOD</small>
                    </div>
                  </div>
                </button>
                <div className="un-card-foot">
                  <RowActions row={dept} />
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {departments.length && view === 'list' ? (
        <Panel bodyClassName={null}>
          <div className="sp-table-wrap">
            <table className="sp-table un-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>College</th>
                  <th>HOD</th>
                  <th className="num">Students</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => {
                  const active = isActiveDept(dept);
                  return (
                    <tr key={dept.id}>
                      <td>
                        <button type="button" className="un-name-btn" onClick={() => setDrawerRow(dept)}>
                          <Mono name={dept.name} size="sm" muted={!active} />
                          <span>
                            <b>{dept.name}</b>
                            <small>{dept.code || '—'}</small>
                          </span>
                        </button>
                      </td>
                      <td>{dept.college_name || '—'}</td>
                      <td className="sa-nowrap">{dept.hod_name || '—'}</td>
                      <td className="num"><b>{countLabel(dept.student_count ?? 0)}</b></td>
                      <td><StatusPill active={active} /></td>
                      <td><RowActions row={dept} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      <Pager
        page={page}
        pageSize={pageSize}
        total={total}
        shown={departments.length}
        onPage={setPage}
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
          colleges={colleges}
          onClose={() => setModalOpen(false)}
          onSaved={reload}
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

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import {
  QuirriRHFField,
  QuirriCombobox,
} from '@/components/superadmin/quirri-ui';
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
  Mono,
  FormSection,
  ConfirmNote,
  SectionState,
  countLabel,
} from '@/components/shared/module-ui';
import { departmentsApi, fetchData } from '@/lib/api/superadmin/modules';
import { usersApi } from '@/lib/api/superadmin/users';
import { asList, unwrap, apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useAuth } from '@/hooks/useAuth';
import { tenantDepartmentCreateSchema, departmentUpdateSchema } from '@/lib/validation';
import { ROLES } from '@/lib/permissions';

const EMPTY_FORM = {
  name: '',
  code: '',
  hod_user_id: '',
};

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

const LEVELS_LATER = [
  { title: 'Programmes', body: 'Degree programmes inside each department, such as B.E. Computer Science.' },
  { title: 'Years and semesters', body: 'The year and semester calendar each programme follows.' },
  { title: 'Subjects and chapters', body: 'Subjects per semester, with the chapter videos you upload.' },
];

function personLabel(user) {
  const name = user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(' ');
  if (name && user?.email) return `${name} (${user.email})`;
  return name || user?.email || '—';
}

async function loadHodOptions(tenantId) {
  if (!tenantId) return [];
  const [facultyRes, hodRes] = await Promise.all([
    usersApi.getUsers({
      page: 1,
      pageSize: 100,
      role: ROLES.FACULTY,
      tenantId,
      is_active: true,
    }),
    usersApi.getUsers({
      page: 1,
      pageSize: 100,
      role: ROLES.HOD,
      tenantId,
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
  tenantId,
  initialValues,
  onClose,
  onSaved,
}) {
  const schema = editingId ? departmentUpdateSchema : tenantDepartmentCreateSchema;
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialValues || EMPTY_FORM,
    mode: 'onBlur',
  });
  const [saving, setSaving] = useState(false);
  const [hodOptions, setHodOptions] = useState([]);
  const [hodLoading, setHodLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setHodLoading(true);
      try {
        const opts = await loadHodOptions(tenantId);
        if (!cancelled) setHodOptions(opts);
      } catch {
        if (!cancelled) setHodOptions([]);
      } finally {
        if (!cancelled) setHodLoading(false);
      }
    }
    if (open) run();
    return () => {
      cancelled = true;
    };
  }, [open, tenantId]);

  const onSave = handleSubmit(async (values) => {
    if (!tenantId) {
      toast.error('Your college tenant is missing from this session. Sign in again.');
      return;
    }
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
          college_id: tenantId,
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
      crumb="Departments sit under your college"
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
      <form onSubmit={onSave} noValidate className="un-form">
        <FormSection n={1} title="Department" sub="The name staff and students see, and an optional short code.">
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
            />
          </div>
        </FormSection>
        <FormSection n={2} title="Head of department" sub="Optional. Pick an active faculty member or HOD from your college.">
          <Controller
            control={control}
            name="hod_user_id"
            render={({ field, fieldState }) => (
              <QuirriCombobox
                id="ca-dept-hod"
                label="HOD"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                error={fieldState.error?.message}
                disabled={hodLoading}
                placeholder={hodLoading ? 'Loading staff…' : 'Optional — type to search'}
                options={hodOptions}
                emptyMessage="No faculty or HOD yet"
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
            Use Deactivate or Reactivate to change the department&apos;s status.
          </div>
        ) : null}
      </form>
    </QuirriModal>
  );
}

/* ---------------------------------------------------------------- page */
export default function StructurePage() {
  const { tenantId } = useAuth();
  const { show, hide, TipLayer } = useQuirriTip();
  const [status, setStatus] = useState('true');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formDefaults, setFormDefaults] = useState(EMPTY_FORM);
  const [togglingId, setTogglingId] = useState(null);
  const [forceTarget, setForceTarget] = useState(null);
  const [confirmDept, setConfirmDept] = useState(null);

  const listParams = useMemo(() => ({
    is_active: status === '' ? undefined : status === 'true',
    page: 1,
    pageSize: 100,
  }), [status]);

  const { data, loading, error, reload } = useAsyncResource(
    () => fetchData(() => departmentsApi.list(listParams)),
    [listParams, tenantId],
  );

  const departments = useMemo(() => asList(data, []), [data]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) => [d.name, d.code, d.hod_name]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q)));
  }, [departments, search]);
  const selected = visible.find((d) => d.id === selectedId) || visible[0] || null;

  useEffect(() => {
    if (!selectedId && departments[0]?.id) {
      setSelectedId(departments[0].id);
    }
  }, [departments, selectedId]);

  const withHod = departments.filter((d) => d.hod_name || d.hod_user_id).length;
  const enrolled = departments.reduce((acc, d) => acc + (Number(d.student_count) || 0), 0);
  const listLabel = status === 'true' ? 'Active' : status === 'false' ? 'Inactive' : 'All';

  const openCreate = () => {
    setEditingId(null);
    setFormDefaults({ ...EMPTY_FORM });
    setModalOpen(true);
  };

  const openEdit = (dept) => {
    setEditingId(dept.id);
    setFormDefaults({
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

  const confirmToggle = async () => {
    const dept = confirmDept;
    if (!dept) return;
    setConfirmDept(null);
    await handleToggleActive(dept);
  };

  const selectedActive = selected ? selected.is_active !== false : false;

  return (
    <ModulePage className="ad-page">
      <ModuleBanner
        icon="tree"
        eyebrow="Academic structure"
        title="Departments"
        lede="Departments are the first level under your college. Each one has an HOD who reviews chapters before students see them."
        chips={(
          <>
            <span>College</span>
            <Icon name="chev" size={14} />
            <span className="is-on">Department</span>
            <Icon name="chev" size={14} />
            <span>Programme</span>
            <Icon name="chev" size={14} />
            <span>Semester</span>
            <Icon name="chev" size={14} />
            <span>Subject</span>
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
          {
            icon: 'tree',
            label: `${listLabel} departments`,
            value: loading && !departments.length ? null : countLabel(departments.length),
            sub: 'In this list',
          },
          {
            icon: 'user',
            label: 'HOD assigned',
            value: loading && !departments.length ? null : countLabel(withHod),
            sub: 'Ready to review chapters',
          },
          {
            icon: 'alert',
            label: 'No HOD yet',
            value: loading && !departments.length ? null : countLabel(departments.length - withHod),
            sub: 'Assign one from Edit',
          },
          {
            icon: 'users',
            label: 'Students enrolled',
            value: loading && !departments.length ? null : countLabel(enrolled),
            sub: 'Across listed departments',
          },
        ]}
      />

      <FilterBar label="Filter departments">
        <SearchBox
          placeholder="Search department, code or HOD…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <SegTabs
          label="Filter by status"
          options={STATUS_FILTERS}
          value={status}
          onChange={(v) => {
            setSelectedId(null);
            setStatus(v);
          }}
        />
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
          {apiErrorMessage(error, 'Please try again.')}
        </SectionState>
      ) : null}

      {loading && !departments.length ? <SectionState title="Loading departments…" /> : null}

      {!loading && !error && !departments.length ? (
        <SectionState
          title={status === '' ? 'No departments yet' : `No ${listLabel.toLowerCase()} departments`}
          action={status !== 'false' ? (
            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={openCreate}>
              <Icon name="plus" size={16} /> Add the first department
            </button>
          ) : null}
        >
          Create a department to organise students and staff.
        </SectionState>
      ) : null}

      {departments.length ? (
        <div className="pm-split">
          <Panel
            title="Departments"
            sub={`${countLabel(visible.length)} of ${countLabel(departments.length)} shown`}
            bodyClassName={null}
          >
            {visible.length ? (
              <ul className="pm-list" aria-label="Departments">
                {visible.map((dept) => {
                  const isActive = dept.is_active !== false;
                  return (
                    <li key={dept.id}>
                      <button
                        type="button"
                        className="pm-list-btn"
                        aria-current={selected?.id === dept.id ? 'true' : undefined}
                        onClick={() => setSelectedId(dept.id)}
                      >
                        <Mono name={dept.name} size="sm" muted={!isActive} />
                        <div>
                          <b>{dept.name}</b>
                          <small>
                            {dept.code || 'No code'} · {countLabel(dept.student_count ?? 0)} {Number(dept.student_count) === 1 ? 'student' : 'students'}
                          </small>
                        </div>
                        <Icon name="chev" size={16} className="ad-list-chev" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="sp-panel-b">
                <SectionState title="No departments match">Try a different name, code or HOD.</SectionState>
              </div>
            )}
          </Panel>

          {selected ? (
            <section className="sp-panel ad-detail" aria-label={`${selected.name} details`}>
              <div className="ad-detail-h">
                <Mono name={selected.name} size="lg" muted={!selectedActive} />
                <div className="ad-detail-t">
                  <span className="ad-overline">Department</span>
                  <h3>{selected.name}</h3>
                  <div className="ad-detail-meta">
                    {selected.code ? <span className="un-code">{selected.code}</span> : null}
                    <StatusPill active={selectedActive} />
                  </div>
                </div>
              </div>

              <div className="ad-detail-stats">
                <div><small>Enrolled students</small><b>{countLabel(selected.student_count ?? 0)}</b></div>
                <div><small>Head of department</small><b className="ad-detail-name">{selected.hod_name || 'Not assigned'}</b></div>
              </div>

              <div className="ad-detail-sec">
                <h4>Below this department</h4>
                <p className="ad-muted">These levels are not available yet. Departments are live today.</p>
                <ol className="ad-levels">
                  {LEVELS_LATER.map((lvl, i) => (
                    <li key={lvl.title}>
                      <span className="pm-step-n">{i + 1}</span>
                      <div>
                        <b>{lvl.title}</b>
                        <small>{lvl.body}</small>
                      </div>
                      <span className="sp-pill">Not available yet</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="ad-detail-foot">
                <button
                  type="button"
                  className={`sd-btn sd-btn--sm ${selectedActive ? 'sd-btn--danger' : 'sd-btn--outline'}`}
                  disabled={togglingId === selected.id}
                  onClick={() => setConfirmDept(selected)}
                  onMouseEnter={(e) => show(e, selectedActive ? 'Archive this department' : 'Restore this department', 'top')}
                  onMouseLeave={hide}
                >
                  <Icon name={selectedActive ? 'lock' : 'refresh'} size={16} />
                  {togglingId === selected.id
                    ? 'Updating…'
                    : selectedActive
                      ? 'Deactivate'
                      : 'Reactivate'}
                </button>
                <button type="button" className="sd-btn sd-btn--teal sd-btn--sm" onClick={() => openEdit(selected)}>
                  <Icon name="edit" size={16} /> Edit department
                </button>
              </div>
            </section>
          ) : (
            <Panel title="Department details">
              <SectionState title="Select a department">
                Pick a department on the left to see its HOD and status.
              </SectionState>
            </Panel>
          )}
        </div>
      ) : null}

      {modalOpen ? (
        <DepartmentFormModal
          key={editingId || 'create-ca-dept'}
          open={modalOpen}
          editingId={editingId}
          tenantId={tenantId}
          initialValues={formDefaults}
          onClose={() => setModalOpen(false)}
          onSaved={reload}
        />
      ) : null}

      <QuirriModal
        open={Boolean(confirmDept)}
        onClose={() => setConfirmDept(null)}
        title={confirmDept?.is_active !== false ? 'Deactivate department?' : 'Reactivate department?'}
        crumb={confirmDept ? [confirmDept.name, confirmDept.code].filter(Boolean).join(' · ') : null}
        footer={(
          <>
            <button type="button" className="sd-btn sd-btn--ghost" onClick={() => setConfirmDept(null)}>
              Cancel
            </button>
            <div className="right">
              <button
                type="button"
                className={`sd-btn ${confirmDept?.is_active !== false ? 'un-btn-danger' : 'sd-btn--teal'}`}
                onClick={confirmToggle}
              >
                {confirmDept?.is_active !== false ? 'Deactivate' : 'Reactivate'}
              </button>
            </div>
          </>
        )}
      >
        {confirmDept ? (
          <ConfirmNote
            danger={confirmDept.is_active !== false}
            title={confirmDept.is_active !== false ? 'This is a soft delete.' : 'The department becomes active again.'}
          >
            {confirmDept.is_active !== false
              ? `${confirmDept.name} is hidden from active lists. Its records are kept and you can reactivate it at any time.`
              : `${confirmDept.name} will appear in active lists and can take new students and staff again.`}
          </ConfirmNote>
        ) : null}
      </QuirriModal>

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
          <ConfirmNote danger title="This department still has enrolled students.">
            {`This department has ${forceTarget.student_count ?? 'enrolled'} student(s). Archiving keeps their records but hides the department from active lists. This action is audited.`}
          </ConfirmNote>
        ) : null}
      </QuirriModal>
      <TipLayer />
    </ModulePage>
  );
}

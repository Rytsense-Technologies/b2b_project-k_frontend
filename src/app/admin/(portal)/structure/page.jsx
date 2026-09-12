'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import QuirriBadge from '@/components/superadmin/QuirriBadge';
import QuirriModal from '@/components/superadmin/QuirriModal';
import {
  IconPlus,
  QuirriRHFField,
  QuirriSelect,
  QuirriCombobox,
} from '@/components/superadmin/quirri-ui';
import { useQuirriTip } from '@/components/superadmin/QuirriTooltip';
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

function statusVariant(isActive) {
  if (isActive === true) return 'green';
  if (isActive === false) return 'red';
  return 'amber';
}

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
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <div className="right">
            <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create department'}
            </button>
          </div>
        </>
      )}
    >
      <form onSubmit={onSave} noValidate>
        <QuirriRHFField
          control={control}
          name="name"
          fieldType="academicLabel"
          label="Department name"
          placeholder="e.g. Computer Science"
          full
        />
        <QuirriRHFField
          control={control}
          name="code"
          fieldType="code"
          label="Department code"
          placeholder="Optional"
          full
        />
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
        {Object.keys(errors).length > 0 ? (
          <div className="hint field-error" role="alert" style={{ marginTop: 8 }}>
            Check the highlighted fields and try again.
          </div>
        ) : null}
      </form>
    </QuirriModal>
  );
}

export default function StructurePage() {
  const { tenantId } = useAuth();
  const { show, hide, TipLayer } = useQuirriTip();
  const [status, setStatus] = useState('true');
  const [selectedId, setSelectedId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formDefaults, setFormDefaults] = useState(EMPTY_FORM);
  const [togglingId, setTogglingId] = useState(null);
  const [forceTarget, setForceTarget] = useState(null);

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
  const selected = departments.find((d) => d.id === selectedId) || departments[0] || null;

  useEffect(() => {
    if (!selectedId && departments[0]?.id) {
      setSelectedId(departments[0].id);
    }
  }, [departments, selectedId]);

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

  return (
    <div className="animate-fade-in">
      <div className="section-head">
        <div>
          <div className="t">Academic Structure</div>
          <div className="d">
            Departments for your college. Program → Year → Semester → Subject → Chapter arrives later.
          </div>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          {IconPlus}
          New department
        </button>
      </div>

      <div className="toolbar">
        <QuirriSelect
          ariaLabel="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          placeholder="All statuses"
          options={[
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Inactive' },
          ]}
        />
      </div>

      {error ? (
        <div className="notice err" style={{ marginBottom: 12 }}>
          <div>
            <b>Could not load departments</b>
            {apiErrorMessage(error, 'Please try again.')}
          </div>
        </div>
      ) : null}

      <div className="tree-wrap" style={{ marginTop: 8 }}>
        <div className="card card-p">
          <div className="card-h"><h3>Departments</h3></div>
          {loading && !departments.length ? (
            <p className="card-sub">Loading departments…</p>
          ) : null}
          {!loading && !departments.length && !error ? (
            <div className="notice info">
              <div>
                <b>No departments yet</b>
                Create your first department to organise students and staff.
              </div>
            </div>
          ) : null}
          <ul className="lvl-dept" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {departments.map((dept) => {
              const active = selected?.id === dept.id;
              return (
                <li key={dept.id} style={{ marginBottom: 4 }}>
                  <button
                    type="button"
                    className={`tree-node${active ? ' active' : ''}`}
                    onClick={() => setSelectedId(dept.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      border: '1px solid var(--line)',
                      background: active ? 'var(--teal-50)' : '#fff',
                      borderRadius: 8,
                      padding: '10px 12px',
                      cursor: 'pointer',
                      font: 'inherit',
                    }}
                  >
                    <span className="strong">{dept.name}</span>
                    <div className="sub">{dept.code || 'No code'} · {dept.student_count ?? 0} students</div>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="notice info" style={{ marginTop: 16 }}>
            <div>
              <b>Programs and below</b>
              Program → Year → Semester → Subject → Chapter is not available yet. Departments are live.
            </div>
          </div>
        </div>

        <div className="card card-p">
          <div className="crumb" style={{ marginBottom: 8 }}>College · Department</div>
          {selected ? (
            <>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{selected.name}</h3>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>
                Code {selected.code || '—'} · {selected.student_count ?? 0} enrolled students
              </p>
              <div style={{ marginBottom: 12 }}>
                <QuirriBadge variant={statusVariant(selected.is_active !== false)}>
                  {selected.is_active !== false ? 'Active' : 'Inactive'}
                </QuirriBadge>
              </div>
              <div className="lb" style={{ fontSize: 10.5, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--muted-2)', fontWeight: 800, marginBottom: 8 }}>
                HOD
              </div>
              <p style={{ marginBottom: 16, fontSize: 14 }}>
                {selected.hod_name || 'No HOD assigned'}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(selected)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={togglingId === selected.id}
                  onClick={() => handleToggleActive(selected)}
                  onMouseEnter={(e) => show(e, selected.is_active !== false ? 'Archive this department' : 'Restore this department', 'top')}
                  onMouseLeave={hide}
                >
                  {togglingId === selected.id
                    ? '…'
                    : selected.is_active !== false
                      ? 'Deactivate'
                      : 'Reactivate'}
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Department detail</h3>
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                Select a department to see HOD assignment and status.
              </p>
            </>
          )}
        </div>
      </div>

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
        open={Boolean(forceTarget)}
        onClose={() => setForceTarget(null)}
        title="Archive with enrolled students?"
        crumb={forceTarget?.name}
        footer={(
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setForceTarget(null)}>
              Cancel
            </button>
            <div className="right">
              <button
                type="button"
                className="btn btn-primary"
                disabled={togglingId === forceTarget?.id}
                onClick={() => forceTarget && runDeactivate(forceTarget, true)}
              >
                Archive anyway
              </button>
            </div>
          </>
        )}
      >
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
          {forceTarget
            ? `This department has ${forceTarget.student_count ?? 'enrolled'} student(s). Archiving keeps their records but hides the department from active lists. This action is audited.`
            : null}
        </p>
      </QuirriModal>
      <TipLayer />
    </div>
  );
}

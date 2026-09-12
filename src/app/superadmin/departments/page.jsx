'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import QuirriBadge from '@/components/superadmin/QuirriBadge';
import QuirriModal from '@/components/superadmin/QuirriModal';
import {
  SearchBox,
  IconPlus,
  QuirriRHFField,
  QuirriSelect,
  QuirriCombobox,
} from '@/components/superadmin/quirri-ui';
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

function statusVariant(isActive) {
  if (isActive === true || isActive === 'active' || String(isActive).toLowerCase() === 'true') return 'green';
  if (isActive === false || String(isActive).toLowerCase() === 'false') return 'red';
  return 'amber';
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
          hint="Letters, numbers, underscore, or hyphen."
          full
        />
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
        {Object.keys(errors).length > 0 ? (
          <div className="hint field-error" role="alert" style={{ marginTop: 8 }}>
            Check the highlighted fields and try again.
          </div>
        ) : null}
      </form>
    </QuirriModal>
  );
}

export default function DepartmentsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formDefaults, setFormDefaults] = useState(EMPTY_FORM);
  const [togglingId, setTogglingId] = useState(null);
  const [forceTarget, setForceTarget] = useState(null);

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
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const openCreate = () => {
    setEditingId(null);
    setFormDefaults({ ...EMPTY_FORM });
    setModalOpen(true);
  };

  const openEdit = (dept) => {
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

  return (
    <div className="animate-fade-in">
      <div className="section-head">
        <div>
          <div className="t">Departments</div>
          <div className="d">
            Create and manage departments under each college. Assign an optional HOD.
          </div>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          {IconPlus}
          New department
        </button>
      </div>

      <div className="toolbar">
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
        <QuirriSelect
          ariaLabel="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
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
            {apiErrorMessage(error, 'Please try again. If migrations are not applied yet, the API may be unavailable.')}
          </div>
        </div>
      ) : null}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Department</th>
              <th>College</th>
              <th>HOD</th>
              <th>Students</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && !departments.length ? (
              <tr><td colSpan={6}>Loading departments…</td></tr>
            ) : null}
            {!loading && !departments.length && !error ? (
              <tr><td colSpan={6}>No departments found.</td></tr>
            ) : null}
            {departments.map((dept) => {
              const active = dept.is_active !== false;
              return (
                <tr key={dept.id}>
                  <td>
                    <span className="strong">{dept.name}</span>
                    <div className="sub">{dept.code || '—'}</div>
                  </td>
                  <td>{dept.college_name || '—'}</td>
                  <td>{dept.hod_name || '—'}</td>
                  <td className="num">{dept.student_count ?? 0}</td>
                  <td>
                    <QuirriBadge variant={statusVariant(active)}>
                      {active ? 'Active' : 'Inactive'}
                    </QuirriBadge>
                  </td>
                  <td className="actions">
                    <a onClick={() => openEdit(dept)} role="button" tabIndex={0}>Edit</a>
                    <a
                      onClick={() => togglingId !== dept.id && handleToggleActive(dept)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleToggleActive(dept)}
                      style={{ opacity: togglingId === dept.id ? 0.5 : 1 }}
                    >
                      {togglingId === dept.id
                        ? '…'
                        : active
                          ? 'Deactivate'
                          : 'Reactivate'}
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {totalPages > 1 ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--line)' }}>
            <span className="sub">{total} total · page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>

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
    </div>
  );
}

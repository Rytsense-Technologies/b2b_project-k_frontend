'use client';

import { useMemo, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import QuirriBadge from '@/components/superadmin/QuirriBadge';
import QuirriModal from '@/components/superadmin/QuirriModal';
import {
  SearchBox,
  IconPlus,
  QuirriPillList,
  QuirriRHFField,
  QuirriSelect,
  IndiaLocationFields,
} from '@/components/superadmin/quirri-ui';
import { collegesApi, universitiesApi, departmentsApi, fetchData } from '@/lib/api/superadmin/modules';
import { asList, unwrap, apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { collegeCreateSchema, collegeUpdateSchema } from '@/lib/validation';
import { INDIA_COUNTRY, withIndiaPhoneDefault } from '@/lib/india';

const EMPTY_FORM = {
  name: '',
  code: '',
  country: INDIA_COUNTRY.code,
  state: '',
  district: '',
  city: '',
  pincode: '',
  student_seat_cap: '',
  university_id: '',
  admins: [{ name: '', email: '', mobile: '+91' }],
};

const PAGE_SIZE = 25;

function statusVariant(isActive) {
  if (isActive === true || isActive === 'active' || String(isActive).toLowerCase() === 'true') return 'green';
  if (isActive === false || String(isActive).toLowerCase() === 'false') return 'red';
  return 'amber';
}

function CollegeFormModal({
  open,
  editingId,
  initialValues,
  universities,
  onClose,
  onSaved,
}) {
  const schema = editingId ? collegeUpdateSchema : collegeCreateSchema;
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialValues || EMPTY_FORM,
    mode: 'onBlur',
  });
  const { fields, append } = useFieldArray({ control, name: 'admins' });
  const [saving, setSaving] = useState(false);

  const locationPayload = (values) => ({
    country: INDIA_COUNTRY.code,
    state: values.state || undefined,
    district: values.district || undefined,
    city: values.city || undefined,
    pincode: values.pincode || undefined,
  });

  const onSave = handleSubmit(async (values) => {
    setSaving(true);
    try {
      if (editingId) {
        await collegesApi.update(editingId, {
          name: values.name,
          ...locationPayload(values),
          student_seat_cap: values.student_seat_cap,
        });
      } else {
        await collegesApi.create({
          university_id: values.university_id,
          name: values.name,
          code: values.code,
          ...locationPayload(values),
          student_seat_cap: values.student_seat_cap,
          admins: values.admins.map((a) => ({
            ...a,
            mobile: withIndiaPhoneDefault(a.mobile),
          })),
        });
      }
      toast.success(editingId ? 'College updated' : 'College created');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to save college'));
    } finally {
      setSaving(false);
    }
  });

  return (
    <QuirriModal
      open={open}
      onClose={onClose}
      title={editingId ? 'Edit college' : 'Add college'}
      crumb="A college always sits under a university"
      wide
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <div className="right">
            <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : (editingId ? 'Save college' : 'Create college')}
            </button>
          </div>
        </>
      )}
    >
      <form onSubmit={onSave} noValidate>
        <div className="grid2">
          <Controller
            control={control}
            name="university_id"
            render={({ field, fieldState }) => (
              <QuirriSelect
                id="college-uni"
                label="University"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                disabled={Boolean(editingId)}
                placeholder="Select university"
                error={fieldState.error?.message}
                options={universities.map((u) => ({ value: u.id, label: u.name }))}
              />
            )}
          />
          <QuirriRHFField
            control={control}
            name="name"
            fieldType="institutionName"
            label="College name"
            placeholder="Enter college name"
          />
          <QuirriRHFField
            control={control}
            name="code"
            fieldType="code"
            label="College code"
            placeholder="COL-0004"
            disabled={Boolean(editingId)}
          />
          <IndiaLocationFields control={control} setValue={setValue} />
          <QuirriRHFField
            control={control}
            name="student_seat_cap"
            fieldType="positiveInt"
            label="Student seat cap"
            placeholder="5000"
            hint="Adding a student beyond the cap is refused with a clear message."
          />
        </div>

        {!editingId ? (
        <div className="blk" style={{ marginTop: 8 }}>
          <div className="lb">College administrators</div>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12 }}>
            Each admin receives an activation link. You never set their password.
          </p>
          {fields.map((row, index) => (
            <div className="grid3" key={row.id} style={{ alignItems: 'end', marginBottom: 10 }}>
              <QuirriRHFField
                control={control}
                name={`admins.${index}.name`}
                fieldType="personName"
                label="Full name"
                placeholder="Admin name"
              />
              <QuirriRHFField
                control={control}
                name={`admins.${index}.email`}
                fieldType="email"
                label="Email"
                placeholder="admin@college.edu"
              />
              <QuirriRHFField
                control={control}
                name={`admins.${index}.mobile`}
                fieldType="phone"
                label="Mobile"
                placeholder="+91"
              />
            </div>
          ))}
          {errors.admins?.message || errors.admins?.root?.message ? (
            <div className="hint field-error" role="alert">
              {errors.admins?.message || errors.admins?.root?.message}
            </div>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => append({ name: '', email: '', mobile: '+91' })}
          >
            + Add another administrator
          </button>
        </div>
        ) : null}
      </form>
    </QuirriModal>
  );
}

export default function CollegesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [universityFilter, setUniversityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [collegeModal, setCollegeModal] = useState(false);
  const [viewCollege, setViewCollege] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formDefaults, setFormDefaults] = useState(EMPTY_FORM);
  const [togglingId, setTogglingId] = useState(null);
  const [viewDepts, setViewDepts] = useState([]);
  const [viewDeptsLoading, setViewDeptsLoading] = useState(false);
  const [viewDeptsError, setViewDeptsError] = useState('');

  const { data: uniData } = useAsyncResource(
    () => fetchData(() => universitiesApi.list({})),
    [],
  );
  const universities = useMemo(() => asList(uniData, []), [uniData]);

  const listParams = useMemo(() => ({
    q: search.trim() || undefined,
    university_id: universityFilter || undefined,
    is_active: status === '' ? undefined : status === 'true',
    page,
    page_size: PAGE_SIZE,
  }), [search, status, universityFilter, page]);

  const { data, loading, error, reload } = useAsyncResource(
    () => fetchData(() => collegesApi.list(listParams)),
    [listParams],
  );

  const colleges = useMemo(() => asList(data, []), [data]);
  const total = data?.total ?? colleges.length;
  const pageSize = data?.page_size ?? PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const openCreate = () => {
    setEditingId(null);
    setFormDefaults({ ...EMPTY_FORM });
    setCollegeModal(true);
  };

  const openEdit = (college) => {
    setEditingId(college.id);
    setFormDefaults({
      name: college.name ?? '',
      code: college.code ?? '',
      country: INDIA_COUNTRY.code,
      state: college.state ?? '',
      district: college.district ?? '',
      city: college.city ?? '',
      pincode: college.pincode ?? '',
      student_seat_cap: college.student_seat_cap ?? college.student_limit ?? college.seat_cap ?? '',
      university_id: college.university_id ? String(college.university_id) : '',
      admins: [{ name: '', email: '', mobile: '+91' }],
    });
    setCollegeModal(true);
  };

  const openView = async (college) => {
    setViewDepts([]);
    setViewDeptsError('');
    setViewDeptsLoading(true);
    try {
      const detail = unwrap(await collegesApi.get(college.id));
      setViewCollege(detail || college);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load college details.'));
      setViewCollege(college);
    }
    try {
      const deptData = unwrap(await departmentsApi.list({
        college_id: college.id,
        page: 1,
        pageSize: 100,
      }));
      setViewDepts(asList(deptData, []));
    } catch (err) {
      setViewDepts([]);
      setViewDeptsError(apiErrorMessage(err, 'Could not load departments.'));
    } finally {
      setViewDeptsLoading(false);
    }
  };

  const handleToggleActive = async (college) => {
    setTogglingId(college.id);
    try {
      const active = college.is_active !== false;
      if (active) {
        await collegesApi.deactivate(college.id);
        toast.success('College deactivated');
      } else {
        await collegesApi.reactivate(college.id);
        toast.success('College reactivated');
      }
      reload();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to update status'));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="section-head">
        <div>
          <div className="t">Colleges</div>
          <div className="d">
            Onboard a member college under a university, provision its administrators, and set its student seat cap.
          </div>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          {IconPlus}
          New College
        </button>
      </div>

      <div className="toolbar">
        <SearchBox
          placeholder="Search college, code, or admin email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <QuirriSelect
          ariaLabel="Filter by university"
          value={universityFilter}
          onChange={(e) => {
            setUniversityFilter(e.target.value);
            setPage(1);
          }}
          placeholder="All universities"
          options={universities.map((u) => ({ value: u.id, label: u.name }))}
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
            <b>Could not load colleges</b>
            {apiErrorMessage(error, 'Please try again.')}
          </div>
        </div>
      ) : null}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>College</th>
              <th>University</th>
              <th>Admins</th>
              <th>Depts</th>
              <th>Students / seat cap</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && !colleges.length ? (
              <tr><td colSpan={7}>Loading colleges…</td></tr>
            ) : null}
            {!loading && !colleges.length ? (
              <tr><td colSpan={7}>No colleges found.</td></tr>
            ) : null}
            {colleges.map((college) => {
              const students = Number(college.students ?? college.student_count ?? 0);
              const cap = Number(college.student_seat_cap ?? college.student_limit ?? college.seat_cap ?? 0);
              const pct = cap > 0 ? Math.min(100, Math.round((students / cap) * 100)) : 0;
              const active = college.is_active !== false;
              return (
                <tr key={college.id}>
                  <td>
                    <span className="strong">{college.name}</span>
                    <div className="sub">{college.code} · {[college.city, college.district, college.state].filter(Boolean).join(', ') || '—'}</div>
                  </td>
                  <td>{college.university || college.university_name || '—'}</td>
                  <td className="num">
                    {Array.isArray(college.admins)
                      ? college.admins.length
                      : (college.admin_count ?? college.admins ?? 0)}
                  </td>
                  <td className="num">{college.department_count ?? '—'}</td>
                  <td>
                    <span className="num">{students}</span>
                    {' '}
                    <span style={{ color: 'var(--muted-2)' }}>/ {cap || '—'}</span>
                    {cap > 0 ? (
                      <div className={`bar${pct >= 90 ? ' amber' : ''}`} style={{ marginTop: 5, maxWidth: 100 }}>
                        <i style={{ width: `${pct}%` }} />
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <QuirriBadge variant={statusVariant(active)}>
                      {active ? 'Active' : 'Inactive'}
                    </QuirriBadge>
                  </td>
                  <td className="actions">
                    <a onClick={() => openView(college)} role="button" tabIndex={0}>View</a>
                    <a onClick={() => openEdit(college)} role="button" tabIndex={0}>Edit</a>
                    <a
                      onClick={() => togglingId !== college.id && handleToggleActive(college)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleToggleActive(college)}
                      style={{ opacity: togglingId === college.id ? 0.5 : 1 }}
                    >
                      {togglingId === college.id
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

      {collegeModal ? (
        <CollegeFormModal
          key={editingId || 'create-college'}
          open={collegeModal}
          editingId={editingId}
          initialValues={formDefaults}
          universities={universities}
          onClose={() => setCollegeModal(false)}
          onSaved={reload}
        />
      ) : null}

      <QuirriModal
        open={Boolean(viewCollege)}
        onClose={() => setViewCollege(null)}
        title={viewCollege?.name || 'College'}
        crumb={[
          viewCollege?.university || viewCollege?.university_name,
          viewCollege?.code,
          [viewCollege?.city, viewCollege?.district, viewCollege?.state, viewCollege?.pincode]
            .filter(Boolean)
            .join(', '),
        ].filter(Boolean).join(' · ')}
        wide
        footer={(
          <button type="button" className="btn btn-ghost" onClick={() => setViewCollege(null)}>Close</button>
        )}
      >
        {viewCollege ? (
          <>
            <QuirriPillList items={[
              `${viewCollege.students ?? viewCollege.student_count ?? 0} Students`,
              `${Array.isArray(viewCollege.admins)
                ? viewCollege.admins.length
                : (viewCollege.admin_count ?? 0)} Administrators`,
              `Seat cap ${viewCollege.student_seat_cap ?? '—'}`,
            ]} />
            <div className="lb" style={{ fontSize: 10.5, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--muted-2)', fontWeight: 800, marginBottom: 10, marginTop: 4 }}>
              Administrators
            </div>
            <div className="card" style={{ marginBottom: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!(Array.isArray(viewCollege.admins) && viewCollege.admins.length) ? (
                    <tr><td colSpan={4}>No administrators on file.</td></tr>
                  ) : null}
                  {(viewCollege.admins || []).map((admin) => {
                    const st = String(admin.status || '').toLowerCase();
                    let variant = 'grey';
                    let label = admin.status || '—';
                    if (st === 'active') {
                      variant = 'green';
                      label = 'Active';
                    } else if (st.includes('pending')) {
                      variant = 'amber';
                      label = 'Pending activation';
                    } else if (st.includes('deactiv') || st === 'inactive') {
                      variant = 'red';
                      label = 'Deactivated';
                    }
                    return (
                      <tr key={admin.id || admin.email}>
                        <td><span className="strong">{admin.name || '—'}</span></td>
                        <td>{admin.email || '—'}</td>
                        <td>{admin.phone_number || '—'}</td>
                        <td>
                          <QuirriBadge variant={variant}>{label}</QuirriBadge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="lb" style={{ fontSize: 10.5, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--muted-2)', fontWeight: 800, marginBottom: 10, marginTop: 4 }}>
              Departments
            </div>
            {viewDeptsError ? (
              <div className="notice err" style={{ marginBottom: 12 }}>
                <div>
                  <b>Could not load departments</b>
                  {viewDeptsError}
                </div>
              </div>
            ) : null}
            <div className="card">
              <table>
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>HOD</th>
                    <th>Students</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {viewDeptsLoading ? (
                    <tr><td colSpan={4}>Loading departments…</td></tr>
                  ) : null}
                  {!viewDeptsLoading && !viewDeptsError && !viewDepts.length ? (
                    <tr><td colSpan={4}>No departments for this college.</td></tr>
                  ) : null}
                  {viewDepts.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className="strong">{row.name}</span>
                        <div className="sub">{row.code || '—'}</div>
                      </td>
                      <td>{row.hod_name || '—'}</td>
                      <td className="num">{row.student_count ?? 0}</td>
                      <td>
                        <QuirriBadge variant={statusVariant(row.is_active !== false)}>
                          {row.is_active !== false ? 'Active' : 'Inactive'}
                        </QuirriBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </QuirriModal>
    </div>
  );
}

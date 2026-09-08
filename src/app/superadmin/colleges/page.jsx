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
import { collegesApi, universitiesApi, fetchData } from '@/lib/api/superadmin/modules';
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
  plan: 'standard',
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
          plan: values.plan,
          student_seat_cap: values.student_seat_cap,
        });
      } else {
        await collegesApi.create({
          university_id: values.university_id,
          name: values.name,
          code: values.code,
          ...locationPayload(values),
          plan: values.plan,
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
          <Controller
            control={control}
            name="plan"
            render={({ field, fieldState }) => (
              <QuirriSelect
                id="college-plan"
                label="Plan"
                hint="B2B institutional licence — institutions pay Knotopian; students never see billing."
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                error={fieldState.error?.message}
                options={[
                  { value: 'standard', label: 'Standard' },
                  { value: 'premium', label: 'Premium' },
                ]}
              />
            )}
          />
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
      plan: college.plan === 'premium' ? 'premium' : 'standard',
      student_seat_cap: college.student_seat_cap ?? college.student_limit ?? college.seat_cap ?? '',
      university_id: college.university_id ? String(college.university_id) : '',
      admins: [{ name: '', email: '', mobile: '+91' }],
    });
    setCollegeModal(true);
  };

  const openView = async (college) => {
    try {
      const detail = unwrap(await collegesApi.get(college.id));
      setViewCollege(detail || college);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load college details.'));
      setViewCollege({ ...college, departments_list: [] });
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

  const deptRows = asList(
    viewCollege?.departments_list || viewCollege?.departments || [],
    [],
  ).filter((row) => typeof row === 'object' && row !== null);

  return (
    <div className="animate-fade-in">
      <div className="section-head">
        <div>
          <div className="t">Colleges</div>
          <div className="d">
            Onboard a member college under a university, provision its administrators, and set its licence entitlement.
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
              <th>Licence</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && !colleges.length ? (
              <tr><td colSpan={8}>Loading colleges…</td></tr>
            ) : null}
            {!loading && !colleges.length ? (
              <tr><td colSpan={8}>No colleges found.</td></tr>
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
                  <td className="num">{college.admins ?? college.admin_count ?? 0}</td>
                  <td className="num">—</td>
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
                    <QuirriBadge variant="teal" plain>
                      {college.plan === 'premium' ? 'Premium' : 'Standard'}
                    </QuirriBadge>
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
              `${viewCollege.admins ?? viewCollege.admin_count ?? 0} Administrators`,
              `${viewCollege.plan === 'premium' ? 'Premium' : 'Standard'} plan`,
              `Seat cap ${viewCollege.student_seat_cap ?? '—'}`,
            ]} />
            <div className="notice info" style={{ marginBottom: 12 }}>
              <div>
                <b>Departments not available yet</b>
                Academic hierarchy (Department → Program → …) is EPIC-06 and not started on the backend.
              </div>
            </div>
            <div className="lb" style={{ fontSize: 10.5, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--muted-2)', fontWeight: 800, marginBottom: 10 }}>
              Departments
            </div>
            <div className="card">
              <table>
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>HOD</th>
                    <th>Students</th>
                    <th>Final year</th>
                    <th>Subjects</th>
                    <th>Avg score</th>
                  </tr>
                </thead>
                <tbody>
                  {!deptRows.length ? (
                    <tr><td colSpan={6}>No departments for this college.</td></tr>
                  ) : null}
                  {deptRows.map((row) => (
                    <tr key={row.id || row.department || row.name}>
                      <td><span className="strong">{row.department || row.name}</span></td>
                      <td>{row.hod || '—'}</td>
                      <td className="num">{row.students ?? row.student_count ?? '—'}</td>
                      <td className="num">{row.finalYear ?? row.final_year ?? '—'}</td>
                      <td className="num">{row.subjects ?? '—'}</td>
                      <td>
                        <QuirriBadge variant="green" plain>
                          {row.avg_score || row.score || '—'}
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

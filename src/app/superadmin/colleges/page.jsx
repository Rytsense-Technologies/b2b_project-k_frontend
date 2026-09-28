'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import {
  SearchBox,
  QuirriRHFField,
  QuirriSelect,
  IndiaLocationFields,
} from '@/components/superadmin/quirri-ui';
import { Icon, Kpi, SectionState } from '@/components/student/ui';
import { collegesApi, universitiesApi, departmentsApi, fetchData } from '@/lib/api/superadmin/modules';
import { asList, unwrap, apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { collegeCreateSchema, collegeUpdateSchema } from '@/lib/validation';
import { INDIA_COUNTRY, withIndiaPhoneDefault } from '@/lib/india';
import '@/styles/student-portal.css';
import '@/styles/superadmin-universities.css';
import '@/styles/superadmin-colleges.css';

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

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || 'C') + (parts[1]?.[0] || '')).toUpperCase();
}

function num(n) {
  return n == null || n === '' ? '—' : Number(n).toLocaleString('en-IN');
}

/** Normalise the fields the API returns under different names. */
function collegeStats(c) {
  const students = Number(c?.students ?? c?.student_count ?? 0);
  const cap = Number(c?.student_seat_cap ?? c?.student_limit ?? c?.seat_cap ?? 0);
  const admins = Array.isArray(c?.admins) ? c.admins.length : (c?.admin_count ?? c?.admins ?? 0);
  const pct = cap > 0 ? Math.min(100, Math.round((students / cap) * 100)) : 0;
  return {
    students,
    cap,
    admins: Number(admins) || 0,
    depts: c?.department_count,
    pct,
    active: c?.is_active !== false,
    university: c?.university || c?.university_name || '',
    location: [c?.city, c?.district, c?.state].filter(Boolean).join(', '),
  };
}

function adminStatus(status) {
  const st = String(status || '').toLowerCase();
  if (st === 'active') return { cls: 'sp-pill--good', label: 'Active' };
  if (st.includes('pending')) return { cls: 'sp-pill--low', label: 'Pending activation' };
  if (st.includes('deactiv') || st === 'inactive') return { cls: 'sp-pill--err', label: 'Deactivated' };
  return { cls: '', label: status || '—' };
}

function SeatBar({ students, cap, pct, compact = false }) {
  return (
    <div className={`co-seat${compact ? ' is-compact' : ''}${pct >= 90 ? ' is-high' : ''}`}>
      <div className="co-seat-h">
        <span><b>{num(students)}</b> / {cap ? num(cap) : '—'} seats</span>
        {cap ? <span className="co-seat-pct">{pct}%</span> : null}
      </div>
      <span className="co-seat-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
    </div>
  );
}

/* ------------------------------------------------------------------ form */
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
  const { fields, append, remove } = useFieldArray({ control, name: 'admins' });
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
          <button type="button" className="sd-btn sd-btn--ghost" onClick={onClose}>Cancel</button>
          <div className="right">
            <button type="button" className="sd-btn sd-btn--amber" onClick={onSave} disabled={saving}>
              <Icon name="tick" size={16} />
              {saving ? 'Saving…' : (editingId ? 'Save changes' : 'Create college')}
            </button>
          </div>
        </>
      )}
    >
      <form onSubmit={onSave} noValidate className="un-form">
        <section className="un-form-sec">
          <div className="un-form-h">
            <span className="un-form-n">1</span>
            <div>
              <b>College details</b>
              <small>The university it belongs to, its name and a unique code.</small>
            </div>
          </div>
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
              hint={editingId ? 'Code cannot be changed after create.' : 'Must be unique.'}
            />
          </div>
        </section>

        <section className="un-form-sec">
          <div className="un-form-h">
            <span className="un-form-n">2</span>
            <div>
              <b>Location</b>
              <small>India only — state, district, city and pincode.</small>
            </div>
          </div>
          <div className="grid2">
            <IndiaLocationFields control={control} setValue={setValue} />
          </div>
        </section>

        <section className="un-form-sec">
          <div className="un-form-h">
            <span className="un-form-n">3</span>
            <div>
              <b>Student capacity</b>
              <small>How many students this college can enrol.</small>
            </div>
          </div>
          <div className="grid2">
            <QuirriRHFField
              control={control}
              name="student_seat_cap"
              fieldType="positiveInt"
              label="Student seat cap"
              placeholder="5000"
              hint="Adding a student beyond the cap is refused with a clear message."
            />
          </div>
        </section>

        {!editingId ? (
          <section className="un-form-sec">
            <div className="un-form-h">
              <span className="un-form-n">4</span>
              <div>
                <b>College administrators</b>
                <small>Each admin receives an activation link. You never set their password.</small>
              </div>
            </div>
            <div className="co-admins-form">
              {fields.map((row, index) => (
                <div className="co-admin-card" key={row.id}>
                  <div className="co-admin-card-h">
                    <span className="co-admin-n">Admin {index + 1}</span>
                    {fields.length > 1 ? (
                      <button
                        type="button"
                        className="sp-link co-remove"
                        onClick={() => remove(index)}
                        aria-label={`Remove administrator ${index + 1}`}
                      >
                        <Icon name="trash" size={14} /> Remove
                      </button>
                    ) : null}
                  </div>
                  <div className="grid3">
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
                </div>
              ))}
            </div>
            {errors.admins?.message || errors.admins?.root?.message ? (
              <div className="hint field-error" role="alert">
                {errors.admins?.message || errors.admins?.root?.message}
              </div>
            ) : null}
            <button
              type="button"
              className="sp-drop co-add-admin"
              onClick={() => append({ name: '', email: '', mobile: '+91' })}
            >
              <Icon name="user" size={16} /> Add another administrator
            </button>
          </section>
        ) : null}

        {Object.keys(errors).length > 0 ? (
          <div className="hint field-error" role="alert">
            Check the highlighted fields and try again.
          </div>
        ) : null}
      </form>
    </QuirriModal>
  );
}

/* ------------------------------------------------------ status confirm */
function StatusConfirm({ college, busy, onCancel, onConfirm }) {
  if (!college) return null;
  const s = collegeStats(college);
  const deactivating = s.active;
  return (
    <QuirriModal
      open
      onClose={onCancel}
      title={deactivating ? 'Deactivate college?' : 'Reactivate college?'}
      crumb={[college.name, college.code].filter(Boolean).join(' · ')}
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
      <div className={`un-confirm${deactivating ? ' is-danger' : ''}`}>
        <span className="un-confirm-ic"><Icon name={deactivating ? 'lock' : 'refresh'} size={22} /></span>
        <div>
          <b>{deactivating ? 'This is a soft delete.' : 'The college becomes active again.'}</b>
          <p>
            {deactivating
              ? `${college.name} is hidden from active lists. Its ${num(s.students)} student(s), ${num(s.admins)} admin(s) and departments are kept, and you can reactivate it at any time.`
              : `${college.name} will appear in active lists again.`}
          </p>
        </div>
      </div>
    </QuirriModal>
  );
}

/* -------------------------------------------------------------- drawer */
function CollegeDrawer({
  college,
  depts,
  deptsLoading,
  deptsError,
  detailLoading,
  onClose,
  onEdit,
  onToggle,
}) {
  useEffect(() => {
    if (!college) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [college, onClose]);

  if (!college) return null;
  const s = collegeStats(college);
  const admins = Array.isArray(college.admins) ? college.admins : [];

  return (
    <div className="un-drawer-wrap" role="presentation" onClick={onClose}>
      <aside
        className="un-drawer co-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`${college.name} details`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="un-drawer-hero">
          <button type="button" className="un-drawer-x" onClick={onClose} aria-label="Close details">
            <Icon name="x" size={18} />
          </button>
          <span className="un-mono un-mono--lg">{initials(college.name)}</span>
          <div className="sp-banner-eyebrow">{s.university || 'College'}</div>
          <h2>{college.name}</h2>
          <div className="sp-banner-meta">
            {college.code ? <span className="sp-pill sp-pill--glass">{college.code}</span> : null}
            <span className={`sp-pill ${s.active ? 'sp-pill--good' : 'sp-pill--err'}`}>
              {s.active ? 'Active' : 'Inactive'}
            </span>
            {s.location ? <span className="sp-pill sp-pill--glass"><Icon name="pin" size={13} /> {s.location}</span> : null}
          </div>
        </div>

        <div className="un-drawer-body">
          <div className="co-drawer-stats">
            <div><small>Students</small><b>{num(s.students)}</b></div>
            <div><small>Administrators</small><b>{num(s.admins)}</b></div>
            <div><small>Departments</small><b>{deptsLoading ? '…' : num(depts.length)}</b></div>
          </div>

          <section className="un-drawer-sec">
            <div className="un-drawer-sec-h">
              <h3>Seat usage</h3>
              <span className="sp-pill sp-pill--teal">Seat cap {s.cap ? num(s.cap) : '—'}</span>
            </div>
            <SeatBar students={s.students} cap={s.cap} pct={s.pct} />
            {s.pct >= 90 ? (
              <p className="co-warn"><Icon name="info" size={14} /> Close to the seat cap — new students may be refused.</p>
            ) : null}
          </section>

          <section className="un-drawer-sec">
            <div className="un-drawer-sec-h">
              <h3>Administrators</h3>
              <span className="sp-pill">{admins.length}</span>
            </div>
            {detailLoading && !admins.length ? <SectionState title="Loading administrators…" /> : null}
            {!detailLoading && !admins.length ? (
              <SectionState title="No administrators on file." />
            ) : null}
            {admins.length ? (
              <ul className="co-people">
                {admins.map((admin) => {
                  const st = adminStatus(admin.status);
                  return (
                    <li key={admin.id || admin.email}>
                      <span className="co-avatar">{initials(admin.name || admin.email)}</span>
                      <div className="sp-row-main">
                        <b>{admin.name || '—'}</b>
                        <div className="sp-row-meta">
                          {admin.email ? <span>{admin.email}</span> : null}
                          {admin.phone_number ? <span>· {admin.phone_number}</span> : null}
                        </div>
                      </div>
                      <span className={`sp-pill ${st.cls}`}>{st.label}</span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>

          <section className="un-drawer-sec">
            <div className="un-drawer-sec-h">
              <h3>Departments</h3>
              <span className="sp-pill">{deptsLoading ? '…' : depts.length}</span>
            </div>
            {deptsError ? (
              <SectionState tone="err" title="Could not load departments">{deptsError}</SectionState>
            ) : null}
            {deptsLoading ? <SectionState title="Loading departments…" /> : null}
            {!deptsLoading && !deptsError && !depts.length ? (
              <SectionState title="No departments for this college." />
            ) : null}
            {depts.length ? (
              <ul className="co-depts">
                {depts.map((row) => (
                  <li key={row.id}>
                    <span className="co-dept-code">{row.code || initials(row.name)}</span>
                    <div className="sp-row-main">
                      <b>{row.name}</b>
                      <div className="sp-row-meta">
                        <span><Icon name="user" size={12} /> HOD: {row.hod_name || 'Not assigned'}</span>
                      </div>
                    </div>
                    <span className="un-college-count">
                      {num(row.student_count ?? 0)}
                      <small>students</small>
                    </span>
                    <span className={`sp-pill ${row.is_active !== false ? 'sp-pill--good' : 'sp-pill--err'}`}>
                      {row.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>

        <div className="un-drawer-foot">
          <button
            type="button"
            className={`sd-btn sd-btn--sm ${s.active ? 'sd-btn--danger' : 'sd-btn--outline'}`}
            onClick={() => onToggle(college)}
          >
            {s.active ? 'Deactivate' : 'Reactivate'}
          </button>
          <button type="button" className="sd-btn sd-btn--teal sd-btn--sm" onClick={() => onEdit(college)}>
            <Icon name="edit" size={16} /> Edit college
          </button>
        </div>
      </aside>
    </div>
  );
}

/* ---------------------------------------------------------------- page */
export default function CollegesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [universityFilter, setUniversityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [view, setView] = useState('grid');
  const [collegeModal, setCollegeModal] = useState(false);
  const [viewCollege, setViewCollege] = useState(null);
  const [viewDetailLoading, setViewDetailLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formDefaults, setFormDefaults] = useState(EMPTY_FORM);
  const [togglingId, setTogglingId] = useState(null);
  const [confirmCollege, setConfirmCollege] = useState(null);
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

  /* Status totals for the summary row — read-only list calls, 1 row each. */
  const { data: counts, reload: reloadCounts } = useAsyncResource(async () => {
    const [all, active, inactive] = await Promise.all([
      fetchData(() => collegesApi.list({ page: 1, page_size: 1 })),
      fetchData(() => collegesApi.list({ page: 1, page_size: 1, is_active: true })),
      fetchData(() => collegesApi.list({ page: 1, page_size: 1, is_active: false })),
    ]);
    const total = (d) => (d?.total != null ? d.total : asList(d, []).length);
    return { all: total(all), active: total(active), inactive: total(inactive) };
  }, []);

  const colleges = useMemo(() => asList(data, []), [data]);
  const total = data?.total ?? colleges.length;
  const pageSize = data?.page_size ?? PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const listedAll = colleges.length >= total;
  const seatTotals = colleges.reduce((acc, c) => {
    const s = collegeStats(c);
    return { students: acc.students + s.students, cap: acc.cap + s.cap };
  }, { students: 0, cap: 0 });
  const seatPct = seatTotals.cap ? Math.round((seatTotals.students / seatTotals.cap) * 100) : null;
  const filtersOn = Boolean(search || status || universityFilter);

  const refreshAll = async () => {
    await reload();
    reloadCounts().catch(() => {});
  };

  const openCreate = () => {
    setEditingId(null);
    setFormDefaults({ ...EMPTY_FORM });
    setCollegeModal(true);
  };

  const openEdit = (college) => {
    setViewCollege(null);
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
    // Open the panel straight away with list values, then fill in detail.
    setViewCollege(college);
    setViewDepts([]);
    setViewDeptsError('');
    setViewDeptsLoading(true);
    setViewDetailLoading(true);
    try {
      const detail = unwrap(await collegesApi.get(college.id));
      setViewCollege(detail || college);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load college details.'));
      setViewCollege(college);
    } finally {
      setViewDetailLoading(false);
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
      setConfirmCollege(null);
      setViewCollege(null);
      refreshAll().catch(() => {});
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to update status'));
    } finally {
      setTogglingId(null);
    }
  };

  const closeDrawer = useCallback(() => setViewCollege(null), []);
  const askToggle = (college) => {
    setViewCollege(null);
    setConfirmCollege(college);
  };

  const RowActions = ({ college }) => {
    const active = college.is_active !== false;
    return (
      <div className="un-actions">
        <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => openView(college)}>
          View
        </button>
        <button type="button" className="un-icon-btn" onClick={() => openEdit(college)} aria-label={`Edit ${college.name}`}>
          <Icon name="edit" size={16} />
        </button>
        <button
          type="button"
          className={`un-icon-btn${active ? ' is-danger' : ''}`}
          onClick={() => askToggle(college)}
          disabled={togglingId === college.id}
          aria-label={active ? `Deactivate ${college.name}` : `Reactivate ${college.name}`}
        >
          <Icon name={active ? 'lock' : 'refresh'} size={16} />
        </button>
      </div>
    );
  };

  return (
    <div className="animate-fade-in sp un-page">
      <section className="sp-banner un-banner">
        <div className="sp-banner-ic" aria-hidden="true"><Icon name="layers" size={26} /></div>
        <div className="sp-banner-copy">
          <div className="sp-banner-eyebrow">Institutions</div>
          <h2>Colleges</h2>
          <p className="un-banner-lede">
            Onboard a member college under a university, provision its administrators, and set its student seat cap.
          </p>
          <div className="un-hier" aria-label="Hierarchy">
            <span>University</span>
            <Icon name="chev" size={14} />
            <span className="is-on">College</span>
            <Icon name="chev" size={14} />
            <span>Department</span>
          </div>
        </div>
        <div className="sp-banner-cta">
          <button type="button" className="sd-btn sd-btn--amber" onClick={openCreate}>
            <Icon name="spark" size={16} /> New College
          </button>
        </div>
      </section>

      <section className="sd-kpis" aria-label="Colleges summary">
        <Kpi icon="layers" label="Total colleges" value={counts ? num(counts.all) : null} sub="Across all universities" />
        <Kpi icon="tick" label="Active" value={counts ? num(counts.active) : null} sub="Onboarded and live" />
        <Kpi icon="lock" label="Inactive" value={counts ? num(counts.inactive) : null} sub="Soft-deleted, restorable" />
        <Kpi
          icon="user"
          label="Seat usage"
          value={colleges.length ? `${num(seatTotals.students)} / ${num(seatTotals.cap)}` : null}
          sub={seatPct != null ? `${seatPct}% used · ${listedAll ? 'listed colleges' : 'this page'}` : 'Students vs seat cap'}
        />
      </section>

      <section className="sp-panel un-toolbar">
        <div className="toolbar">
          <SearchBox
            placeholder="Search college, code, or admin email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <div className="co-uni-filter">
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
          </div>
          <div className="sp-tabs un-seg" role="tablist" aria-label="Filter by status">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.label}
                type="button"
                role="tab"
                className="sp-tab"
                aria-selected={status === f.value}
                onClick={() => {
                  setStatus(f.value);
                  setPage(1);
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="sp-tabs un-seg" role="tablist" aria-label="View">
            <button type="button" role="tab" className="sp-tab" aria-selected={view === 'grid'} onClick={() => setView('grid')} aria-label="Card view">
              <Icon name="grid" size={16} />
            </button>
            <button type="button" role="tab" className="sp-tab" aria-selected={view === 'list'} onClick={() => setView('list')} aria-label="List view">
              <Icon name="list" size={16} />
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <SectionState
          tone="err"
          title="Could not load colleges"
          action={(
            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => refreshAll().catch(() => {})}>
              <Icon name="refresh" size={16} /> Try again
            </button>
          )}
        >
          {apiErrorMessage(error, 'Please try again.')}
        </SectionState>
      ) : null}

      {loading && !colleges.length ? <SectionState title="Loading colleges…" /> : null}

      {!loading && !error && !colleges.length ? (
        <SectionState
          title={filtersOn ? 'No colleges match these filters' : 'No colleges yet'}
          action={!filtersOn ? (
            <button type="button" className="sd-btn sd-btn--amber sd-btn--sm" onClick={openCreate}>Onboard the first college</button>
          ) : null}
        >
          {filtersOn ? 'Try a different name, university or status.' : 'Colleges you onboard appear here.'}
        </SectionState>
      ) : null}

      {colleges.length && view === 'grid' ? (
        <div className="un-grid">
          {colleges.map((college) => {
            const s = collegeStats(college);
            return (
              <article key={college.id} className={`un-card${s.active ? '' : ' is-inactive'}`}>
                <button type="button" className="un-card-main" onClick={() => openView(college)}>
                  <div className="un-card-top">
                    <span className="un-mono">{initials(college.name)}</span>
                    <span className={`sp-pill ${s.active ? 'sp-pill--good' : 'sp-pill--err'}`}>
                      <i className="un-dot" aria-hidden="true" />
                      {s.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <h3>{college.name}</h3>
                  <div className="un-card-meta">
                    {college.code ? <span className="un-code">{college.code}</span> : null}
                    <span><Icon name="book" size={13} /> {s.university || 'No university'}</span>
                  </div>
                  <div className="un-card-meta">
                    <span><Icon name="pin" size={13} /> {s.location || 'Location not set'}</span>
                  </div>
                  <div className="co-card-stats">
                    <div><b>{num(s.admins)}</b><small>Admins</small></div>
                    <div><b>{num(s.depts)}</b><small>Depts</small></div>
                    <div><b>{num(s.students)}</b><small>Students</small></div>
                  </div>
                  <SeatBar students={s.students} cap={s.cap} pct={s.pct} compact />
                </button>
                <div className="un-card-foot">
                  <RowActions college={college} />
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {colleges.length && view === 'list' ? (
        <section className="sp-panel">
          <div className="sp-table-wrap">
            <table className="sp-table un-table">
              <thead>
                <tr>
                  <th>College</th>
                  <th>University</th>
                  <th className="num">Admins</th>
                  <th className="num">Depts</th>
                  <th>Students / seat cap</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {colleges.map((college) => {
                  const s = collegeStats(college);
                  return (
                    <tr key={college.id}>
                      <td>
                        <button type="button" className="un-name-btn" onClick={() => openView(college)}>
                          <span className="un-mono un-mono--sm">{initials(college.name)}</span>
                          <span>
                            <b>{college.name}</b>
                            <small>{[college.code, s.location].filter(Boolean).join(' · ') || '—'}</small>
                          </span>
                        </button>
                      </td>
                      <td>{s.university || '—'}</td>
                      <td className="num"><b>{num(s.admins)}</b></td>
                      <td className="num"><b>{num(s.depts)}</b></td>
                      <td className="co-seat-cell"><SeatBar students={s.students} cap={s.cap} pct={s.pct} compact /></td>
                      <td>
                        <span className={`sp-pill ${s.active ? 'sp-pill--good' : 'sp-pill--err'}`}>
                          <i className="un-dot" aria-hidden="true" />
                          {s.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td><RowActions college={college} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {totalPages > 1 ? (
        <div className="un-pager">
          <span>{num(total)} colleges · page {page} of {totalPages}</span>
          <div>
            <button
              type="button"
              className="sd-btn sd-btn--ghost sd-btn--sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <Icon name="back" size={14} /> Previous
            </button>
            <button
              type="button"
              className="sd-btn sd-btn--ghost sd-btn--sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <Icon name="chev" size={14} />
            </button>
          </div>
        </div>
      ) : null}

      <CollegeDrawer
        college={viewCollege}
        depts={viewDepts}
        deptsLoading={viewDeptsLoading}
        deptsError={viewDeptsError}
        detailLoading={viewDetailLoading}
        onClose={closeDrawer}
        onEdit={openEdit}
        onToggle={askToggle}
      />

      <StatusConfirm
        college={confirmCollege}
        busy={Boolean(confirmCollege && togglingId === confirmCollege.id)}
        onCancel={() => setConfirmCollege(null)}
        onConfirm={() => confirmCollege && handleToggleActive(confirmCollege)}
      />

      {collegeModal ? (
        <CollegeFormModal
          key={editingId || 'create-college'}
          open={collegeModal}
          editingId={editingId}
          initialValues={formDefaults}
          universities={universities}
          onClose={() => setCollegeModal(false)}
          onSaved={() => refreshAll().catch(() => {})}
        />
      ) : null}
    </div>
  );
}

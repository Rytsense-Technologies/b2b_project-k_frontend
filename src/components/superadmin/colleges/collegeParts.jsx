'use client';

/**
 * Colleges module parts shared by the list (/superadmin/colleges) and the college
 * page (/superadmin/colleges/[id]): form, status confirm, drawer, seat bar, helpers.
 */
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useOverlay } from '@/components/superadmin/overlayStack';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { QuirriRHFField, QuirriSelect, IndiaLocationFields } from '@/components/superadmin/quirri-ui';
import { Icon, SectionState } from '@/components/shared/module-ui';
import ScoreRing from '@/components/shared/ScoreRing';
import { collegesApi } from '@/lib/api/superadmin/modules';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import { collegeCreateSchema, collegeUpdateSchema } from '@/lib/validation';
import { INDIA_COUNTRY, withIndiaPhoneDefault } from '@/lib/india';
import { formatIndianPhone } from '@/lib/superadmin/format';

export const EMPTY_FORM = {
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

export const PAGE_SIZE = 10;

/** A college at or above this share of its seat cap is "near the cap". */
export const NEAR_CAP_PCT = 90;

export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || 'C') + (parts[1]?.[0] || '')).toUpperCase();
}

export function num(n) {
  return n == null || n === '' ? '—' : Number(n).toLocaleString('en-IN');
}

/** Normalise the fields the API returns under different names. */
export function collegeStats(c) {
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
    // City and state only; district usually repeats the city.
    location: [c?.city || c?.district, c?.state].filter(Boolean).join(', '),
  };
}

export function adminStatus(status) {
  const st = String(status || '').toLowerCase();
  if (st === 'active') return { cls: 'sp-pill--good', label: 'Active' };
  if (st.includes('pending')) return { cls: 'sp-pill--low', label: 'Pending activation' };
  if (st.includes('deactiv') || st === 'inactive') return { cls: 'sp-pill--off', label: 'Deactivated' };
  return { cls: '', label: status || '—' };
}

/** Seat usage as a small ring (modern-cards-plan: single meters → ScoreRing). The % sits in the text so "<1%" reads exactly. */
export function SeatBar({ students, cap, pct, compact = false }) {
  const high = pct >= 90;
  const pctLabel = cap ? `${pct === 0 && students > 0 ? '<1' : pct}%` : null;
  return (
    <div className={`co-seat co-seat--ring${compact ? ' is-compact' : ''}${high ? ' is-high' : ''}`}>
      <ScoreRing
        score={cap ? pct : null}
        size={compact ? 'xs' : 'sm'}
        suffix="%"
        color={high ? 'var(--accent-text)' : 'var(--teal-700)'}
        label={cap ? `Seat usage ${pctLabel}` : 'No seat cap set'}
        className="co-seat-ring"
      />
      <div className="co-seat-h">
        <span><b>{num(students)}</b> / {cap ? num(cap) : '—'} seats</span>
        {pctLabel ? <span className="co-seat-pct">{pctLabel} used</span> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ form */
export function CollegeFormModal({
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
export function StatusConfirm({ college, busy, onCancel, onConfirm }) {
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
          <b>{deactivating ? 'Nothing is deleted.' : 'The college becomes active again.'}</b>
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
export function CollegeDrawer({
  college,
  depts,
  deptsLoading,
  deptsError,
  detailLoading,
  resendingEmail,
  onClose,
  onEdit,
  onToggle,
  onResend,
}) {
  // Shared overlay stack: focus trap, scroll lock, Esc closes only the topmost layer.
  const panelRef = useRef(null);
  useOverlay(Boolean(college), panelRef, onClose);

  if (!college) return null;
  const s = collegeStats(college);
  const admins = Array.isArray(college.admins) ? college.admins : [];

  return (
    <div className="un-drawer-wrap" role="presentation" onClick={onClose}>
      <aside
        ref={panelRef}
        tabIndex={-1}
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
            <span className={`sp-pill ${s.active ? 'sp-pill--good' : 'sp-pill--off'}`}>
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
                          {admin.phone_number ? <span>· {formatIndianPhone(admin.phone_number)}</span> : null}
                        </div>
                      </div>
                      <span className={`sp-pill ${st.cls}`}>{st.label}</span>
                      {String(admin.status || '').includes('pending') && admin.email ? (
                        <button
                          type="button"
                          className="sd-btn sd-btn--ghost sd-btn--sm"
                          onClick={() => onResend(admin)}
                          disabled={resendingEmail === admin.email}
                        >
                          <Icon name="send" size={14} /> {resendingEmail === admin.email ? 'Sending…' : 'Resend invite'}
                        </button>
                      ) : null}
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
                      <small>{Number(row.student_count ?? 0) === 1 ? 'student' : 'students'}</small>
                    </span>
                    <span className={`sp-pill ${row.is_active !== false ? 'sp-pill--good' : 'sp-pill--off'}`}>
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
          <Link className="sd-btn sd-btn--ghost sd-btn--sm" href={`/superadmin/colleges/${college.id}`}>
            Open college page
          </Link>
          <button type="button" className="sd-btn sd-btn--teal sd-btn--sm" onClick={() => onEdit(college)}>
            <Icon name="edit" size={16} /> Edit college
          </button>
        </div>
      </aside>
    </div>
  );
}


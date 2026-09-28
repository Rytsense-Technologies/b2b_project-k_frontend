'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { SearchBox, QuirriRHFField, IndiaLocationFields } from '@/components/superadmin/quirri-ui';
import { Icon, Kpi, SectionState } from '@/components/student/ui';
import { universitiesApi, collegesApi, fetchData } from '@/lib/api/superadmin/modules';
import { asList, apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import {
  universityCreateSchema,
  universityUpdateSchema,
} from '@/lib/validation';
import { INDIA_COUNTRY } from '@/lib/india';
import '@/styles/student-portal.css';
import '@/styles/superadmin-universities.css';

const EMPTY_FORM = {
  name: '',
  code: '',
  country: INDIA_COUNTRY.code,
  state: '',
  district: '',
  city: '',
  pincode: '',
  address: '',
};

const PAGE_SIZE = 25;

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || 'U') + (parts[1]?.[0] || '')).toUpperCase();
}

function locationLine(row) {
  return [row?.city, row?.district, row?.state, row?.pincode].filter(Boolean).join(', ');
}

function countLabel(n) {
  return n == null ? '—' : Number(n).toLocaleString('en-IN');
}

/* ------------------------------------------------------------------ form */
function UniversityFormModal({
  open,
  editingId,
  initialValues,
  onClose,
  onSaved,
}) {
  const schema = editingId ? universityUpdateSchema : universityCreateSchema;
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

  const [saving, setSaving] = useState(false);

  const onSave = handleSubmit(async (values) => {
    setSaving(true);
    try {
      const location = {
        country: INDIA_COUNTRY.code,
        state: values.state || null,
        district: values.district || null,
        city: values.city || null,
        pincode: values.pincode || null,
        address: values.address || null,
      };
      if (editingId) {
        await universitiesApi.update(editingId, {
          name: values.name,
          ...location,
        });
        toast.success('University updated');
      } else {
        await universitiesApi.create({
          name: values.name,
          code: values.code,
          ...location,
        });
        toast.success('University created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to save university'));
    } finally {
      setSaving(false);
    }
  });

  return (
    <QuirriModal
      open={open}
      onClose={onClose}
      title={editingId ? 'Edit university' : 'Add university'}
      crumb="Top level of the academic hierarchy"
      wide
      footer={(
        <>
          <button type="button" className="sd-btn sd-btn--ghost" onClick={onClose}>Cancel</button>
          <div className="right">
            <button type="button" className="sd-btn sd-btn--amber" onClick={onSave} disabled={saving}>
              <Icon name="tick" size={16} />
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create university'}
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
              <b>Identity</b>
              <small>Name students and colleges will see, and a unique code.</small>
            </div>
          </div>
          <div className="grid2">
            <QuirriRHFField
              control={control}
              name="name"
              fieldType="institutionName"
              label="University name"
              placeholder="e.g. Anna University"
            />
            <QuirriRHFField
              control={control}
              name="code"
              fieldType="code"
              label="University code"
              placeholder="UNI-0004"
              disabled={Boolean(editingId)}
              hint={
                editingId
                  ? 'Code cannot be changed after create (colleges reference it).'
                  : 'Must be unique.'
              }
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
          <QuirriRHFField
            control={control}
            name="address"
            fieldType="address"
            label="Address"
            placeholder="Optional street or campus address"
            full
          />
        </section>

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
  const deactivating = row.is_active;
  return (
    <QuirriModal
      open
      onClose={onCancel}
      title={deactivating ? 'Deactivate university?' : 'Reactivate university?'}
      crumb={`${row.name} · ${row.code}`}
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
          <b>{deactivating ? 'This is a soft delete.' : 'The university becomes active again.'}</b>
          <p>
            {deactivating
              ? `${row.name} is hidden from active lists. Its ${countLabel(row.college_count)} college(s) and records are kept, and you can reactivate it at any time.`
              : `${row.name} will appear in active lists and can have colleges onboarded again.`}
          </p>
        </div>
      </div>
    </QuirriModal>
  );
}

/* -------------------------------------------------------------- drawer */
function UniversityDrawer({ row, onClose, onEdit, onToggle }) {
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!row) return undefined;
    let cancelled = false;
    setDetail(null);
    fetchData(() => universitiesApi.get(row.id))
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch(() => {});
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelled = true;
      document.removeEventListener('keydown', onKey);
    };
  }, [row, onClose]);

  const { data: collegesData, loading: collegesLoading, error: collegesError } = useAsyncResource(
    async () => (row ? fetchData(() => collegesApi.list({ university_id: row.id, page_size: 50 })) : null),
    [row?.id],
  );

  if (!row) return null;
  const u = { ...row, ...(detail || {}) };
  const colleges = asList(collegesData, []);

  return (
    <div className="un-drawer-wrap" role="presentation" onClick={onClose}>
      <aside
        className="un-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`${u.name} details`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="un-drawer-hero">
          <button type="button" className="un-drawer-x" onClick={onClose} aria-label="Close details">
            <Icon name="x" size={18} />
          </button>
          <span className="un-mono un-mono--lg">{initials(u.name)}</span>
          <div className="sp-banner-eyebrow">University</div>
          <h2>{u.name}</h2>
          <div className="sp-banner-meta">
            <span className="sp-pill sp-pill--glass">{u.code}</span>
            <span className={`sp-pill ${u.is_active ? 'sp-pill--good' : 'sp-pill--err'}`}>
              {u.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className="un-drawer-body">
          <div className="un-drawer-stats">
            <div><small>Colleges</small><b>{countLabel(u.college_count)}</b></div>
            <div><small>Students</small><b>{countLabel(u.student_count)}</b></div>
          </div>

          <section className="un-drawer-sec">
            <h3>Location</h3>
            <dl className="un-dl">
              <div><dt>State</dt><dd>{u.state || '—'}</dd></div>
              <div><dt>District</dt><dd>{u.district || '—'}</dd></div>
              <div><dt>City</dt><dd>{u.city || '—'}</dd></div>
              <div><dt>Pincode</dt><dd>{u.pincode || '—'}</dd></div>
              <div className="is-full"><dt>Address</dt><dd>{u.address || '—'}</dd></div>
            </dl>
          </section>

          <section className="un-drawer-sec">
            <div className="un-drawer-sec-h">
              <h3>Member colleges</h3>
              <Link className="sp-link" href="/superadmin/colleges">
                Manage in Colleges <Icon name="arrow" size={14} />
              </Link>
            </div>
            {collegesLoading ? <SectionState title="Loading colleges…" /> : null}
            {collegesError ? (
              <SectionState tone="err" title="Could not load colleges">
                {apiErrorMessage(collegesError, 'Please try again.')}
              </SectionState>
            ) : null}
            {!collegesLoading && !collegesError && !colleges.length ? (
              <SectionState title="No colleges yet">
                Onboard a college under this university from the Colleges page.
              </SectionState>
            ) : null}
            {colleges.length ? (
              <ul className="un-college-list">
                {colleges.map((c) => (
                  <li key={c.id}>
                    <span className="un-mono un-mono--sm">{initials(c.name)}</span>
                    <div className="sp-row-main">
                      <b>{c.name}</b>
                      <div className="sp-row-meta">
                        {c.code ? <span>{c.code}</span> : null}
                        {[c.city, c.state].filter(Boolean).length ? <span>· {[c.city, c.state].filter(Boolean).join(', ')}</span> : null}
                      </div>
                    </div>
                    <span className="un-college-count">
                      {countLabel(c.student_count ?? c.students)}
                      <small>students</small>
                    </span>
                    <span className={`sp-pill ${c.is_active !== false ? 'sp-pill--good' : 'sp-pill--err'}`}>
                      {c.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>

        <div className="un-drawer-foot">
          <button type="button" className={`sd-btn sd-btn--sm ${u.is_active ? 'sd-btn--danger' : 'sd-btn--outline'}`} onClick={() => onToggle(row)}>
            {u.is_active ? 'Deactivate' : 'Reactivate'}
          </button>
          <button type="button" className="sd-btn sd-btn--teal sd-btn--sm" onClick={() => onEdit(row)}>
            <Icon name="edit" size={16} /> Edit university
          </button>
        </div>
      </aside>
    </div>
  );
}

/* ---------------------------------------------------------------- page */
export default function UniversitiesPage() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage] = useState(1);
  const [view, setView] = useState('grid');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formDefaults, setFormDefaults] = useState(EMPTY_FORM);
  const [togglingId, setTogglingId] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);
  const [drawerRow, setDrawerRow] = useState(null);

  const listParams = useMemo(() => {
    const params = { q: search.trim() || undefined, page, page_size: PAGE_SIZE };
    if (activeFilter === 'true') params.is_active = true;
    if (activeFilter === 'false') params.is_active = false;
    return params;
  }, [search, activeFilter, page]);

  const { data, loading, error, reload } = useAsyncResource(
    () => fetchData(() => universitiesApi.list(listParams)),
    [listParams],
  );

  /* Status totals for the summary row — read-only list calls, 1 row each. */
  const { data: counts, reload: reloadCounts } = useAsyncResource(async () => {
    const [all, active, inactive] = await Promise.all([
      fetchData(() => universitiesApi.list({ page: 1, page_size: 1 })),
      fetchData(() => universitiesApi.list({ page: 1, page_size: 1, is_active: true })),
      fetchData(() => universitiesApi.list({ page: 1, page_size: 1, is_active: false })),
    ]);
    const total = (d) => (d?.total != null ? d.total : asList(d, []).length);
    return { all: total(all), active: total(active), inactive: total(inactive) };
  }, []);

  const rows = useMemo(() => asList(data, []), [data]);
  const total = data?.total ?? rows.length;
  const pageSize = data?.page_size ?? PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const sumOf = (key) => rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
  const listedAll = rows.length >= total;

  const refreshAll = async () => {
    await reload();
    reloadCounts().catch(() => {});
  };

  const openCreate = () => {
    setEditingId(null);
    setFormDefaults(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = async (row) => {
    setDrawerRow(null);
    setEditingId(row.id);
    setFormDefaults({
      name: row.name ?? '',
      code: row.code ?? '',
      country: INDIA_COUNTRY.code,
      state: row.state ?? '',
      district: row.district ?? '',
      city: row.city ?? '',
      pincode: row.pincode ?? '',
      address: row.address ?? '',
    });
    setModalOpen(true);
    try {
      const detail = await fetchData(() => universitiesApi.get(row.id));
      if (!detail) return;
      setFormDefaults({
        name: detail.name ?? row.name ?? '',
        code: detail.code ?? row.code ?? '',
        country: INDIA_COUNTRY.code,
        state: detail.state ?? '',
        district: detail.district ?? '',
        city: detail.city ?? '',
        pincode: detail.pincode ?? '',
        address: detail.address ?? '',
      });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load university details. Showing list values.'));
    }
  };

  const handleToggleActive = async (row) => {
    setTogglingId(row.id);
    try {
      if (row.is_active) {
        await universitiesApi.deactivate(row.id);
        toast.success('University deactivated');
      } else {
        await universitiesApi.reactivate(row.id);
        toast.success('University reactivated');
      }
      setConfirmRow(null);
      setDrawerRow(null);
      await refreshAll();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to update status'));
    } finally {
      setTogglingId(null);
    }
  };

  const closeDrawer = useCallback(() => setDrawerRow(null), []);

  const askToggle = (row) => {
    setDrawerRow(null);
    setConfirmRow(row);
  };

  const RowActions = ({ row }) => (
    <div className="un-actions">
      <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setDrawerRow(row)}>
        View
      </button>
      <button type="button" className="un-icon-btn" onClick={() => openEdit(row)} aria-label={`Edit ${row.name}`}>
        <Icon name="edit" size={16} />
      </button>
      <button
        type="button"
        className={`un-icon-btn${row.is_active ? ' is-danger' : ''}`}
        onClick={() => askToggle(row)}
        disabled={togglingId === row.id}
        aria-label={row.is_active ? `Deactivate ${row.name}` : `Reactivate ${row.name}`}
      >
        <Icon name={row.is_active ? 'lock' : 'refresh'} size={16} />
      </button>
    </div>
  );

  return (
    <div className="animate-fade-in sp un-page">
      <section className="sp-banner un-banner">
        <div className="sp-banner-ic" aria-hidden="true"><Icon name="book" size={26} /></div>
        <div className="sp-banner-copy">
          <div className="sp-banner-eyebrow">Academic hierarchy</div>
          <h2>Universities</h2>
          <p className="un-banner-lede">
            Affiliated universities sit at the top of the hierarchy. Colleges are onboarded beneath a university,
            and departments beneath each college.
          </p>
          <div className="un-hier" aria-label="Hierarchy">
            <span className="is-on">University</span>
            <Icon name="chev" size={14} />
            <span>College</span>
            <Icon name="chev" size={14} />
            <span>Department</span>
          </div>
        </div>
        <div className="sp-banner-cta">
          <button type="button" className="sd-btn sd-btn--amber" onClick={openCreate}>
            <Icon name="spark" size={16} /> New University
          </button>
        </div>
      </section>

      <section className="sd-kpis" aria-label="Universities summary">
        <Kpi icon="book" label="Total universities" value={counts ? countLabel(counts.all) : null} sub="Across the platform" />
        <Kpi icon="tick" label="Active" value={counts ? countLabel(counts.active) : null} sub="Accepting colleges" />
        <Kpi icon="lock" label="Inactive" value={counts ? countLabel(counts.inactive) : null} sub="Soft-deleted, restorable" />
        <Kpi
          icon="layers"
          label="Colleges · Students"
          value={rows.length ? `${countLabel(sumOf('college_count'))} · ${countLabel(sumOf('student_count'))}` : null}
          sub={listedAll ? 'Across listed universities' : 'On this page'}
        />
      </section>

      <section className="sp-panel un-toolbar">
        <div className="toolbar">
          <SearchBox
            placeholder="Search university name or code…"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
          <div className="sp-tabs un-seg" role="tablist" aria-label="Filter by status">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.label}
                type="button"
                role="tab"
                className="sp-tab"
                aria-selected={activeFilter === f.value}
                onClick={() => {
                  setPage(1);
                  setActiveFilter(f.value);
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
          title="Could not load universities"
          action={(
            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => refreshAll().catch(() => {})}>
              <Icon name="refresh" size={16} /> Try again
            </button>
          )}
        >
          {apiErrorMessage(error, 'Please try again.')}
        </SectionState>
      ) : null}

      {loading && !rows.length ? <SectionState title="Loading universities…" /> : null}

      {!loading && !error && !rows.length ? (
        <SectionState
          title={search || activeFilter ? 'No universities match these filters' : 'No universities yet'}
          action={!search && !activeFilter ? (
            <button type="button" className="sd-btn sd-btn--amber sd-btn--sm" onClick={openCreate}>Add the first university</button>
          ) : null}
        >
          {search || activeFilter ? 'Try a different name, code or status.' : 'Universities you add appear here.'}
        </SectionState>
      ) : null}

      {rows.length && view === 'grid' ? (
        <div className="un-grid">
          {rows.map((row) => (
            <article key={row.id} className={`un-card${row.is_active ? '' : ' is-inactive'}`}>
              <button type="button" className="un-card-main" onClick={() => setDrawerRow(row)}>
                <div className="un-card-top">
                  <span className="un-mono">{initials(row.name)}</span>
                  <span className={`sp-pill ${row.is_active ? 'sp-pill--good' : 'sp-pill--err'}`}>
                    <i className="un-dot" aria-hidden="true" />
                    {row.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <h3>{row.name}</h3>
                <div className="un-card-meta">
                  <span className="un-code">{row.code}</span>
                  <span><Icon name="pin" size={13} /> {locationLine(row) || 'Location not set'}</span>
                </div>
                <div className="un-card-stats">
                  <div><b>{countLabel(row.college_count)}</b><small>Colleges</small></div>
                  <div><b>{countLabel(row.student_count)}</b><small>Students</small></div>
                </div>
              </button>
              <div className="un-card-foot">
                <RowActions row={row} />
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {rows.length && view === 'list' ? (
        <section className="sp-panel">
          <div className="sp-table-wrap">
            <table className="sp-table un-table">
              <thead>
                <tr>
                  <th>University</th>
                  <th>Code</th>
                  <th className="num">Colleges</th>
                  <th className="num">Students</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <button type="button" className="un-name-btn" onClick={() => setDrawerRow(row)}>
                        <span className="un-mono un-mono--sm">{initials(row.name)}</span>
                        <span>
                          <b>{row.name}</b>
                          <small>{locationLine(row) || '—'}</small>
                        </span>
                      </button>
                    </td>
                    <td><span className="un-code">{row.code}</span></td>
                    <td className="num"><b>{countLabel(row.college_count)}</b></td>
                    <td className="num"><b>{countLabel(row.student_count)}</b></td>
                    <td>
                      <span className={`sp-pill ${row.is_active ? 'sp-pill--good' : 'sp-pill--err'}`}>
                        <i className="un-dot" aria-hidden="true" />
                        {row.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td><RowActions row={row} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {totalPages > 1 ? (
        <div className="un-pager">
          <span>{countLabel(total)} universities · page {page} of {totalPages}</span>
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

      <UniversityDrawer
        row={drawerRow}
        onClose={closeDrawer}
        onEdit={openEdit}
        onToggle={askToggle}
      />

      <StatusConfirm
        row={confirmRow}
        busy={Boolean(confirmRow && togglingId === confirmRow.id)}
        onCancel={() => setConfirmRow(null)}
        onConfirm={() => confirmRow && handleToggleActive(confirmRow)}
      />

      {modalOpen ? (
        <UniversityFormModal
          key={editingId || 'create'}
          open={modalOpen}
          editingId={editingId}
          initialValues={formDefaults}
          onClose={() => setModalOpen(false)}
          onSaved={() => refreshAll().catch(() => {})}
        />
      ) : null}
    </div>
  );
}

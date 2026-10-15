'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOverlay } from '@/components/superadmin/overlayStack';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { SearchBox, QuirriRHFField, IndiaLocationFields } from '@/components/superadmin/quirri-ui';
import {
  ModulePage, ModuleHead, KpiRow, Panel, SegTabs, StatusPill, IconButton, Mono, Pager, Icon, SectionState,
} from '@/components/shared/module-ui';
import { BarList } from '@/components/shared/data-viz';
import { useUrlState } from '@/hooks/useUrlState';
import {
  useDebouncedUrlSearch, ACTIVE_FILTERS, activeParam, pageParam, totalOf,
} from '@/lib/superadmin/listState';
import { universitiesApi, collegesApi, fetchData } from '@/lib/api/superadmin/modules';
import { asList, apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import {
  universityCreateSchema,
  universityUpdateSchema,
} from '@/lib/validation';
import { INDIA_COUNTRY } from '@/lib/india';

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

function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || 'U') + (parts[1]?.[0] || '')).toUpperCase();
}

/** "Chennai, Tamil Nadu" - city and state only (district often repeats the city). */
function locationLine(row) {
  const city = row?.city || row?.district;
  return [city, row?.state].filter(Boolean).join(', ');
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
            To stop or restart this university, use Deactivate or Reactivate in the list. Nothing is deleted.
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
          <b>{deactivating ? 'Nothing is deleted.' : 'The university becomes active again.'}</b>
          <p>
            {deactivating
              ? `${row.name} is hidden from active lists. ${Number(row.college_count) ? `Its ${countLabel(row.college_count)} ${Number(row.college_count) === 1 ? 'college' : 'colleges'} and records are kept` : 'Its records are kept'}, and you can reactivate it at any time.`
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
  // Shared overlay stack: focus trap, scroll lock, Esc closes only the topmost layer.
  const panelRef = useRef(null);
  useOverlay(Boolean(row), panelRef, onClose);

  useEffect(() => {
    if (!row) return undefined;
    let cancelled = false;
    setDetail(null);
    fetchData(() => universitiesApi.get(row.id))
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [row]);

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
        ref={panelRef}
        tabIndex={-1}
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
            <span className={`sp-pill ${u.is_active ? 'sp-pill--good' : 'sp-pill--off'}`}>
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
              <Link className="sp-link" href={`/superadmin/colleges?university=${row.id}`}>
                Open in Colleges <Icon name="arrow" size={14} />
              </Link>
            </div>
            {collegesLoading ? <SectionState title="Loading colleges…" /> : null}
            {collegesError ? (
              <SectionState tone="err" title="Could not load colleges">
                {apiErrorMessage(collegesError, 'Please try again.')}
              </SectionState>
            ) : null}
            {!collegesLoading && !collegesError && !colleges.length ? (
              <SectionState
                title="No colleges yet"
                action={u.is_active ? (
                  <Link className="sd-btn sd-btn--ghost sd-btn--sm" href={`/superadmin/colleges?new=1&university=${row.id}`}>
                    <Icon name="plus" size={16} /> Add a college here
                  </Link>
                ) : null}
              >
                Onboard a college under this university from the Colleges page.
              </SectionState>
            ) : null}
            {colleges.length ? (
              <ul className="un-college-list">
                {colleges.map((c) => (
                  <li key={c.id}>
                    <span className="un-mono un-mono--sm">{initials(c.name)}</span>
                    <div className="sp-row-main">
                      <b><Link className="sa-plain-link" href={`/superadmin/colleges/${c.id}`}>{c.name}</Link></b>
                      <div className="sp-row-meta">
                        {c.code ? <span>{c.code}</span> : null}
                        {[c.city, c.state].filter(Boolean).length ? <span>· {[c.city, c.state].filter(Boolean).join(', ')}</span> : null}
                      </div>
                    </div>
                    <span className="un-college-count">
                      {countLabel(c.student_count ?? c.students)}
                      <small>{Number(c.student_count ?? c.students) === 1 ? 'student' : 'students'}</small>
                    </span>
                    <span className={`sp-pill ${c.is_active !== false ? 'sp-pill--good' : 'sp-pill--off'}`}>
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
function UniversitiesView() {
  const [url, setUrl] = useUrlState({ q: '', status: 'all', page: '1' });
  const page = pageParam(url.page);
  const [search, setSearch] = useDebouncedUrlSearch(url.q, (q) => setUrl({ q, page: '1' }));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formDefaults, setFormDefaults] = useState(EMPTY_FORM);
  const [togglingId, setTogglingId] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);
  const [drawerRow, setDrawerRow] = useState(null);

  const listParams = useMemo(() => ({
    q: url.q || undefined,
    is_active: activeParam(url.status),
    page,
    page_size: PAGE_SIZE,
  }), [url.q, url.status, page]);

  const { data, loading, error, reload } = useAsyncResource(
    () => fetchData(() => universitiesApi.list(listParams)),
    [listParams],
  );

  /* Platform totals: every university (API max page size 100), not just this page. */
  const { data: allData, reload: reloadAll } = useAsyncResource(
    () => fetchData(() => universitiesApi.list({ page: 1, page_size: 100 })),
    [],
  );
  const all = useMemo(() => asList(allData, []), [allData]);
  const allTotal = totalOf(allData, all);
  const summary = useMemo(() => all.reduce((acc, u) => ({
    active: acc.active + (u.is_active ? 1 : 0),
    colleges: acc.colleges + (Number(u.college_count) || 0),
    students: acc.students + (Number(u.student_count) || 0),
  }), { active: 0, colleges: 0, students: 0 }), [all]);
  const partial = allData && all.length < allTotal;
  const scopeNote = partial ? `First ${countLabel(all.length)} of ${countLabel(allTotal)} universities` : 'Across all universities';

  const rows = useMemo(() => asList(data, []), [data]);
  const total = totalOf(data, rows);
  const filtersOn = Boolean(url.q || url.status !== 'all');

  const refreshAll = async () => {
    await reload();
    reloadAll().catch(() => {});
  };

  const openCreate = () => {
    setEditingId(null);
    setFormDefaults(EMPTY_FORM);
    setModalOpen(true);
  };

  // "Add university" deep link (?new=1) opens the form once.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') !== '1') return;
    openCreate();
    params.delete('new');
    const rest = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${rest ? `?${rest}` : ''}`);
  }, []);

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

  const activeUnis = all.filter((u) => u.is_active);
  const studentsBars = activeUnis
    .map((u) => ({ key: String(u.id), label: u.name, sub: u.code, value: Number(u.student_count) || 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const collegeBars = activeUnis
    .map((u) => ({ key: String(u.id), label: u.name, sub: u.code, value: Number(u.college_count) || 0, href: `/superadmin/colleges?university=${u.id}` }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <ModulePage className="sa-page">
      <ModuleHead
        actions={(
          <button type="button" className="sd-btn sd-btn--amber" onClick={openCreate}>
            <Icon name="plus" size={16} /> Add university
          </button>
        )}
      />

      <KpiRow
        label="Universities summary"
        items={[
          { icon: 'book', label: 'Universities', value: allData ? countLabel(allTotal) : null, sub: allData ? `${countLabel(summary.active)} active · ${countLabel(all.length - summary.active)} inactive` : null },
          { icon: 'building', label: 'Colleges onboarded', value: allData ? countLabel(summary.colleges) : null, sub: scopeNote },
          { icon: 'users', label: 'Students', value: allData ? countLabel(summary.students) : null, sub: scopeNote },
        ]}
      />

      {studentsBars.length > 1 ? (
        <div className="dv-grid">
          <Panel title="Students by university" sub="Active universities, most students first.">
            <BarList label="Students by university" items={studentsBars} />
          </Panel>
          <Panel title="Colleges by university" sub="Open one to see its colleges.">
            <BarList label="Colleges by university" items={collegeBars} />
          </Panel>
        </div>
      ) : null}

      <Panel
        title="All universities"
        sub={data ? `${countLabel(total)} ${total === 1 ? 'university' : 'universities'}${filtersOn ? ' match these filters' : ''}` : null}
        bodyClassName={null}
        toolbar={(
          <>
            <SearchBox
              placeholder="Search university name or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <SegTabs
              label="Filter by status"
              options={ACTIVE_FILTERS}
              value={url.status}
              onChange={(v) => setUrl({ status: v, page: '1' })}
            />
            {filtersOn ? (
              <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setUrl({ q: '', status: 'all', page: '1' })}>
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
              title="Could not load universities"
              action={(
                <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => refreshAll().catch(() => {})}>
                  <Icon name="refresh" size={16} /> Try again
                </button>
              )}
            >
              {apiErrorMessage(error, 'Please try again.')}
            </SectionState>
          </div>
        ) : null}

        {loading && !rows.length ? <div className="sa-panel-state"><SectionState title="Loading universities…" /></div> : null}

        {!loading && !error && !rows.length ? (
          <div className="sa-panel-state">
            <SectionState
              title={filtersOn ? 'No universities match these filters' : 'No universities yet'}
              action={!filtersOn ? (
                <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={openCreate}>
                  <Icon name="plus" size={16} /> Add the first university
                </button>
              ) : null}
            >
              {filtersOn ? 'Try a different name, code or status.' : 'Universities you add appear here.'}
            </SectionState>
          </div>
        ) : null}

        {rows.length ? (
          <div className="sp-table-wrap">
            <table className="sp-table un-table sa-table-tight sa-stack">
              <thead>
                <tr>
                  <th>University</th>
                  <th>Location</th>
                  <th className="num">Colleges</th>
                  <th className="num">Students</th>
                  <th>Status</th>
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <button type="button" className="un-name-btn" onClick={() => setDrawerRow(row)}>
                        <Mono name={row.name} size="sm" muted={!row.is_active} />
                        <span>
                          <b>{row.name}</b>
                          <small>{row.code}</small>
                        </span>
                      </button>
                    </td>
                    <td data-label="Location">{locationLine(row) || <span className="sa-muted">Not set</span>}</td>
                    <td data-label="Colleges" className="num">{countLabel(row.college_count)}</td>
                    <td data-label="Students" className="num">{countLabel(row.student_count)}</td>
                    <td data-label="Status"><StatusPill active={row.is_active} /></td>
                    <td className="sa-actions-cell">
                      <div className="un-actions">
                        <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setDrawerRow(row)}>View</button>
                        <IconButton icon="edit" label={`Edit ${row.name}`} onClick={() => openEdit(row)} />
                        <IconButton
                          icon={row.is_active ? 'lock' : 'refresh'}
                          label={row.is_active ? `Deactivate ${row.name}` : `Reactivate ${row.name}`}
                          danger={row.is_active}
                          disabled={togglingId === row.id}
                          onClick={() => askToggle(row)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>

      <Pager
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        shown={rows.length}
        noun="universities"
        onPage={(p) => setUrl({ page: String(p) }, { push: true })}
      />

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
    </ModulePage>
  );
}

export default function UniversitiesPage() {
  return (
    <Suspense fallback={<SectionState title="Loading universities…" />}>
      <UniversitiesView />
    </Suspense>
  );
}

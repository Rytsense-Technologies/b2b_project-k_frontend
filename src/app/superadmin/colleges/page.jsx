'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { SearchBox, QuirriSelect } from '@/components/superadmin/quirri-ui';
import {
  ModulePage, ModuleHead, KpiRow, Panel, SegTabs, StatusPill, IconButton, Mono, Pager, Icon, SectionState,
} from '@/components/shared/module-ui';
import { BarList, Distribution } from '@/components/shared/data-viz';
import {
  EMPTY_FORM, PAGE_SIZE, NEAR_CAP_PCT, num, collegeStats, SeatBar,
  CollegeFormModal, StatusConfirm, CollegeDrawer,
} from '@/components/superadmin/colleges/collegeParts';
import { collegesApi, universitiesApi, departmentsApi, fetchData } from '@/lib/api/superadmin/modules';
import { usersApi } from '@/lib/api/superadmin/users';
import { asList, unwrap, apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useUrlState } from '@/hooks/useUrlState';
import {
  useDebouncedUrlSearch, ACTIVE_FILTERS, activeParam, pageParam, totalOf,
} from '@/lib/superadmin/listState';
import { INDIA_COUNTRY } from '@/lib/india';
import { ROLES } from '@/lib/permissions';

function CollegesView() {
  const [url, setUrl] = useUrlState({ q: '', status: 'true', university: '', near: '', page: '1' });
  const page = pageParam(url.page);
  const nearCap = url.near === '1';
  const [search, setSearch] = useDebouncedUrlSearch(url.q, (q) => setUrl({ q, page: '1' }));
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
  const [resendingEmail, setResendingEmail] = useState(null);

  // Every university for the filter and the form (API max page size is 100; the old call stopped at 25).
  const { data: uniData } = useAsyncResource(
    () => fetchData(() => universitiesApi.list({ page: 1, page_size: 100 })),
    [],
  );
  const universities = useMemo(() => asList(uniData, []), [uniData]);
  const uniOptions = useMemo(
    () => universities.map((u) => ({ value: String(u.id), label: u.is_active === false ? `${u.name} — inactive` : u.name })),
    [universities],
  );

  const listParams = useMemo(() => ({
    q: url.q || undefined,
    university_id: url.university || undefined,
    is_active: activeParam(url.status),
    page,
    page_size: PAGE_SIZE,
  }), [url.q, url.status, url.university, page]);

  const { data, loading, error, reload } = useAsyncResource(
    () => fetchData(() => collegesApi.list(listParams)),
    [listParams],
  );

  /* Platform totals: every college (max page size 100) + pending College Admin invites. */
  const { data: totals, reload: reloadTotals } = useAsyncResource(async () => {
    const [allRes, pendingRes] = await Promise.all([
      fetchData(() => collegesApi.list({ page: 1, page_size: 100 })),
      fetchData(() => usersApi.getUsers({ role: ROLES.COLLEGE_ADMIN, status: 'pending', pageSize: 1 })).catch(() => null),
    ]);
    const rows = asList(allRes, []);
    return {
      rows,
      total: totalOf(allRes, rows),
      pendingAdmins: pendingRes ? totalOf(pendingRes, asList(pendingRes, [])) : null,
    };
  }, []);
  const allColleges = totals?.rows || [];
  const seat = allColleges.reduce((acc, c) => {
    const s = collegeStats(c);
    if (!s.active) return acc;
    return { students: acc.students + s.students, cap: acc.cap + s.cap, active: acc.active + 1 };
  }, { students: 0, cap: 0, active: 0 });
  const partial = totals && allColleges.length < totals.total;
  const scope = partial ? `first ${num(allColleges.length)} of ${num(totals.total)} colleges` : 'active colleges';

  const pageRows = useMemo(() => asList(data, []), [data]);
  // "Near seat cap" is a client filter over the loaded page.
  const colleges = useMemo(
    () => (nearCap ? pageRows.filter((c) => collegeStats(c).pct >= NEAR_CAP_PCT) : pageRows),
    [pageRows, nearCap],
  );
  const total = totalOf(data, pageRows);
  const filtersOn = Boolean(url.q || url.university || url.status !== 'true' || nearCap);
  const shownCount = nearCap ? colleges.length : total;

  const refreshAll = async () => {
    await reload();
    reloadTotals().catch(() => {});
  };

  const openCreate = useCallback((universityId = '') => {
    setEditingId(null);
    setFormDefaults({ ...EMPTY_FORM, university_id: universityId ? String(universityId) : '' });
    setCollegeModal(true);
  }, []);

  // ?new=1 (from a university's drawer) opens the form, with ?university= preselected.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') !== '1') return;
    openCreate(params.get('university') || '');
    params.delete('new');
    const rest = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${rest ? `?${rest}` : ''}`);
  }, [openCreate]);

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
      const deptData = unwrap(await departmentsApi.list({ college_id: college.id, page: 1, pageSize: 100 }));
      setViewDepts(asList(deptData, []));
    } catch (err) {
      setViewDepts([]);
      setViewDeptsError(apiErrorMessage(err, 'Could not load departments.'));
    } finally {
      setViewDeptsLoading(false);
    }
  };

  const handleResend = async (admin) => {
    setResendingEmail(admin.email);
    try {
      await usersApi.resendInvite(admin.email);
      toast.success(`Invite resent to ${admin.email}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not resend the invite'));
    } finally {
      setResendingEmail(null);
    }
  };

  const handleToggleActive = async (college) => {
    setTogglingId(college.id);
    try {
      if (college.is_active !== false) {
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

  const studentBars = allColleges
    .filter((c) => c.is_active !== false)
    .map((c) => ({
      key: String(c.id),
      label: c.name,
      sub: c.university_name || null,
      value: collegeStats(c).students,
      href: `/superadmin/colleges/${c.id}`,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const anyNearCap = allColleges.some((c) => c.is_active !== false && collegeStats(c).pct >= NEAR_CAP_PCT);

  return (
    <ModulePage className="sa-page">
      <ModuleHead
        actions={(
          <button type="button" className="sd-btn sd-btn--amber" onClick={() => openCreate(url.university)}>
            <Icon name="plus" size={16} /> Add college
          </button>
        )}
      />

      <KpiRow
        label="Colleges summary"
        items={[
          {
            icon: 'building',
            label: 'Colleges',
            value: totals ? num(totals.total) : null,
            sub: totals ? `${num(seat.active)} active · ${num(allColleges.length - seat.active)} inactive` : null,
          },
          {
            icon: 'users',
            label: 'Seats used',
            value: totals ? `${num(seat.students)} / ${num(seat.cap)}` : null,
            sub: totals ? `${seat.cap ? Math.round((seat.students / seat.cap) * 100) : 0}% of seat caps · ${scope}` : null,
          },
          {
            icon: 'mail',
            label: 'Admin invites pending',
            value: totals ? (totals.pendingAdmins == null ? '—' : num(totals.pendingAdmins)) : null,
            sub: totals?.pendingAdmins ? (
              <Link className="sp-link" href="/superadmin/users?tab=pending">Resend from Platform users</Link>
            ) : 'College Admins who have not signed in yet',
          },
        ]}
      />

      {studentBars.length > 1 ? (
        <div className="dv-grid">
          <Panel title="Students by college" sub="Active colleges, most students first. Open one for its page.">
            <BarList label="Students by college" items={studentBars} />
          </Panel>
          <Panel title="Seat usage" sub={`Students enrolled against seat caps · ${scope}`}>
            <Distribution
              label="Seat usage"
              parts={[
                { label: 'Seats used', value: seat.students, color: 'var(--cat-1)' },
                { label: 'Seats free', value: Math.max(0, seat.cap - seat.students), color: 'var(--neutral-200)' },
              ]}
              empty="No seat caps set yet."
            />
            {anyNearCap ? (
              <p className="co-warn sa-gap-top">
                <Icon name="info" size={14} /> Some colleges are at {NEAR_CAP_PCT}% of their seat cap or more.
                <button type="button" className="sp-link sa-link-btn" onClick={() => setUrl({ near: '1', page: '1' })}>Show them</button>
              </p>
            ) : null}
          </Panel>
        </div>
      ) : null}

      <Panel
        title="All colleges"
        sub={data ? `${num(shownCount)} ${shownCount === 1 ? 'college' : 'colleges'}${filtersOn ? ' match these filters' : ''}${nearCap && total > pageRows.length ? ' on this page' : ''}` : null}
        bodyClassName={null}
        toolbar={(
          <>
            <SearchBox
              placeholder="Search college, code, or admin email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="sa-filter-select">
              <QuirriSelect
                ariaLabel="Filter by university"
                value={url.university}
                onChange={(e) => setUrl({ university: e.target.value, page: '1' })}
                placeholder="All universities"
                options={uniOptions}
              />
            </div>
            <SegTabs
              label="Filter by status"
              options={ACTIVE_FILTERS}
              value={url.status}
              onChange={(v) => setUrl({ status: v, page: '1' })}
            />
            <button
              type="button"
              className={`sa-chip-toggle${nearCap ? ' is-on' : ''}`}
              aria-pressed={nearCap}
              onClick={() => setUrl({ near: nearCap ? '' : '1', page: '1' })}
            >
              Near seat cap
            </button>
            {filtersOn ? (
              <button
                type="button"
                className="sd-btn sd-btn--ghost sd-btn--sm"
                onClick={() => setUrl({ q: '', university: '', status: 'true', near: '', page: '1' })}
              >
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
              title="Could not load colleges"
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

        {loading && !pageRows.length ? <div className="sa-panel-state"><SectionState title="Loading colleges…" /></div> : null}

        {!loading && !error && !colleges.length ? (
          <div className="sa-panel-state">
            <SectionState
              title={filtersOn ? 'No colleges match these filters' : 'No colleges yet'}
              action={!filtersOn ? (
                <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => openCreate()}>
                  <Icon name="plus" size={16} /> Onboard the first college
                </button>
              ) : null}
            >
              {filtersOn ? 'Try a different name, university or status.' : 'Colleges you onboard appear here.'}
            </SectionState>
          </div>
        ) : null}

        {colleges.length ? (
          <div className="sp-table-wrap">
            <table className="sp-table un-table sa-table-tight sa-stack">
              <thead>
                <tr>
                  <th>College</th>
                  <th>University</th>
                  <th className="num">Admins</th>
                  <th className="num">Departments</th>
                  <th>Students / seat cap</th>
                  <th>Status</th>
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {colleges.map((college) => {
                  const s = collegeStats(college);
                  return (
                    <tr key={college.id}>
                      <td>
                        <Link className="un-name-btn" href={`/superadmin/colleges/${college.id}`}>
                          <Mono name={college.name} size="sm" muted={!s.active} />
                          <span>
                            <b>{college.name}</b>
                            <small>{[college.code, s.location].filter(Boolean).join(' · ') || '—'}</small>
                          </span>
                        </Link>
                      </td>
                      <td data-label="University">{s.university || '—'}</td>
                      <td data-label="Admins" className="num">{num(s.admins)}</td>
                      <td data-label="Departments" className="num">{num(s.depts)}</td>
                      <td data-label="Seats" className="co-seat-cell"><SeatBar students={s.students} cap={s.cap} pct={s.pct} compact /></td>
                      <td data-label="Status"><StatusPill active={s.active} /></td>
                      <td className="sa-actions-cell">
                        <div className="un-actions">
                          <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => openView(college)}>View</button>
                          <IconButton icon="edit" label={`Edit ${college.name}`} onClick={() => openEdit(college)} />
                          <IconButton
                            icon={s.active ? 'lock' : 'refresh'}
                            label={s.active ? `Deactivate ${college.name}` : `Reactivate ${college.name}`}
                            danger={s.active}
                            disabled={togglingId === college.id}
                            onClick={() => askToggle(college)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>

      <Pager
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        shown={pageRows.length}
        noun="colleges"
        onPage={(p) => setUrl({ page: String(p) }, { push: true })}
      />

      <CollegeDrawer
        college={viewCollege}
        depts={viewDepts}
        deptsLoading={viewDeptsLoading}
        deptsError={viewDeptsError}
        detailLoading={viewDetailLoading}
        resendingEmail={resendingEmail}
        onClose={closeDrawer}
        onEdit={openEdit}
        onToggle={askToggle}
        onResend={handleResend}
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
          universities={universities.filter((u) => u.is_active !== false || String(u.id) === String(formDefaults.university_id))}
          onClose={() => setCollegeModal(false)}
          onSaved={() => refreshAll().catch(() => {})}
        />
      ) : null}
    </ModulePage>
  );
}

export default function CollegesPage() {
  return (
    <Suspense fallback={<SectionState title="Loading colleges…" />}>
      <CollegesView />
    </Suspense>
  );
}

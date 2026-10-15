'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Icon,
  ModulePage,
  ModuleHead,
  HeadChip,
  KpiRow,
  SegTabs,
  SearchBox,
  Panel,
  StatusPill,
  Mono,
  Pager,
  SectionState,
  countLabel,
} from '@/components/shared/module-ui';
import { QuirriSelect } from '@/components/superadmin/quirri-ui';
import StructureTabs from '@/components/admin/StructureTabs';
import DepartmentFormDrawer from '@/components/admin/departments/DepartmentFormDrawer';
import {
  STATUS_FILTERS,
  departmentPath,
  isActiveDept,
  httpStatus,
  loadCollegeStaff,
  departmentHod,
  hodCanReview,
} from '@/components/admin/departments/departmentModel';
import { departmentsApi, fetchData } from '@/lib/api/superadmin/modules';
import { asList, apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useAuth } from '@/hooks/useAuth';
import { useUrlState } from '@/hooks/useUrlState';

const PAGE_SIZE = 100;
const HOD_FILTERS = [
  { value: 'with', label: 'With an HOD' },
  { value: 'without', label: 'Without an HOD' },
];

function HodCell({ hod, ready }) {
  if (hodCanReview(hod)) return hod.name;
  if (!ready) return <span className="ad-muted">Checking…</span>;
  if (hod?.state === 'elsewhere') {
    return (
      <span className="pm-missing">
        <Icon name="alert" size={14} /> {hod.name} is in {hod.otherDepartment || 'another department'}
      </span>
    );
  }
  return <span className="pm-missing"><Icon name="alert" size={14} /> Not assigned</span>;
}

/**
 * College Admin → Academic structure → Departments (list).
 * Recipe v2: head (scope + one orange action) → route tabs → KPIs → one panel with its filters.
 */
function DepartmentsList() {
  const router = useRouter();
  const { tenantId } = useAuth();
  const [url, setUrl] = useUrlState({ q: '', status: 'true', hod: '', page: '1' });
  const [searchInput, setSearchInput] = useState(url.q);
  const [createOpen, setCreateOpen] = useState(false);
  const page = Math.max(1, Number(url.page) || 1);

  // URL → input (Back/Forward), input → URL (debounced)
  useEffect(() => { setSearchInput(url.q); }, [url.q]);
  useEffect(() => {
    if (searchInput === url.q) return undefined;
    const t = setTimeout(() => setUrl({ q: searchInput.trim(), page: '1' }), 300);
    return () => clearTimeout(t);
  }, [searchInput, url.q, setUrl]);

  const query = useMemo(() => ({
    q: url.q || undefined,
    is_active: url.status === 'all' ? undefined : url.status === 'true',
    page,
    pageSize: PAGE_SIZE,
  }), [url.q, url.status, page]);

  const { data, loading, error, reload } = useAsyncResource(
    () => fetchData(() => departmentsApi.list(query)),
    [query, tenantId],
  );

  const rows = useMemo(() => asList(data, []), [data]);
  const total = typeof data?.total === 'number' ? data.total : rows.length;
  // Same HOD rule as the department record (departmentHod), so list and detail agree.
  const { data: collegeStaff } = useAsyncResource(() => loadCollegeStaff(tenantId), [tenantId]);
  const staffReady = Array.isArray(collegeStaff);
  const hodByDept = useMemo(() => {
    const map = new Map();
    rows.forEach((d) => map.set(d.id, departmentHod(d, collegeStaff || [])));
    return map;
  }, [rows, collegeStaff]);
  const withoutHod = rows.filter((d) => !hodCanReview(hodByDept.get(d.id))).length;
  const enrolled = rows.reduce((acc, d) => acc + (Number(d.student_count) || 0), 0);
  const firstLoad = loading && !data;
  const statusLabel = STATUS_FILTERS.find((f) => f.value === url.status)?.label || 'Active';
  const searching = Boolean(url.q);

  // HOD filter is client side: every department of a college fits on one page (PAGE_SIZE 100).
  const shown = useMemo(() => {
    if (!url.hod || !staffReady) return rows;
    return rows.filter((d) => hodCanReview(hodByDept.get(d.id)) === (url.hod === 'with'));
  }, [rows, url.hod, hodByDept, staffReady]);
  const filtered = Boolean(url.q || url.hod || url.status !== 'true');
  const clearFilters = () => {
    setSearchInput('');
    setUrl({ q: '', hod: '', status: 'true', page: '1' });
  };

  const onCreated = (dept) => {
    setCreateOpen(false);
    if (dept?.id) {
      router.push(`${departmentPath(dept.id)}?created=1`);
    } else {
      reload().catch(() => {});
    }
  };

  const status = httpStatus(error);

  return (
    <ModulePage className="ad-page pm-slice">
      <ModuleHead
        chips={<HeadChip icon="building">Your college</HeadChip>}
        actions={(
          <button type="button" className="sd-btn sd-btn--amber" onClick={() => setCreateOpen(true)}>
            <Icon name="plus" size={16} /> New department
          </button>
        )}
      />
      <StructureTabs />

      <KpiRow
        label="Departments summary"
        items={[
          {
            icon: 'tree',
            label: `${statusLabel} departments`,
            value: firstLoad ? null : countLabel(total),
            sub: searching ? 'Matching your search' : 'In your college',
          },
          {
            icon: 'alert',
            label: 'Without an HOD',
            value: firstLoad || !staffReady ? null : countLabel(withoutHod),
            tone: staffReady && withoutHod > 0 ? 'focus' : undefined,
            sub: withoutHod > 0 ? 'No one reviews their chapters yet' : 'Every department has a reviewer',
          },
          { icon: 'users', label: 'Students placed', value: firstLoad ? null : countLabel(enrolled), sub: 'Across these departments' },
        ]}
      />

      <Panel
        title="Departments"
        sub={firstLoad ? 'Loading…' : `${countLabel(shown.length)} of ${countLabel(total)} · open one to manage its HOD, people and status`}
        bodyClassName={null}
        toolbar={(
          <>
            <SearchBox
              placeholder="Search by department name or code…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <QuirriSelect
              ariaLabel="Filter by HOD"
              value={url.hod}
              onChange={(e) => setUrl({ hod: e.target.value, page: '1' })}
              placeholder="Any HOD"
              options={HOD_FILTERS}
            />
            <SegTabs
              label="Status"
              options={STATUS_FILTERS}
              value={url.status}
              onChange={(v) => setUrl({ status: v, page: '1' })}
            />
            {filtered ? (
              <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={clearFilters}>Clear</button>
            ) : null}
          </>
        )}
      >
        {error ? (
          <div className="sp-panel-b">
            {status === 403 ? (
              <SectionState tone="err" title="You don't have access to departments">
                Only College Admins can manage departments. If you think this is wrong, ask your Super Admin to check your role.
              </SectionState>
            ) : (
              <SectionState
                tone="err"
                title="Could not load departments"
                action={(
                  <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload().catch(() => {})}>
                    <Icon name="refresh" size={16} /> Try again
                  </button>
                )}
              >
                {apiErrorMessage(error, 'Check your connection and try again.')}
              </SectionState>
            )}
          </div>
        ) : null}

        {firstLoad ? <div className="sp-panel-b"><SectionState title="Loading departments…" /></div> : null}

        {!loading && !error && !shown.length ? (
          <div className="sp-panel-b">
            {searching || url.hod ? (
              <SectionState
                title={searching ? `No departments match “${url.q}”` : 'No departments match this filter'}
                action={(
                  <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={clearFilters}>
                    Clear filters
                  </button>
                )}
              >
                Try another name or code, or change the HOD and status filters.
              </SectionState>
            ) : url.status === 'false' ? (
              <SectionState title="No inactive departments">Departments you deactivate appear here and can be restored.</SectionState>
            ) : (
              <SectionState
                title="No departments yet"
                action={(
                  <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setCreateOpen(true)}>
                    <Icon name="plus" size={16} /> Create your first department
                  </button>
                )}
              >
                Departments organise your staff, students and chapters. Start with one, such as Computer Science.
              </SectionState>
            )}
          </div>
        ) : null}

        {shown.length ? (
          <div className="sp-table-wrap">
            <table className="sp-table un-table ad-stack">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Head of department</th>
                  <th className="num">Students</th>
                  <th>Status</th>
                  <th><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((d) => {
                  const href = departmentPath(d.id);
                  const active = isActiveDept(d);
                  return (
                    <tr
                      key={d.id}
                      className="pm-row-link"
                      onClick={(e) => { if (!e.target.closest('a')) router.push(href); }}
                    >
                      <td>
                        <Link href={href} className="pm-person">
                          <Mono name={d.name} size="sm" muted={!active} />
                          <span>
                            <b>{d.name}</b>
                            <small>{d.code || 'No code'}</small>
                          </span>
                        </Link>
                      </td>
                      <td data-label="Head of department"><HodCell hod={hodByDept.get(d.id)} ready={staffReady} /></td>
                      <td data-label="Students" className="num">{countLabel(d.student_count ?? 0)}</td>
                      <td data-label="Status"><StatusPill active={active} /></td>
                      <td className="num pm-go-cell"><span className="pm-row-go" aria-hidden="true"><Icon name="chev" size={18} /></span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        <Pager
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          shown={rows.length}
          noun="departments"
          onPage={(p) => setUrl({ page: String(p) }, { push: true })}
        />
      </Panel>

      <DepartmentFormDrawer
        open={createOpen}
        tenantId={tenantId}
        onClose={() => setCreateOpen(false)}
        onSaved={onCreated}
      />
    </ModulePage>
  );
}

export default function DepartmentsPage() {
  return (
    <Suspense fallback={<SectionState title="Loading departments…" />}>
      <DepartmentsList />
    </Suspense>
  );
}

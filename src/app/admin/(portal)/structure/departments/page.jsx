'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Icon,
  ModulePage,
  KpiRow,
  FilterBar,
  SegTabs,
  SearchBox,
  Panel,
  StatusPill,
  Mono,
  Pager,
  SectionState,
  HierarchyStrip,
  countLabel,
} from '@/components/shared/module-ui';
import { usePageHeader } from '@/components/shared/PageHeader';
import DepartmentFormDrawer from '@/components/admin/departments/DepartmentFormDrawer';
import {
  HIERARCHY,
  STATUS_FILTERS,
  departmentPath,
  isActiveDept,
  httpStatus,
} from '@/components/admin/departments/departmentModel';
import { departmentsApi, fetchData } from '@/lib/api/superadmin/modules';
import { asList, apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useAuth } from '@/hooks/useAuth';
import { useUrlState } from '@/hooks/useUrlState';

const PAGE_SIZE = 100;

/**
 * College Admin → Academic structure → Departments (list).
 * Slice 1 of docs/ux/ux-architecture.md: list → create (drawer) → record page.
 */
function DepartmentsList() {
  const router = useRouter();
  const { tenantId } = useAuth();
  const [url, setUrl] = useUrlState({ q: '', status: 'true', page: '1' });
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
  const withHod = rows.filter((d) => d.hod_name || d.hod_user_id).length;
  const enrolled = rows.reduce((acc, d) => acc + (Number(d.student_count) || 0), 0);
  const firstLoad = loading && !data;
  const statusLabel = STATUS_FILTERS.find((f) => f.value === url.status)?.label || 'Active';
  const searching = Boolean(url.q);

  usePageHeader({
    actions: (
      <button type="button" className="sd-btn sd-btn--amber" onClick={() => setCreateOpen(true)}>
        <Icon name="plus" size={16} /> New department
      </button>
    ),
  }, []);

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
      <HierarchyStrip label="Where departments sit in your college" levels={HIERARCHY} />

      <KpiRow
        label="Departments summary"
        items={[
          { icon: 'tree', label: `${statusLabel} departments`, value: firstLoad ? null : countLabel(total), sub: searching ? 'Matching your search' : 'In your college' },
          { icon: 'user', label: 'With an HOD', value: firstLoad ? null : countLabel(withHod), sub: 'Ready to review chapters' },
          { icon: 'alert', label: 'Without an HOD', value: firstLoad ? null : countLabel(rows.length - withHod), sub: rows.length - withHod > 0 ? 'Open one to assign an HOD' : 'Nothing to do' },
          { icon: 'users', label: 'Students enrolled', value: firstLoad ? null : countLabel(enrolled), sub: 'Across these departments' },
        ]}
      />

      <FilterBar label="Find departments">
        <SearchBox
          placeholder="Search by department name or code…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <SegTabs
          label="Status"
          options={STATUS_FILTERS}
          value={url.status}
          onChange={(v) => setUrl({ status: v, page: '1' })}
        />
      </FilterBar>

      {error ? (
        status === 403 ? (
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
        )
      ) : null}

      {firstLoad ? <SectionState title="Loading departments…" /> : null}

      {!loading && !error && !rows.length ? (
        searching ? (
          <SectionState
            title={`No departments match “${url.q}”`}
            action={(
              <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setUrl({ q: '', page: '1' })}>
                Clear search
              </button>
            )}
          >
            Try another name or code, or switch the status filter.
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
        )
      ) : null}

      {rows.length ? (
        <Panel
          title="Departments"
          sub={`${countLabel(rows.length)} of ${countLabel(total)} · open one to manage its HOD, people and status`}
          bodyClassName={null}
        >
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
                {rows.map((d) => {
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
                      <td data-label="Head of department">
                        {d.hod_name || d.hod_user_id ? (
                          d.hod_name || 'Assigned'
                        ) : (
                          <span className="pm-missing"><Icon name="alert" size={14} /> Not assigned</span>
                        )}
                      </td>
                      <td data-label="Students" className="num">{countLabel(d.student_count ?? 0)}</td>
                      <td data-label="Status"><StatusPill active={active} /></td>
                      <td className="num pm-go-cell"><span className="pm-row-go" aria-hidden="true"><Icon name="chev" size={18} /></span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      <Pager
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        shown={rows.length}
        noun="departments"
        onPage={(p) => setUrl({ page: String(p) }, { push: true })}
      />

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


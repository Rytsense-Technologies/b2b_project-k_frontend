'use client';

import { useCallback, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { QuirriCombobox, QuirriField, QuirriRHFField, QuirriSelect } from '@/components/superadmin/quirri-ui';
import {
  HeadChip,
  Icon,
  KpiRow,
  ModuleHead,
  ModulePage,
  Pager,
  Panel,
  SectionState,
  SegTabs,
  TabNav,
  TabPanel,
  countLabel,
} from '@/components/shared/module-ui';
import { useTabInView } from '@/components/admin/insights';
import { ScoreMeter } from '@/components/shared/data-viz';
import { useUrlState } from '@/hooks/useUrlState';
import { interviewAssignmentsApi } from '@/lib/api/interviewAssignments';
import { departmentsApi } from '@/lib/api/superadmin/modules';
import { apiErrorMessage, asList, unwrap } from '@/lib/api/superadmin/http';
import { interviewAssignmentSchema } from '@/lib/validation';
import { useAsyncResource } from '@/hooks/useAsyncResource';

function formatDue(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isOverdue(row) {
  if (!row.due_at || row.status !== 'active') return false;
  const d = new Date(row.due_at);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

const PAGE_SIZE = 25;
const TABS = ['assignments', 'cohort'];
const MODES = [
  { value: '', label: 'All modes' },
  { value: 'mock', label: 'Mock interview' },
  { value: 'full', label: 'Full interview' },
];

function cohortLabel(row) {
  if (row.final_year_only) {
    return row.department_name ? `Final year · ${row.department_name}` : 'Final year · All departments';
  }
  const year = row.year_of_study != null ? `Year ${row.year_of_study}` : 'All years';
  return row.department_name ? `${year} · ${row.department_name}` : year;
}

/**
 * Shared interview assignment workspace for College Admin and Faculty/HOD.
 * Tabs (?tab=): Assignments | Cohort readiness (`cohort` node).
 * Create / close for College Admin and HOD; `readOnly` (Faculty) follows only.
 * @param {{ scope: 'college' | 'department', description?: string, readOnly?: boolean }} props
 */
export default function InterviewAssignmentsWorkspace({
  scope = 'college',
  description = null,
  cohort = null,
  extra = null,
  readOnly = false,
  chips = null,
  notice = null,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [acting, setActing] = useState(false);
  const [closingId, setClosingId] = useState('');
  const [page, setPage] = useState(1);
  const [url, setUrl] = useUrlState({ tab: 'assignments', status: 'active', dept: '', mode: '' });
  const tab = TABS.includes(url.tab) ? url.tab : 'assignments';
  const listStatus = url.status === 'closed' ? 'closed' : 'active';
  const cohortNode = cohort || extra;
  useTabInView('ia', tab);

  const {
    data: listData,
    loading,
    error,
    reload,
  } = useAsyncResource(
    () => interviewAssignmentsApi.list({ status: listStatus, page, page_size: PAGE_SIZE }),
    [listStatus, page],
  );

  const {
    data: summary,
    reload: reloadSummary,
  } = useAsyncResource(() => interviewAssignmentsApi.summary(), []);

  const {
    data: deptsData,
  } = useAsyncResource(
    async () => {
      if (scope !== 'college') return { items: [] };
      const res = await departmentsApi.list({ is_active: true, page: 1, pageSize: 100 });
      return unwrap(res);
    },
    [scope],
  );

  const items = useMemo(() => asList(listData, []), [listData]);
  const listTotal = listData?.total ?? items.length;
  // Department / mode narrow the loaded page (the list API has no such filters).
  // A college-wide assignment (no department) includes every department.
  const shownItems = items.filter((row) => (!url.dept || !row.department_id || String(row.department_id) === url.dept)
    && (!url.mode || row.mode === url.mode));
  const departmentOptions = useMemo(() => {
    const rows = asList(deptsData, []);
    return [
      { value: '', label: 'All departments' },
      ...rows.map((d) => ({ value: String(d.id), label: d.name })),
    ];
  }, [deptsData]);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(interviewAssignmentSchema),
    defaultValues: {
      title: '',
      mode: 'mock',
      department_id: '',
      final_year_only: true,
      year_of_study: 4,
      due_at: '',
      notes: '',
    },
  });

  const finalYearOnly = watch('final_year_only');

  const openCreate = useCallback(() => {
    reset({
      title: '',
      mode: 'mock',
      department_id: '',
      final_year_only: true,
      year_of_study: 4,
      due_at: '',
      notes: '',
    });
    setModalOpen(true);
  }, [reset]);

  const onCreate = handleSubmit(async (values) => {
    setActing(true);
    try {
      const payload = {
        title: values.title,
        mode: values.mode,
        final_year_only: Boolean(values.final_year_only),
        notes: values.notes || undefined,
      };
      if (scope === 'college' && values.department_id) {
        payload.department_id = values.department_id;
      }
      if (!values.final_year_only && values.year_of_study != null) {
        payload.year_of_study = Number(values.year_of_study);
      }
      if (values.due_at) {
        payload.due_at = new Date(values.due_at).toISOString();
      }
      await interviewAssignmentsApi.create(payload);
      toast.success('Assignment created.');
      setModalOpen(false);
      await Promise.all([reload(), reloadSummary()]);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not create assignment.'));
    } finally {
      setActing(false);
    }
  });

  const onClose = async (id) => {
    setClosingId(id);
    try {
      await interviewAssignmentsApi.close(id);
      toast.success('Assignment closed.');
      await Promise.all([reload(), reloadSummary()]);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not close assignment.'));
    } finally {
      setClosingId('');
    }
  };

  const assigned = (summary?.completed ?? 0) + (summary?.needs_support ?? 0);
  const completionPct = summary ? (assigned ? Math.round((100 * summary.completed) / assigned) : null) : undefined;
  const showActions = listStatus === 'active' && !readOnly;
  const filtered = Boolean(url.dept || url.mode);

  return (
    <ModulePage className="ad-page ia-page">
      <ModuleHead
        lede={description}
        chips={chips || (readOnly ? <HeadChip icon="lock" tone="grey">View only · your HOD assigns interviews</HeadChip> : null)}
        actions={readOnly ? null : (
          <button type="button" className="sd-btn sd-btn--amber" onClick={openCreate}>
            <Icon name="plus" size={16} /> New assignment
          </button>
        )}
      />

      {notice}

      <TabNav
        label="Interview sections"
        idBase="ia"
        value={tab}
        // Each tab's filters belong to that tab only: drop both sets when switching.
        onChange={(v) => setUrl({ tab: v, status: 'active', dept: '', mode: '', cstatus: undefined, cyear: undefined, cdept: undefined }, { push: true })}
        tabs={[
          // No count here: Active / Closed (in the panel) each have their own list.
          { value: 'assignments', label: 'Assignments' },
          ...(cohortNode ? [{ value: 'cohort', label: 'Cohort readiness' }] : []),
        ]}
      />

      <TabPanel value="assignments" current={tab} idBase="ia">
        <KpiRow
          label="Interview summary"
          items={[
            {
              icon: 'users',
              label: 'Final-year students',
              value: summary ? countLabel(summary.final_year_students) : null,
              sub: 'Eligible by default',
            },
            {
              icon: 'calendar',
              label: 'Active assignments',
              value: summary ? countLabel(summary.assigned) : null,
              sub: 'Open cohorts',
            },
            {
              icon: 'tick',
              label: 'Completion',
              value: completionPct === undefined ? null : completionPct == null ? '—' : `${completionPct}%`,
              sub: summary ? `${countLabel(summary.completed)} of ${countLabel(assigned)} assigned students done` : 'Across active assignments',
            },
            {
              icon: 'alert',
              label: 'Still to complete',
              value: summary ? countLabel(summary.needs_support) : null,
              sub: 'Across active assignments',
            },
          ]}
        />

        <Panel
          title={listStatus === 'closed' ? 'Closed assignments' : 'Active assignments'}
          sub={readOnly
            ? 'Interview assignments in your department.'
            : listStatus === 'closed'
              ? 'Assignments you have closed, with their final results.'
              : 'Cohorts you have assigned an interview to.'}
          bodyClassName={null}
          toolbar={(
            <>
              <SegTabs
                label="Assignment status"
                value={listStatus}
                onChange={(v) => { setPage(1); setUrl({ status: v }); }}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'closed', label: 'Closed' },
                ]}
              />
              {scope === 'college' && departmentOptions.length > 1 ? (
                <QuirriSelect
                  ariaLabel="Filter by department"
                  value={url.dept}
                  onChange={(e) => setUrl({ dept: e.target.value })}
                  options={departmentOptions}
                />
              ) : null}
              <QuirriSelect
                ariaLabel="Filter by mode"
                value={url.mode}
                onChange={(e) => setUrl({ mode: e.target.value })}
                options={MODES}
              />
              {filtered ? (
                <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setUrl({ dept: '', mode: '' })}>
                  Clear
                </button>
              ) : null}
            </>
          )}
        >
          {loading && !listData ? (
            <div className="sp-panel-b"><SectionState title="Loading assignments…" /></div>
          ) : error ? (
            <div className="sp-panel-b">
              <SectionState
                tone="err"
                title="Could not load assignments"
                action={<button type="button" className="sd-btn sd-btn--ghost" onClick={() => reload()}>Retry</button>}
              >
                {apiErrorMessage(error, 'Try again in a moment.')}
              </SectionState>
            </div>
          ) : items.length && !shownItems.length ? (
            <div className="sp-panel-b">
              <SectionState title="No assignments match">Change or clear the department and mode filters.</SectionState>
            </div>
          ) : !items.length && listStatus === 'closed' ? (
            <div className="sp-panel-b">
              <SectionState title="No closed assignments">
                Assignments appear here once they are closed, with their final completion.
              </SectionState>
            </div>
          ) : !items.length ? (
            <div className="sp-panel-b">
              <SectionState title="No active assignments">
                {readOnly
                  ? 'Your HOD assigns mock interviews to cohorts; they will show here.'
                  : 'Use New assignment to give a final-year cohort a mock interview.'}
              </SectionState>
            </div>
          ) : (
            <>
              <div className="sp-table-wrap">
                <table className="sp-table un-table ad-stack">
                  <thead>
                    <tr>
                      <th>Assignment</th>
                      <th>Cohort</th>
                      <th>Mode</th>
                      <th>Due</th>
                      <th>Completion</th>
                      {showActions ? <th><span className="sr-only">Actions</span></th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {shownItems.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <b>{row.title}</b>
                          {row.notes ? <small className="ad-cell-sub">{row.notes}</small> : null}
                        </td>
                        <td data-label="Cohort">{cohortLabel(row)}</td>
                        <td data-label="Mode">{row.mode === 'full' ? 'Full interview' : 'Mock interview'}</td>
                        <td data-label="Due">
                          {isOverdue(row)
                            ? <span className="sp-pill sp-pill--low">Overdue · {formatDue(row.due_at)}</span>
                            : formatDue(row.due_at)}
                        </td>
                        <td data-label="Completion">
                          {row.eligible_count ? (
                            <div className="ia-progress">
                              <ScoreMeter value={row.completion_pct ?? 0} label="Completion" />
                              <small>{countLabel(row.completed_count)} of {countLabel(row.eligible_count)} done</small>
                            </div>
                          ) : <span className="sa-muted">No eligible students</span>}
                        </td>
                        {showActions ? (
                          <td className="ia-actions">
                            <button
                              type="button"
                              className="sd-btn sd-btn--ghost sd-btn--sm"
                              onClick={() => onClose(row.id)}
                              disabled={closingId === row.id}
                            >
                              {closingId === row.id ? 'Closing…' : 'Close'}
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager page={page} pageSize={PAGE_SIZE} total={listTotal} shown={items.length} onPage={setPage} noun="assignments" />
            </>
          )}
        </Panel>
      </TabPanel>

      {cohortNode ? (
        <TabPanel value="cohort" current={tab} idBase="ia">
          {cohortNode}
        </TabPanel>
      ) : null}

      <QuirriModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New interview assignment"
        crumb="Only final-year students are eligible by default"
        footer={(
          <>
            <button type="button" className="sd-btn sd-btn--ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <div className="right">
              <button type="button" className="sd-btn sd-btn--amber" onClick={onCreate} disabled={acting}>
                {acting ? 'Creating…' : 'Create assignment'}
              </button>
            </div>
          </>
        )}
      >
        <form onSubmit={onCreate} noValidate className="un-form">
          <QuirriRHFField
            control={control}
            name="title"
            fieldType="academicLabel"
            label="Assignment title"
            placeholder="e.g. Final-year mock interview"
          />
          <Controller
            control={control}
            name="mode"
            render={({ field }) => (
              <QuirriSelect
                id="assignment-mode"
                label="Interview mode"
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: 'mock', label: 'Mock interview' },
                  { value: 'full', label: 'Full interview' },
                ]}
                error={errors.mode?.message}
              />
            )}
          />
          {scope === 'college' ? (
            <Controller
              control={control}
              name="department_id"
              render={({ field }) => (
                <QuirriCombobox
                  id="assignment-department"
                  label="Department"
                  value={field.value}
                  onChange={field.onChange}
                  options={departmentOptions}
                  placeholder="All departments"
                  emptyMessage="No departments yet"
                  hint="Leave as all departments to include the whole college."
                  full
                />
              )}
            />
          ) : null}
          <Controller
            control={control}
            name="final_year_only"
            render={({ field }) => (
              <label className="pm-check">
                <input
                  type="checkbox"
                  checked={Boolean(field.value)}
                  onChange={(e) => field.onChange(e.target.checked)}
                  onBlur={field.onBlur}
                />
                <span className="pm-check-box" aria-hidden="true"><Icon name="tick" size={14} /></span>
                <span className="pm-check-text">
                  <b>Final-year students only</b>
                  <small>Untick to choose a year of study instead.</small>
                </span>
              </label>
            )}
          />
          {!finalYearOnly ? (
            <QuirriRHFField
              control={control}
              name="year_of_study"
              fieldType="positiveInt"
              label="Year of study"
              placeholder="e.g. 3"
            />
          ) : null}
          <Controller
            control={control}
            name="due_at"
            render={({ field }) => (
              <QuirriField label="Due date" hint="Optional" htmlFor="assignment-due">
                <input
                  id="assignment-due"
                  type="date"
                  className="sd-input"
                  value={field.value || ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              </QuirriField>
            )}
          />
          <QuirriRHFField
            control={control}
            name="notes"
            fieldType="address"
            label="Notes for students"
            placeholder="Optional guidance"
          />
        </form>
      </QuirriModal>
    </ModulePage>
  );
}

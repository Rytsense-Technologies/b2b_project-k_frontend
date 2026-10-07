'use client';

import { useCallback, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { QuirriCombobox, QuirriField, QuirriRHFField, QuirriSelect } from '@/components/superadmin/quirri-ui';
import {
  Icon,
  KpiRow,
  ModuleBanner,
  ModulePage,
  Panel,
  SectionState,
} from '@/components/shared/module-ui';
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

function cohortLabel(row) {
  if (row.final_year_only) {
    return row.department_name ? `Final year · ${row.department_name}` : 'Final year · All departments';
  }
  const year = row.year_of_study != null ? `Year ${row.year_of_study}` : 'All years';
  return row.department_name ? `${year} · ${row.department_name}` : year;
}

/**
 * Shared interview assignment workspace for College Admin and Faculty/HOD.
 * @param {{ scope: 'college' | 'department', title?: string, description?: string }} props
 */
export default function InterviewAssignmentsWorkspace({
  scope = 'college',
  title = 'Interview assignments',
  description = 'Assign AI mock interviews to final-year cohorts and track completion.',
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [acting, setActing] = useState(false);

  const {
    data: listData,
    loading,
    error,
    reload,
  } = useAsyncResource(() => interviewAssignmentsApi.list({ status: 'active' }), []);

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
    try {
      await interviewAssignmentsApi.close(id);
      toast.success('Assignment closed.');
      await Promise.all([reload(), reloadSummary()]);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not close assignment.'));
    }
  };

  return (
    <ModulePage>
      <ModuleBanner
        icon="mic"
        eyebrow="Interviews"
        title={title}
        lede={description}
        actions={(
          <button type="button" className="sd-btn sd-btn--amber" onClick={openCreate}>
            <Icon name="plus" size={16} /> New assignment
          </button>
        )}
      />

      <KpiRow
        label="Interview summary"
        items={[
          {
            icon: 'users',
            label: 'Final-year students',
            value: summary?.final_year_students ?? null,
            sub: summary ? 'Eligible in your scope' : 'Loading…',
          },
          {
            icon: 'calendar',
            label: 'Active assignments',
            value: summary?.assigned ?? null,
            sub: 'Open cohorts',
          },
          {
            icon: 'tick',
            label: 'Completed',
            value: summary?.completed ?? null,
            sub: 'Students who finished',
          },
          {
            icon: 'alert',
            label: 'Still to complete',
            value: summary?.needs_support ?? null,
            sub: 'Across active assignments',
          },
        ]}
      />

      <Panel title="Active assignments" sub="Cohorts you have assigned an interview to." bodyClassName={null}>
        {loading ? (
          <SectionState title="Loading assignments">Fetching cohort assignments.</SectionState>
        ) : error ? (
          <SectionState
            tone="err"
            title="Could not load assignments"
            action={<button type="button" className="sd-btn sd-btn--ghost" onClick={() => reload()}>Retry</button>}
          >
            {apiErrorMessage(error, 'Try again in a moment.')}
          </SectionState>
        ) : items.length === 0 ? (
          <SectionState
            title="No assignments yet"
            action={(
              <button type="button" className="sd-btn sd-btn--amber" onClick={openCreate}>
                <Icon name="plus" size={16} /> New assignment
              </button>
            )}
          >
            Create an assignment for a final-year cohort to get started.
          </SectionState>
        ) : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Assignment</th>
                  <th>Cohort</th>
                  <th>Mode</th>
                  <th>Due</th>
                  <th className="num">Completion</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td>{row.title}</td>
                    <td>{cohortLabel(row)}</td>
                    <td style={{ textTransform: 'capitalize' }}>{row.mode}</td>
                    <td>{formatDue(row.due_at)}</td>
                    <td className="num">
                      {row.eligible_count
                        ? `${row.completed_count}/${row.eligible_count} (${row.completion_pct}%)`
                        : '0 eligible'}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="sd-btn sd-btn--ghost"
                        onClick={() => onClose(row.id)}
                      >
                        Close
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

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
          <label className="q-check" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <Controller
              control={control}
              name="final_year_only"
              render={({ field }) => (
                <input
                  type="checkbox"
                  checked={Boolean(field.value)}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              )}
            />
            <span>Final-year students only</span>
          </label>
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

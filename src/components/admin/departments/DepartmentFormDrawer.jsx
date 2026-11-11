'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { QuirriRHFField, QuirriCombobox, AssignedCodeField } from '@/components/superadmin/quirri-ui';
import { Icon, FormDrawer, FormSection } from '@/components/shared/module-ui';
import { departmentsApi, fetchData } from '@/lib/api/superadmin/modules';
import { unwrap, apiErrorMessage } from '@/lib/api/superadmin/http';
import { tenantDepartmentCreateSchema, departmentUpdateSchema } from '@/lib/validation';
import { nextCodeFromList, nextCodeFor } from '@/lib/ids/uniqueSeries';
import { loadHodOptions } from './departmentModel';

const EMPTY = { name: '', code: '', hod_user_id: '' };

/**
 * Create / edit a department in a side drawer (3 fields → drawer, not a page).
 * focus: 'hod' opens straight on the HOD picker (used by "Assign HOD").
 * onSaved(department) receives the saved record (create returns the new id).
 */
export default function DepartmentFormDrawer({ open, department = null, tenantId, focus = null, onClose, onSaved }) {
  const editing = Boolean(department?.id);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(editing ? departmentUpdateSchema : tenantDepartmentCreateSchema),
    defaultValues: EMPTY,
    mode: 'onBlur',
  });
  const assignedCode = useWatch({ control, name: 'code' });
  const [saving, setSaving] = useState(false);
  // Double-click guard: `saving` only disables the button after a re-render, and the async zod
  // check lets a second submit through first, which created the department twice.
  const submitting = useRef(false);
  const [hodOptions, setHodOptions] = useState([]);
  const [hodState, setHodState] = useState('idle');

  useEffect(() => {
    if (!open) return undefined;
    if (editing) {
      reset({
        name: department.name ?? '',
        code: department.code ?? '',
        hod_user_id: department.hod_user_id ? String(department.hod_user_id) : '',
      });
      return undefined;
    }
    let cancelled = false;
    reset(EMPTY);
    (async () => {
      let code = nextCodeFor('department', []);
      try {
        code = await nextCodeFromList('department', (page, pageSize) => (
          fetchData(() => departmentsApi.list({ college_id: tenantId, page, pageSize }))
        ));
      } catch {
        /* API still issues the next free DEP-0001 */
      }
      if (!cancelled) reset({ ...EMPTY, code });
    })();
    return () => { cancelled = true; };
  }, [open, editing, department, reset, tenantId]);

  useEffect(() => {
    if (!open || !editing) return undefined;
    let cancelled = false;
    setHodState('loading');
    loadHodOptions(tenantId, department)
      .then((opts) => { if (!cancelled) { setHodOptions(opts); setHodState('ready'); } })
      .catch(() => { if (!cancelled) { setHodOptions([]); setHodState('error'); } });
    return () => { cancelled = true; };
  }, [open, tenantId, editing, department]);

  useEffect(() => {
    if (!open || focus !== 'hod') return undefined;
    const t = setTimeout(() => document.getElementById('dept-hod')?.focus(), 80);
    return () => clearTimeout(t);
  }, [open, focus, hodState]);

  const onSave = handleSubmit(async (values) => {
    if (submitting.current) return;
    if (!tenantId) {
      toast.error('Your college is missing from this session. Sign in again.');
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      const hod = values.hod_user_id || null;
      let saved;
      if (editing) {
        saved = unwrap(await departmentsApi.update(department.id, {
          name: values.name,
          hod_user_id: hod,
        }));
        toast.success('Department updated');
      } else {
        saved = unwrap(await departmentsApi.create({
          college_id: tenantId,
          name: values.name,
          hod_user_id: hod || undefined,
        }));
        toast.success('Department created');
      }
      onSaved?.({
        ...(editing ? department : {}),
        ...values,
        ...(saved && typeof saved === 'object' ? saved : {}),
      });
    } catch (err) {
      toast.error(apiErrorMessage(err, editing ? 'Could not save the department' : 'Could not create the department'));
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  });

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      busy={saving}
      title={editing ? `Edit ${department?.name || 'department'}` : 'New department'}
      description={editing
        ? 'Change the name or head of department. The unique ID cannot be changed. Status changes live on the department page.'
        : 'Add a department to your college. A unique ID is assigned automatically. You can assign its HOD once staff are placed in it.'}
      footer={(
        <>
          <button type="button" className="sd-btn sd-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button
            type="submit"
            form="department-form"
            className="sd-btn sd-btn--amber"
            disabled={saving || (editing && !isDirty) || (!editing && !assignedCode)}
          >
            <Icon name="tick" size={16} />
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create department'}
          </button>
        </>
      )}
    >
      <form id="department-form" onSubmit={onSave} noValidate className="un-form">
        <FormSection n={1} title="Department" sub="The name staff and students see. The unique ID is assigned automatically.">
          <QuirriRHFField
            control={control}
            name="name"
            fieldType="academicLabel"
            label="Department name"
            placeholder="e.g. Computer Science"
          />
          <AssignedCodeField
            control={control}
            label="Department ID"
            editing={editing}
          />
        </FormSection>
        {editing ? (
        <FormSection n={2} title="Head of department" sub="Optional. The HOD reviews this department's chapters before students see them.">
          <Controller
            control={control}
            name="hod_user_id"
            render={({ field, fieldState }) => (
              <QuirriCombobox
                id="dept-hod"
                label="HOD"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                error={fieldState.error?.message}
                disabled={hodState === 'loading'}
                placeholder={hodState === 'loading' ? 'Loading staff…' : 'Optional — type to search'}
                options={hodOptions}
                emptyMessage={`No HOD is placed in ${department?.name || 'this department'} yet`}
                hint={hodState === 'error'
                  ? 'Could not load staff. You can assign an HOD later.'
                  : hodState === 'ready' && hodOptions.length === 0
                    ? `Nobody is placed in ${department?.name || 'this department'} yet. Add staff in Staff & HOD and choose this department, then pick the HOD here.`
                    : `Only active staff placed in ${department?.name || 'this department'} are listed.`}
                full
              />
            )}
          />
        </FormSection>
        ) : (
          <FormSection n={2} title="Head of department" sub="Assign the HOD after the department exists.">
            <p className="ad-muted">
              An HOD must belong to the department. Create it first, place staff in it from Staff &amp; HOD,
              then open the department and choose Assign HOD.
            </p>
          </FormSection>
        )}
        {hasErrors ? (
          <p className="pm-form-error" role="alert">Check the highlighted fields and try again.</p>
        ) : null}
      </form>
    </FormDrawer>
  );
}

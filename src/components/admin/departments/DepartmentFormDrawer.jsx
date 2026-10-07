'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { QuirriRHFField, QuirriCombobox } from '@/components/superadmin/quirri-ui';
import { Icon, FormDrawer, FormSection } from '@/components/shared/module-ui';
import { departmentsApi } from '@/lib/api/superadmin/modules';
import { unwrap, apiErrorMessage } from '@/lib/api/superadmin/http';
import { tenantDepartmentCreateSchema, departmentUpdateSchema } from '@/lib/validation';
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
  const [saving, setSaving] = useState(false);
  const [hodOptions, setHodOptions] = useState([]);
  const [hodState, setHodState] = useState('idle');

  useEffect(() => {
    if (!open) return;
    reset(editing ? {
      name: department.name ?? '',
      code: department.code ?? '',
      hod_user_id: department.hod_user_id ? String(department.hod_user_id) : '',
    } : EMPTY);
  }, [open, editing, department, reset]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setHodState('loading');
    loadHodOptions(tenantId)
      .then((opts) => { if (!cancelled) { setHodOptions(opts); setHodState('ready'); } })
      .catch(() => { if (!cancelled) { setHodOptions([]); setHodState('error'); } });
    return () => { cancelled = true; };
  }, [open, tenantId]);

  useEffect(() => {
    if (!open || focus !== 'hod') return undefined;
    const t = setTimeout(() => document.getElementById('dept-hod')?.focus(), 80);
    return () => clearTimeout(t);
  }, [open, focus, hodState]);

  const onSave = handleSubmit(async (values) => {
    if (!tenantId) {
      toast.error('Your college is missing from this session. Sign in again.');
      return;
    }
    setSaving(true);
    try {
      const hod = values.hod_user_id || null;
      let saved;
      if (editing) {
        saved = unwrap(await departmentsApi.update(department.id, {
          name: values.name,
          code: values.code || null,
          hod_user_id: hod,
        }));
        toast.success('Department updated');
      } else {
        saved = unwrap(await departmentsApi.create({
          college_id: tenantId,
          name: values.name,
          code: values.code || undefined,
          hod_user_id: hod || undefined,
        }));
        toast.success('Department created');
      }
      onSaved?.({ ...(editing ? department : {}), ...values, ...(saved && typeof saved === 'object' ? saved : {}) });
    } catch (err) {
      toast.error(apiErrorMessage(err, editing ? 'Could not save the department' : 'Could not create the department'));
    } finally {
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
        ? 'Change the name, code or head of department. Status changes live on the department page.'
        : 'Add a department to your college. You can assign an HOD now or later.'}
      footer={(
        <>
          <button type="button" className="sd-btn sd-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button
            type="submit"
            form="department-form"
            className="sd-btn sd-btn--amber"
            disabled={saving || (editing && !isDirty)}
          >
            <Icon name="tick" size={16} />
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create department'}
          </button>
        </>
      )}
    >
      <form id="department-form" onSubmit={onSave} noValidate className="un-form">
        <FormSection n={1} title="Department" sub="The name staff and students see, and an optional short code.">
          <QuirriRHFField
            control={control}
            name="name"
            fieldType="academicLabel"
            label="Department name"
            placeholder="e.g. Computer Science"
          />
          <QuirriRHFField
            control={control}
            name="code"
            fieldType="code"
            label="Department code"
            placeholder="Optional, e.g. CSE"
            hint="Short code used in lists and reports."
          />
        </FormSection>
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
                emptyMessage="No active faculty or HOD accounts yet — add them in Staff & HOD"
                hint={hodState === 'error' ? 'Could not load staff. You can assign an HOD later.' : 'Only active faculty and HOD accounts in your college are listed.'}
                full
              />
            )}
          />
        </FormSection>
        {hasErrors ? (
          <p className="pm-form-error" role="alert">Check the highlighted fields and try again.</p>
        ) : null}
      </form>
    </FormDrawer>
  );
}

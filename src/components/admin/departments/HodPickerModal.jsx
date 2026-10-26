'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { QuirriCombobox } from '@/components/superadmin/quirri-ui';
import { Icon } from '@/components/shared/module-ui';
import { departmentsApi } from '@/lib/api/superadmin/modules';
import { unwrap, apiErrorMessage } from '@/lib/api/superadmin/http';
import { loadHodOptions } from './departmentModel';

/**
 * Focused "Assign / change HOD" dialog — one picker, staff of THIS department only.
 * preselect: a user id to start with (e.g. the HOD-role account already placed here).
 */
export default function HodPickerModal({ open, department, tenantId, preselect = '', onClose, onSaved }) {
  const [value, setValue] = useState('');
  const [options, setOptions] = useState([]);
  const [state, setState] = useState('idle');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setState('loading');
    loadHodOptions(tenantId, department)
      .then((opts) => {
        if (cancelled) return;
        setOptions(opts);
        setState('ready');
        const current = department?.hod_user_id ? String(department.hod_user_id) : '';
        const start = [current, preselect ? String(preselect) : ''].find((id) => id && opts.some((o) => String(o.value) === id));
        setValue(start || '');
      })
      .catch(() => { if (!cancelled) { setOptions([]); setState('error'); } });
    return () => { cancelled = true; };
  }, [open, tenantId, department, preselect]);

  const unchanged = String(value || '') === String(department?.hod_user_id || '');

  const save = async () => {
    if (!department?.id || !value) return;
    setSaving(true);
    try {
      const saved = unwrap(await departmentsApi.update(department.id, { hod_user_id: value }));
      toast.success('Head of department updated');
      onSaved?.(saved);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not assign the HOD'));
    } finally {
      setSaving(false);
    }
  };

  const none = state === 'ready' && options.length === 0;

  return (
    <QuirriModal
      open={open}
      onClose={onClose}
      busy={saving}
      title={department?.hod_user_id ? 'Change head of department' : 'Assign head of department'}
      crumb={department?.name}
      footer={(
        <>
          <button type="button" className="sd-btn sd-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
          {none ? null : (
            <button
              type="button"
              className="sd-btn sd-btn--amber"
              onClick={save}
              disabled={saving || !value || unchanged || state !== 'ready'}
            >
              <Icon name="tick" size={16} />
              {saving ? 'Saving…' : 'Save HOD'}
            </button>
          )}
        </>
      )}
    >
      <p className="ad-muted ad-hod-intro">The HOD reviews and publishes this department&apos;s chapters and question sets.</p>
      {none ? (
        <div className="ad-hod-empty">
          <p><b>Nobody is placed in {department?.name || 'this department'} yet.</b></p>
          <p className="ad-muted">
            Add a staff member in Staff &amp; HOD and choose {department?.name || 'this department'} as their department,
            or move an existing staff member here. Then come back to assign them.
          </p>
          <Link className="sp-link" href="/admin/staff">Go to Staff &amp; HOD <Icon name="arrow" size={14} /></Link>
        </div>
      ) : (
        <QuirriCombobox
          id="dept-hod-pick"
          label="HOD"
          value={value}
          onChange={(e) => setValue(e?.target?.value ?? e ?? '')}
          name="hod_user_id"
          disabled={state === 'loading'}
          placeholder={state === 'loading' ? 'Loading staff…' : 'Type to search'}
          options={options}
          emptyMessage="No match in this department"
          hint={state === 'error'
            ? 'Could not load staff. Try again in a moment.'
            : `Only active staff placed in ${department?.name || 'this department'} are listed.`}
          full
        />
      )}
    </QuirriModal>
  );
}

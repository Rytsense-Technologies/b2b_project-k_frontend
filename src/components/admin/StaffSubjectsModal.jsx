'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { ConfirmNote, Icon, SearchBox, SectionState, countLabel } from '@/components/shared/module-ui';
import { academicsApi } from '@/lib/api/superadmin/academics';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import { fetchData } from '@/lib/api/superadmin/modules';
import { useAsyncResource } from '@/hooks/useAsyncResource';

/**
 * Assign the subjects a faculty member / HOD teaches (SOW §6.3). Options are
 * the active subjects of their own department, grouped programme › semester.
 */
export default function StaffSubjectsModal({ staff, onClose, onSaved }) {
  const { data, loading, error, reload } = useAsyncResource(
    () => fetchData(() => academicsApi.getStaffSubjects(staff.id)),
    [staff.id],
  );
  const [picked, setPicked] = useState(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data && picked === null) setPicked(new Set(data.assigned.map((s) => s.id)));
  }, [data, picked]);

  // Assigned-but-archived subjects stay listed so they can be removed.
  const options = useMemo(() => {
    if (!data) return [];
    const byId = new Map(data.available.map((s) => [s.id, s]));
    data.assigned.forEach((s) => { if (!byId.has(s.id)) byId.set(s.id, { ...s, archived: true }); });
    return [...byId.values()];
  }, [data]);

  const needle = search.trim().toLowerCase();
  const groups = useMemo(() => {
    const out = new Map();
    options
      .filter((s) => !needle || [s.name, s.code, s.program, s.semester].some((v) => String(v || '').toLowerCase().includes(needle)))
      .forEach((s) => {
        const key = `${s.program || 'Programme'} · ${s.semester || 'Semester'}`;
        if (!out.has(key)) out.set(key, []);
        out.get(key).push(s);
      });
    return [...out.entries()];
  }, [options, needle]);

  const original = useMemo(() => new Set((data?.assigned || []).map((s) => s.id)), [data]);
  const changed = picked && (picked.size !== original.size || [...picked].some((id) => !original.has(id)));

  const toggle = (id) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const save = async () => {
    setSaving(true);
    try {
      await academicsApi.setStaffSubjects(staff.id, [...picked]);
      toast.success(picked.size ? `${countLabel(picked.size)} subject${picked.size === 1 ? '' : 's'} assigned` : 'Subjects cleared');
      await onSaved();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save the subjects'));
    } finally {
      setSaving(false);
    }
  };

  const noDepartment = data && !data.department_id;

  return (
    <QuirriModal
      open
      onClose={onClose}
      title="Assign subjects"
      crumb={`${staff.name || staff.email} · ${staff.department_name || staff.department || 'No department'}`}
      wide
      footer={(
        <>
          <button type="button" className="sd-btn sd-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <div className="right">
            <button type="button" className="sd-btn sd-btn--amber" onClick={save} disabled={saving || !changed}>
              <Icon name="tick" size={16} /> {saving ? 'Saving…' : 'Save subjects'}
            </button>
          </div>
        </>
      )}
    >
      <div className="un-form ad-subj-pick">
        {loading && !data ? <SectionState title="Loading subjects…" /> : null}
        {error ? (
          <SectionState
            tone="err"
            title="Could not load subjects"
            action={<button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload()}>Try again</button>}
          >
            {apiErrorMessage(error, 'Try again in a moment.')}
          </SectionState>
        ) : null}
        {noDepartment ? (
          <ConfirmNote title="No department yet">Give this staff member a department before assigning subjects.</ConfirmNote>
        ) : null}
        {data && !noDepartment && !options.length ? (
          <SectionState title="No subjects in this department yet">
            Add programmes and subjects under Academic structure › Programmes &amp; subjects first.
          </SectionState>
        ) : null}
        {data && options.length ? (
          <>
            <div className="ad-subj-head">
              <SearchBox placeholder="Search subjects…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <span className="sp-pill sp-pill--teal">{countLabel(picked?.size || 0)} selected</span>
            </div>
            {groups.length ? groups.map(([label, items]) => (
              <fieldset key={label} className="ad-subj-group">
                <legend>{label}</legend>
                {items.map((s) => (
                  <label key={s.id} className={`ad-subj-opt${picked?.has(s.id) ? ' is-on' : ''}`}>
                    <input type="checkbox" checked={Boolean(picked?.has(s.id))} onChange={() => toggle(s.id)} />
                    <span>
                      <b>{s.name}</b>
                      <small>{[s.code, s.archived ? 'Archived — untick to remove' : null].filter(Boolean).join(' · ') || 'No code'}</small>
                    </span>
                  </label>
                ))}
              </fieldset>
            )) : <p className="ad-muted">No subjects match “{search}”.</p>}
          </>
        ) : null}
      </div>
    </QuirriModal>
  );
}

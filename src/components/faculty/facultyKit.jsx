'use client';

/**
 * Small HOD / Faculty helpers shared by the /faculty pages (recipe v2):
 *  - FacultyScopeChip: the scope said once, as a HeadChip in ModuleHead.
 *  - ReadOnlyNote: the one full notice kept, for Faculty without subjects.
 *  - useFacultySubjects / useSubjectColor: one /faculty/subjects request per page load and a
 *    stable subject colour (dataColor(subject id)) so a subject looks the same on every page.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { HeadChip, ConfirmNote } from '@/components/shared/module-ui';
import { dataColor } from '@/components/shared/data-viz';
import { facultyDirectoryApi } from '@/lib/api/faculty/directory';

/** Scope chip: HOD = whole department · Faculty = their subjects · no subjects = view only. */
export function FacultyScopeChip({ scope }) {
  if (!scope) return <HeadChip icon="clock" tone="grey">Loading your scope…</HeadChip>;
  const dept = scope.department_name || 'Your department';
  if (scope.is_hod) return <HeadChip icon="layers">{`${dept} · whole department`}</HeadChip>;
  if (scope.read_only) return <HeadChip icon="lock" tone="grey">{`${dept} · view only`}</HeadChip>;
  const subs = scope.subjects || [];
  const firstSub = subs[0];
  const label = firstSub ? [firstSub.name, firstSub.code].filter(Boolean).join(' · ') : dept;
  return <HeadChip icon="book">{subs.length > 1 ? `${label} +${subs.length - 1}` : label}</HeadChip>;
}

/** Full notice only for the read-only state (Faculty with no subjects yet). */
export function ReadOnlyNote({ scope, what = 'content' }) {
  if (!scope || scope.is_hod || !scope.read_only) return null;
  return (
    <ConfirmNote icon="lock" title="View only until you have subjects">
      {`You can see your department's ${what}. Reviewing, publishing and approving unlock once your College Admin assigns you subjects.`}
    </ConfirmNote>
  );
}

let subjectsCache = null;
let subjectsInflight = null;

function loadSubjects(force = false) {
  if (force) { subjectsCache = null; subjectsInflight = null; }
  if (subjectsCache) return Promise.resolve(subjectsCache);
  if (!subjectsInflight) {
    subjectsInflight = facultyDirectoryApi.subjects()
      .then((d) => { subjectsCache = d; return d; })
      .finally(() => { subjectsInflight = null; });
  }
  return subjectsInflight;
}

/** GET /faculty/subjects, shared by every faculty page in this load. */
export function useFacultySubjects() {
  const [data, setData] = useState(subjectsCache);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!subjectsCache);
  useEffect(() => {
    let alive = true;
    loadSubjects()
      .then((d) => { if (alive) { setData(d); setLoading(false); } })
      .catch((e) => { if (alive) { setError(e); setLoading(false); } });
    return () => { alive = false; };
  }, []);
  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    return loadSubjects(true)
      .then((d) => { setData(d); return d; })
      .catch((e) => { setError(e); })
      .finally(() => setLoading(false));
  }, []);
  return { data, error, loading, reload };
}

/** colorFor(idOrName) → the subject's series colour (same on every faculty page). */
export function useSubjectColor() {
  const { data } = useFacultySubjects();
  const byName = useMemo(() => {
    const m = new Map();
    (data?.items || []).forEach((s) => { if (s.name) m.set(s.name.toLowerCase(), s.id); });
    return m;
  }, [data]);
  return useCallback((key) => {
    if (!key) return 'var(--neutral-300)';
    const id = byName.get(String(key).toLowerCase()) || String(key);
    return dataColor(id);
  }, [byName]);
}

/** Small coloured subject chip (dot + name). */
export function SubjectTag({ name, color }) {
  if (!name) return null;
  return (
    <span className="fa-subj">
      <i style={{ background: color }} aria-hidden="true" />
      {name}
    </span>
  );
}

/** Whole days since an ISO date (null when unknown). */
export function daysSince(iso) {
  const d = new Date(iso || '');
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

/** "today" · "1 day" · "6 days" */
export function ageLabel(iso) {
  const n = daysSince(iso);
  if (n == null) return null;
  if (n === 0) return 'today';
  return `${n} day${n === 1 ? '' : 's'}`;
}

/** 5 Oct 2026 */
export function dayLabel(iso) {
  const d = new Date(iso || '');
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Whole-number percent or a dash. */
export function pct(v) {
  const n = Number.parseFloat(v);
  return v == null || !Number.isFinite(n) ? '—' : `${Math.round(n)}%`;
}

export const OVERDUE_DAYS = 7;

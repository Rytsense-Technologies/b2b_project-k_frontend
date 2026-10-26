'use client';

import { useAsyncResource } from '@/hooks/useAsyncResource';
import { loadFacultyScope } from '@/hooks/useFacultyScope';
import { useAppSelector } from '@/store/hooks';
import { selectRole } from '@/store/slices/authSlice';
import { settingsApi } from '@/lib/api/superadmin/modules';
import { unwrap } from '@/lib/api/superadmin/http';

const NOT_SET = 'Not set';
const STAFF_NOTE = 'Your College Admin manages your department and subjects.';

const text = (v) => {
  const s = v == null ? '' : String(v).trim();
  return s && s !== '—' ? s : NOT_SET;
};

function subjectList(subjects) {
  if (!Array.isArray(subjects) || subjects.length === 0) return 'None assigned';
  const names = [...new Set(subjects.map((s) => String(s?.name ?? '').trim()).filter(Boolean))];
  return names.length ? names.join(', ') : 'None assigned';
}

function yearText(me) {
  const year = Number(me?.year_of_study);
  if (!year) return NOT_SET;
  const of = Number(me?.course_duration_years);
  const base = of ? `Year ${year} of ${of}` : `Year ${year}`;
  return me?.is_final_year ? `${base} · Final year` : base;
}

/** Pure builder (exported for tests / other callers). */
export function buildAccountScope(role, me, faculty) {
  const r = String(role || me?.role || '').toLowerCase();
  if (r === 'superadmin' || r === 'super_admin') {
    return { role: 'superadmin', rows: [{ label: 'Colleges', value: 'All colleges on the Quirri platform' }], note: null };
  }
  if (r === 'college_admin' || r === 'admin') {
    return {
      role: 'college_admin',
      rows: [
        { label: 'College', value: text(me?.tenant_name ?? me?.college_name) },
        { label: 'University', value: text(me?.university_name) },
      ],
      note: 'Contact Quirri support to change your college details.',
    };
  }
  if (r === 'faculty' || r === 'hod') {
    const isHod = Boolean(faculty?.is_hod) || r === 'hod' || me?.role === 'hod';
    const rows = [
      { label: 'Department', value: text(faculty?.department_name ?? me?.department_name ?? me?.department) },
      { label: 'College', value: text(faculty?.college_name ?? me?.tenant_name) },
      { label: 'Subjects you teach', value: faculty ? subjectList(faculty.subjects) : NOT_SET },
    ];
    return { role: isHod ? 'hod' : 'faculty', rows, note: STAFF_NOTE };
  }
  return {
    role: 'student',
    rows: [
      { label: 'College', value: text(me?.tenant_name ?? me?.college_name) },
      { label: 'Department', value: text(me?.department_name ?? me?.department) },
      { label: 'Programme', value: text(me?.program_name) },
      { label: 'Semester', value: text(me?.semester_name) },
      { label: 'Year', value: yearText(me) },
    ],
    note: 'Your College Admin manages your programme and year.',
  };
}

/**
 * Read-only "Your access" rows for Settings → Profile, per role.
 * Data: GET /auth/me, plus GET /faculty/me (shared cache) for HOD / Faculty.
 *
 * @param {string} [roleOverride] — portal role; defaults to the redux role
 *   ('superadmin' | 'college_admin' | 'faculty' (incl. HOD) | 'student').
 * @returns {{ loading: boolean, error: any, rows: {label: string, value: string}[],
 *   note: string | null, role: string | null, me: object | null, reload: Function }}
 */
export function useAccountScope(roleOverride) {
  const storeRole = useAppSelector(selectRole);
  const role = roleOverride || storeRole || null;

  const { data, loading, error, reload } = useAsyncResource(async () => {
    const body = unwrap(await settingsApi.get());
    const me = body?.user ?? body;
    const r = String(role || me?.role || '').toLowerCase();
    let faculty = null;
    if (r === 'faculty' || r === 'hod') {
      try { faculty = await loadFacultyScope(); } catch { faculty = null; }
    }
    return { me, faculty };
  }, [role]);

  const built = data ? buildAccountScope(role, data.me, data.faculty) : null;
  return {
    loading,
    error,
    rows: built?.rows ?? [],
    note: built?.note ?? null,
    role: built?.role ?? null,
    me: data?.me ?? null,
    reload,
  };
}

export default useAccountScope;

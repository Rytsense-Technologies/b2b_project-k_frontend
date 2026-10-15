import { usersApi } from '@/lib/api/superadmin/users';
import { asList, unwrap } from '@/lib/api/superadmin/http';
import { ROLES } from '@/lib/permissions';

export const DEPARTMENTS_PATH = '/admin/structure/departments';

export const departmentPath = (id) => `${DEPARTMENTS_PATH}/${encodeURIComponent(id)}`;

export const STATUS_FILTERS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
  { value: 'all', label: 'All' },
];

/** Academic hierarchy — only Department is live today (SOW §6.3). */
export const HIERARCHY = [
  { label: 'College', state: 'done' },
  { label: 'Department', state: 'current' },
  { label: 'Programme', state: 'done' },
  { label: 'Semester', state: 'done' },
  { label: 'Subject', state: 'done' },
  { label: 'Chapter', state: 'done' },
];

/** Levels below a department, with the academics summary key that counts them. */
export const LEVELS_BELOW = [
  { title: 'Programmes', key: 'programs', body: 'Degree programmes inside the department, such as B.E. Computer Science.' },
  { title: 'Semesters', key: 'semesters', body: 'Generated from each programme\'s duration; rename or add as needed.' },
  { title: 'Subjects', key: 'subjects', body: 'Taught in one semester; faculty are assigned to them from Staff.' },
  { title: 'Chapters', key: 'chapters', body: 'Ordered units of a subject; uploaded chapter videos are linked to them.' },
];

export const isActiveDept = (d) => d?.is_active !== false;

export function fullName(user) {
  return user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || '';
}

function personLabel(user) {
  const name = fullName(user);
  if (name && user?.email) return `${name} (${user.email})`;
  return name || user?.email || '—';
}

async function listUsers(role, tenantId) {
  const res = await usersApi.getUsers({ page: 1, pageSize: 100, role, tenantId });
  const body = unwrap(res);
  return asList(body?.items || body?.users || body, []);
}

/** Faculty + HOD accounts in this college (first 100 per role). */
export async function loadCollegeStaff(tenantId) {
  if (!tenantId) return [];
  const [hods, faculty] = await Promise.all([
    listUsers(ROLES.HOD, tenantId),
    listUsers(ROLES.FACULTY, tenantId),
  ]);
  const byId = new Map();
  [...hods, ...faculty].forEach((u) => { if (u?.id && !byId.has(u.id)) byId.set(u.id, u); });
  return [...byId.values()];
}

/**
 * HOD picker options: active faculty / HOD accounts placed in THIS department only
 * (the server rejects an HOD from another department). A new department has none yet.
 */
export async function loadHodOptions(tenantId, dept) {
  if (!tenantId || !dept?.id) return [];
  const staff = await loadCollegeStaff(tenantId);
  return staff
    .filter((u) => u.is_active !== false && inDepartment(u, dept))
    .map((u) => ({ value: u.id, label: personLabel(u) }));
}

/** Does this user belong to the department? Backend may send id or name. */
export function inDepartment(user, dept) {
  if (!user || !dept) return false;
  if (user.department_id && dept.id) return String(user.department_id) === String(dept.id);
  const name = (user.department_name || user.department || '').trim().toLowerCase();
  return Boolean(name) && name === String(dept.name || '').trim().toLowerCase();
}

/**
 * Who heads a department — the one rule the list, the record header, the HOD panel
 * and the People tab all use.
 *   assigned  — set as the department's head and placed in it.
 *   role      — not set as head, but an HOD account placed in this department
 *               (they already review its chapters).
 *   elsewhere — set as head but placed in another department, so they can't review here.
 *   none      — nobody.
 * `staff` = faculty + HOD accounts of the college (loadCollegeStaff).
 */
export function departmentHod(dept, staff = []) {
  if (!dept) return { state: 'none', user: null, name: null };
  const list = Array.isArray(staff) ? staff : [];
  if (dept.hod_user_id) {
    const user = list.find((u) => String(u.id) === String(dept.hod_user_id)) || null;
    const name = dept.hod_name || fullName(user) || user?.email || 'Assigned';
    if (user && !inDepartment(user, dept)) {
      return {
        state: 'elsewhere',
        user,
        name,
        otherDepartment: user.department_name || user.department || null,
      };
    }
    return { state: 'assigned', user, name };
  }
  const roleHod = list.find((u) => u?.role === ROLES.HOD && u.is_active !== false && inDepartment(u, dept));
  if (roleHod) return { state: 'role', user: roleHod, name: fullName(roleHod) || roleHod.email };
  return { state: 'none', user: null, name: null };
}

/** True when someone can review this department's chapters as its HOD. */
export const hodCanReview = (hod) => hod?.state === 'assigned' || hod?.state === 'role';

/**
 * Staff and students for one department. The users API has no department filter, so we
 * read this college's accounts (first 100 per role) and match them here.
 */
export async function loadDepartmentPeople(tenantId, dept) {
  if (!tenantId || !dept) return { staff: [], students: [], capped: false };
  const [faculty, hods, students] = await Promise.all([
    listUsers(ROLES.FACULTY, tenantId),
    listUsers(ROLES.HOD, tenantId),
    listUsers(ROLES.STUDENT, tenantId),
  ]);
  const staffMap = new Map();
  [...hods, ...faculty].forEach((u) => {
    if (inDepartment(u, dept) && u?.id) staffMap.set(u.id, u);
  });
  const collegeStaff = new Map();
  [...hods, ...faculty].forEach((u) => { if (u?.id && !collegeStaff.has(u.id)) collegeStaff.set(u.id, u); });
  return {
    staff: [...staffMap.values()],
    collegeStaff: [...collegeStaff.values()],
    students: students.filter((u) => inDepartment(u, dept)),
    capped: faculty.length >= 100 || hods.length >= 100 || students.length >= 100,
  };
}

export function dateLabel(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function httpStatus(err) {
  return err?.response?.status ?? err?.status ?? null;
}

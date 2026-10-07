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
  { label: 'Programme', state: 'later' },
  { label: 'Semester', state: 'later' },
  { label: 'Subject', state: 'later' },
];

export const LEVELS_LATER = [
  { title: 'Programmes', body: 'Degree programmes inside the department, such as B.E. Computer Science.' },
  { title: 'Years and semesters', body: 'The year and semester calendar each programme follows.' },
  { title: 'Subjects and chapters', body: 'Subjects per semester, with the chapter videos you upload.' },
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

/** Active faculty + HOD accounts in this college, for the HOD picker. */
export async function loadHodOptions(tenantId) {
  if (!tenantId) return [];
  const [faculty, hods] = await Promise.all([
    listUsers(ROLES.FACULTY, tenantId),
    listUsers(ROLES.HOD, tenantId),
  ]);
  const byId = new Map();
  [...faculty, ...hods].forEach((u) => {
    if (u?.id && u.is_active !== false) byId.set(u.id, u);
  });
  return [...byId.values()].map((u) => ({ value: u.id, label: personLabel(u) }));
}

/** Does this user belong to the department? Backend may send id or name. */
export function inDepartment(user, dept) {
  if (!user || !dept) return false;
  if (user.department_id && dept.id) return String(user.department_id) === String(dept.id);
  const name = (user.department_name || user.department || '').trim().toLowerCase();
  return Boolean(name) && name === String(dept.name || '').trim().toLowerCase();
}

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
  return {
    staff: [...staffMap.values()],
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

export const ROLES = {
  SUPERADMIN:    'superadmin',
  COLLEGE_ADMIN: 'college_admin',
  FACULTY:       'faculty',
  STUDENT:       'student',
};

export const ROLE_PERMISSIONS = {
  superadmin:    ['*'],
  college_admin: [
    'users.read',    'users.write',
    'reports.read',  'analytics.read',
    'faculty.read',  'faculty.write',
    'students.read', 'students.write',
    'settings.read', 'settings.write',
  ],
  faculty: [
    'content.read', 'content.write', 'content.review',
    'students.read', 'qna.read', 'reports.read',
  ],
  student: [
    'interview.start', 'reports.read',
    'profile.write',   'content.read', 'jobs.read',
  ],
};

export function getPermissions(role) {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(role, permission) {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes('*') || perms.includes(permission);
}

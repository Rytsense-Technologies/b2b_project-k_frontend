import { getPermissions, ROLES } from '@/lib/permissions';
import { getRoleCookie, setRoleCookie } from '@/lib/tokens';

/**
 * Backend `user_type` (from POST /auth/login `user` object) → frontend `role` (pk_role cookie).
 * Ask backend to use these exact user_type strings for consistency.
 */
export const BACKEND_USER_TYPE_TO_ROLE = {
  super_admin: ROLES.SUPERADMIN,
  superadmin: ROLES.SUPERADMIN,
  college_admin: ROLES.COLLEGE_ADMIN,
  admin: ROLES.COLLEGE_ADMIN,
  faculty: ROLES.FACULTY,
  hod: ROLES.FACULTY,
  student: ROLES.STUDENT,
  individual: ROLES.STUDENT,
};

/**
 * Whether the viewer may change role, deactivate or revoke the invite of `target`.
 * Only a Super Admin acts on a College Admin (self included); the API answers 403 otherwise.
 */
export function canManageUser(viewerRole, target) {
  if (!target) return false;
  const raw = String(target.role || target.user_type || '').toLowerCase();
  const targetIsCollegeAdmin = raw === 'college_admin' || raw === 'admin';
  if (targetIsCollegeAdmin) return viewerRole === ROLES.SUPERADMIN;
  return true;
}

/** Recommended user_type values for backend team */
export const BACKEND_USER_TYPES = {
  SUPER_ADMIN: 'super_admin',
  COLLEGE_ADMIN: 'college_admin',
  FACULTY: 'faculty',
  STUDENT: 'student',
  /** B2C signup / individual learners */
  INDIVIDUAL: 'individual',
};

/**
 * Maps API user_type / role string to internal role used in Redux + middleware.
 * Aliases (e.g. hod → faculty portal) are applied before exact ROLES matches.
 * Unknown or missing values return null, so login can refuse them (see isPortalRole).
 */
export function mapUserTypeToRole(userType) {
  if (!userType) return null;
  const key = String(userType).toLowerCase().trim();
  if (Object.prototype.hasOwnProperty.call(BACKEND_USER_TYPE_TO_ROLE, key)) {
    return BACKEND_USER_TYPE_TO_ROLE[key];
  }
  if (Object.values(ROLES).includes(key)) return key;
  return null;
}

/** Resolve role from unified login payload (role, user_type on root or user). */
export function resolveRoleFromLoginPayload(data) {
  const raw =
    data?.role ??
    data?.user?.role ??
    data?.user_type ??
    data?.user?.user_type;
  return mapUserTypeToRole(raw);
}

/** After /auth/me: keep pk_role on the server's role, so a role change reaches the middleware without a new sign-in. */
export function syncRoleCookie(payload) {
  const role = resolveRoleFromLoginPayload(payload);
  if (role && role !== getRoleCookie()) setRoleCookie(role);
}

/**
 * Landing routes after login.
 * Super Admin → `/superadmin/*`; College Admin → `/admin/*`;
 * HOD/Faculty → `/faculty/*`; Student → `/student/*`.
 */
export const ROLE_HOME_PATHS = {
  [ROLES.SUPERADMIN]: '/superadmin/dashboard',
  [ROLES.COLLEGE_ADMIN]: '/admin/dashboard',
  [ROLES.FACULTY]: '/faculty/dashboard',
  [ROLES.HOD]: '/faculty/dashboard',
  [ROLES.STUDENT]: '/student/home',
};

export function isKnownRole(role) {
  return role && Object.values(ROLES).includes(role);
}

export function isB2bRole(role) {
  return (
    role === ROLES.SUPERADMIN
    || role === ROLES.COLLEGE_ADMIN
    || role === ROLES.FACULTY
    || role === ROLES.HOD
  );
}

/** Any Phase 1 portal role that may sign in at /auth/login. */
export function isPortalRole(role) {
  return (
    role === ROLES.SUPERADMIN
    || role === ROLES.COLLEGE_ADMIN
    || role === ROLES.FACULTY
    || role === ROLES.HOD
    || role === ROLES.STUDENT
  );
}

/**
 * Where to send the user after login (before router.push).
 * @param {string|null} role
 * @param {string|undefined} onbCookie - pk_onb value for B2C onboarding
 */
export function getPostLoginPath(role, onbCookie) {
  if (role && ROLE_HOME_PATHS[role]) return ROLE_HOME_PATHS[role];
  return ROLE_HOME_PATHS[ROLES.STUDENT];
}

export function buildUserObject(raw) {
  const u = raw?.user && typeof raw.user === 'object' ? raw.user : raw;
  if (!u?.email) return null;

  const first = u.first_name ?? '';
  const last = u.last_name ?? '';
  const name = (u.name ?? `${first} ${last}`.trim()).trim();

  return {
    id: u.id ?? null,
    name,
    email: u.email,
    first_name: u.first_name ?? null,
    last_name: u.last_name ?? null,
    avatar_url: u.avatar_url ?? null,
    department: u.department ?? u.dept ?? null,
    tenant_name: u.tenant_name ?? u.college_name ?? null,
    college_name: u.college_name ?? u.tenant_name ?? null,
    university_name: u.university_name ?? u.university ?? null,
  };
}

/**
 * Normalize any login API payload into a consistent session shape.
 */
export function normalizeLoginSession(data) {
  const user = buildUserObject(data);
  if (!user) return null;

  const role = resolveRoleFromLoginPayload(data);

  const permissions =
    data.permissions?.length ? data.permissions : getPermissions(role);

  const tenantId =
    data.tenant_id ??
    data.tenantId ??
    data.user?.tenant_id ??
    null;

  return {
    user,
    role,
    tenant_id: tenantId,
    permissions,
    onboarding_complete: isB2bRole(role),
  };
}

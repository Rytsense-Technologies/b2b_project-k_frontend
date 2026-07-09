import { getPermissions, ROLES } from '@/lib/permissions';

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
  student: ROLES.STUDENT,
  individual: ROLES.STUDENT,
};

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
 */
export function mapUserTypeToRole(userType) {
  if (!userType) return ROLES.STUDENT;
  const key = String(userType).toLowerCase().trim();
  if (Object.values(ROLES).includes(key)) return key;
  return BACKEND_USER_TYPE_TO_ROLE[key] ?? ROLES.STUDENT;
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

/** Default landing route after login for each role */
export const ROLE_HOME_PATHS = {
  [ROLES.SUPERADMIN]: '/superadmin/dashboard',
  [ROLES.COLLEGE_ADMIN]: '/admin/dashboard',
  [ROLES.FACULTY]: '/faculty/dashboard',
  [ROLES.STUDENT]: '/main/dashboard',
};

export function isKnownRole(role) {
  return role && Object.values(ROLES).includes(role);
}

export function isB2bRole(role) {
  return role === ROLES.SUPERADMIN || role === ROLES.COLLEGE_ADMIN || role === ROLES.FACULTY;
}

/**
 * Where to send the user after login (before router.push).
 * @param {string|null} role
 * @param {string|undefined} onbCookie - pk_onb value for B2C onboarding
 */
export function getPostLoginPath(role, onbCookie) {
  if (role === ROLES.SUPERADMIN) return ROLE_HOME_PATHS[ROLES.SUPERADMIN];
  if (role === ROLES.COLLEGE_ADMIN) return ROLE_HOME_PATHS[ROLES.COLLEGE_ADMIN];
  if (role === ROLES.FACULTY) return ROLE_HOME_PATHS[ROLES.FACULTY];

  if (onbCookie === 'plan') return '/pricing?onboarding=1';
  if (onbCookie === 'profile') return '/main/profile-setup';
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
    plan: u.plan ?? 'free',
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

  const plan = isB2bRole(role) ? (user.plan === 'free' ? 'standard' : user.plan) : (user.plan || 'free');

  const tenantId =
    data.tenant_id ??
    data.tenantId ??
    data.user?.tenant_id ??
    null;

  return {
    user: { ...user, plan },
    role,
    tenant_id: tenantId,
    permissions,
    plan,
    onboarding_complete: isB2bRole(role),
    plan_selected: isB2bRole(role) ? true : undefined,
  };
}

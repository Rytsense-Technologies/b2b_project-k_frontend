// COV: role mapping and permission rules the portals rely on (roles/*, rules/role-scope).
import { describe, expect, it } from 'vitest';
import { getPermissions, hasPermission, ROLES, ROLE_PERMISSIONS } from '@/lib/permissions';
import {
  buildUserObject,
  getPostLoginPath,
  isB2bRole,
  isKnownRole,
  isPortalRole,
  mapUserTypeToRole,
  normalizeLoginSession,
  resolveRoleFromLoginPayload,
} from './rbac';

describe('permissions', () => {
  it('superadmin has every permission, other roles only their own', () => {
    expect(hasPermission('superadmin', 'anything.at.all')).toBe(true);
    expect(hasPermission('college_admin', 'users.write')).toBe(true);
    expect(hasPermission('college_admin', 'content.write')).toBe(false);
    expect(hasPermission('faculty', 'content.review')).toBe(true);
    expect(hasPermission('faculty', 'users.write')).toBe(false);
    expect(hasPermission('student', 'content.write')).toBe(false);
    expect(hasPermission('student', 'content.read')).toBe(true);
  });

  it('unknown or missing roles have no permissions', () => {
    expect(hasPermission(undefined, 'content.read')).toBe(false);
    expect(hasPermission('root', 'content.read')).toBe(false);
    expect(getPermissions('root')).toEqual([]);
    expect(getPermissions(null)).toEqual([]);
  });

  it('HOD gets the faculty permission set', () => {
    expect(getPermissions(ROLES.HOD)).toBe(ROLE_PERMISSIONS.faculty);
    expect(hasPermission('hod', 'content.review')).toBe(true);
    expect(hasPermission('hod', 'users.write')).toBe(false);
  });
});

describe('role mapping', () => {
  it.each([
    ['super_admin', 'superadmin'],
    ['SuperAdmin', 'superadmin'],
    ['  college_admin ', 'college_admin'],
    ['admin', 'college_admin'],
    ['hod', 'faculty'],
    ['faculty', 'faculty'],
    ['individual', 'student'],
    ['student', 'student'],
  ])('%s -> %s', (input, role) => {
    expect(mapUserTypeToRole(input)).toBe(role);
  });

  // The restored rbac refuses an unknown or empty type (no role, so no portal) instead of
  // defaulting to student: never an upgrade, and safer than guessing.
  it('never upgrades an unknown or empty type: it gives no role', () => {
    expect(mapUserTypeToRole('')).toBeNull();
    expect(mapUserTypeToRole(null)).toBeNull();
    expect(mapUserTypeToRole('owner')).toBeNull();
    expect(mapUserTypeToRole('constructor')).toBeNull();
    expect(mapUserTypeToRole('toString')).toBeNull();
  });

  it('reads role before user_type, root before user', () => {
    expect(resolveRoleFromLoginPayload({ role: 'college_admin', user_type: 'student' })).toBe('college_admin');
    expect(resolveRoleFromLoginPayload({ user: { role: 'hod' } })).toBe('faculty');
    expect(resolveRoleFromLoginPayload({ user: { user_type: 'super_admin' } })).toBe('superadmin');
    expect(resolveRoleFromLoginPayload(undefined)).toBeNull();
  });

  it('classifies portal and B2B roles', () => {
    for (const r of ['superadmin', 'college_admin', 'faculty', 'hod']) {
      expect(isB2bRole(r)).toBe(true);
      expect(isPortalRole(r)).toBe(true);
    }
    expect(isB2bRole('student')).toBe(false);
    expect(isPortalRole('student')).toBe(true);
    expect(isPortalRole('individual')).toBe(false);
    expect(Boolean(isKnownRole(''))).toBe(false);
    expect(isKnownRole('hod')).toBe(true);
  });

  it('sends each role to its own home and unknown roles to student home', () => {
    expect(getPostLoginPath('superadmin')).toBe('/superadmin/dashboard');
    expect(getPostLoginPath('college_admin')).toBe('/admin/dashboard');
    expect(getPostLoginPath('hod')).toBe('/faculty/dashboard');
    expect(getPostLoginPath('faculty')).toBe('/faculty/dashboard');
    expect(getPostLoginPath('student')).toBe('/student/home');
    expect(getPostLoginPath(null)).toBe('/student/home');
  });
});

describe('login session shape', () => {
  it('returns null without an e-mail', () => {
    expect(buildUserObject({ user: { name: 'x' } })).toBeNull();
    expect(normalizeLoginSession({})).toBeNull();
  });

  it('builds a name from first and last names and keeps tenant fields aligned', () => {
    const u = buildUserObject({ email: 'a@b.c', first_name: 'Asha', last_name: 'R', college_name: 'GCT' });
    expect(u.name).toBe('Asha R');
    expect(u.tenant_name).toBe('GCT');
    expect(u.college_name).toBe('GCT');
  });

  it('uses server permissions when given, else the role defaults', () => {
    const own = normalizeLoginSession({ user: { email: 'a@b.c', user_type: 'faculty' }, permissions: ['x'] });
    expect(own.permissions).toEqual(['x']);
    const def = normalizeLoginSession({ user: { email: 'a@b.c', user_type: 'college_admin', tenant_id: 't1' } });
    expect(def.permissions).toBe(ROLE_PERMISSIONS.college_admin);
    expect(def.tenant_id).toBe('t1');
    expect(def.onboarding_complete).toBe(true);
  });

  it('a student session is not marked onboarded as a B2B user', () => {
    const s = normalizeLoginSession({ email: 's@b.c', user_type: 'student' });
    expect(s.role).toBe('student');
    expect(s.onboarding_complete).toBe(false);
    expect(s.tenant_id).toBeNull();
  });
});

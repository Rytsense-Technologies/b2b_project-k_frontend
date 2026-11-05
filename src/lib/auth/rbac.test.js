// FE-019: an unknown role must not fall through to the student portal.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isPortalRole, mapUserTypeToRole, normalizeLoginSession, syncRoleCookie } from './rbac';

describe('mapUserTypeToRole', () => {
  it.each([
    ['super_admin', 'superadmin'],
    ['college_admin', 'college_admin'],
    ['hod', 'faculty'],
    ['faculty', 'faculty'],
    ['student', 'student'],
    ['individual', 'student'],
    [' STUDENT ', 'student'],
  ])('maps %s', (input, want) => {
    expect(mapUserTypeToRole(input)).toBe(want);
  });

  it.each([['something_new'], [''], [null], [undefined]])('rejects %s', (input) => {
    expect(mapUserTypeToRole(input)).toBeNull();
  });

  it('carries no plan state (FE-026)', () => {
    const session = normalizeLoginSession({ user: { email: 'a@b.in', user_type: 'student', plan: 'premium' } });
    expect(session).not.toHaveProperty('plan');
    expect(session.user).not.toHaveProperty('plan');
  });

  it('keeps an unknown role out of the portals at login', () => {
    const session = normalizeLoginSession({ user: { email: 'a@b.in', user_type: 'something_new' } });
    expect(isPortalRole(session.role)).toBe(false);
    expect(session.permissions).toEqual([]);
  });
});

// AUTH-027: pk_role follows the server after a role change.
describe('syncRoleCookie', () => {
  afterEach(() => { vi.unstubAllGlobals(); });
  const browser = (cookie) => {
    const doc = { cookie };
    vi.stubGlobal('document', doc);
    vi.stubGlobal('window', { location: { protocol: 'http:' } });
    return doc;
  };

  it('rewrites a stale cookie', () => {
    const doc = browser('pk_role=student');
    syncRoleCookie({ role: 'college_admin', user: {} });
    expect(doc.cookie).toContain('pk_role=college_admin');
  });

  it('leaves a matching cookie alone', () => {
    const doc = browser('pk_role=faculty');
    syncRoleCookie({ role: 'hod' });
    expect(doc.cookie).toBe('pk_role=faculty');
  });

  it('ignores a role it does not know', () => {
    const doc = browser('pk_role=student');
    syncRoleCookie({ role: 'something_new' });
    expect(doc.cookie).toBe('pk_role=student');
  });
});

// P4 DECB: a College Admin acting on any College Admin (self included) gets 403 on role change,
// deactivate and revoke-invite, so those controls are hidden for that pair.
describe('canManageUser', async () => {
  const { canManageUser } = await import('./rbac');
  it('hides peer College Admin actions from a College Admin', () => {
    expect(canManageUser('college_admin', { role: 'college_admin' })).toBe(false);
    expect(canManageUser('college_admin', { user_type: 'admin' })).toBe(false);
  });
  it('allows a College Admin on staff and students, and a Super Admin on anyone', () => {
    expect(canManageUser('college_admin', { role: 'hod' })).toBe(true);
    expect(canManageUser('college_admin', { role: 'student' })).toBe(true);
    expect(canManageUser('superadmin', { role: 'college_admin' })).toBe(true);
    expect(canManageUser('college_admin', null)).toBe(false);
  });
});

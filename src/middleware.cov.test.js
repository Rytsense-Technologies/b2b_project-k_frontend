// COV: portal route guard (flows/login, roles/*). Real NextRequest objects, no stubs.
import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

const BASE = 'http://localhost:3000';

function req(path, cookies = {}) {
  const cookie = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  return new NextRequest(new URL(path, BASE), { headers: cookie ? { cookie } : {} });
}
const where = (res) => {
  const loc = res.headers.get('location');
  return loc ? new URL(loc).pathname : null;
};
const session = (role, tenant) => ({ pk_session: '1', pk_role: role, ...(tenant ? { pk_tenant: tenant } : {}) });

describe('portal guard', () => {
  it('lets signed-out visitors reach public pages', async () => {
    for (const p of ['/auth/login', '/auth/forgot-password', '/auth/reset-password/abc', '/activate']) {
      expect(where(await middleware(req(p)))).toBeNull();
    }
  });

  it('sends legacy portal login URLs to the single login and keeps the query', async () => {
    const res = await middleware(req('/admin/login?next=/admin/users'));
    const loc = new URL(res.headers.get('location'));
    expect(loc.pathname).toBe('/auth/login');
    expect(loc.search).toBe('?next=/admin/users');
  });

  it.each(['/admin/dashboard', '/superadmin/colleges', '/faculty/dashboard', '/student/home', '/'])(
    'sends a signed-out visitor on %s to login',
    async (p) => {
      expect(where(await middleware(req(p)))).toBe('/auth/login');
    },
  );

  it('a role cookie without a session is not a session', async () => {
    expect(where(await middleware(req('/admin/dashboard', { pk_role: 'college_admin' })))).toBe('/auth/login');
  });

  it.each([
    ['student', '/admin/dashboard', '/student/home'],
    ['student', '/superadmin/dashboard', '/student/home'],
    ['student', '/faculty/dashboard', '/student/home'],
    ['faculty', '/admin/users', '/faculty/dashboard'],
    ['hod', '/superadmin/colleges', '/faculty/dashboard'],
    ['college_admin', '/superadmin/colleges', '/admin/dashboard'],
    ['college_admin', '/student/home', '/admin/dashboard'],
    ['superadmin', '/admin/dashboard', '/superadmin/dashboard'],
  ])('%s opening %s is sent to %s', async (role, path, home) => {
    expect(where(await middleware(req(path, session(role))))).toBe(home);
  });

  it('each role reaches its own portal and the tenant header is forwarded', async () => {
    const res = await middleware(req('/admin/users', session('college_admin', 't-42')));
    expect(where(res)).toBeNull();
    expect(res.headers.get('x-tenant-id')).toBe('t-42');
    expect(where(await middleware(req('/faculty/dashboard', session('hod'))))).toBeNull();
    expect(where(await middleware(req('/faculty/dashboard', session('faculty'))))).toBeNull();
    expect(where(await middleware(req('/student/home', session('student'))))).toBeNull();
    expect(where(await middleware(req('/superadmin/dashboard', session('superadmin'))))).toBeNull();
  });

  it('an unknown role with a session cannot enter any portal', async () => {
    const res = await middleware(req('/admin/dashboard', session('root')));
    expect(where(res)).toBe('/auth/login');
  });

  it('legacy B2C paths and the root go home or to login', async () => {
    expect(where(await middleware(req('/pricing', session('student'))))).toBe('/student/home');
    expect(where(await middleware(req('/main/x')))).toBe('/auth/login');
    expect(where(await middleware(req('/', session('superadmin'))))).toBe('/superadmin/dashboard');
    expect(where(await middleware(req('/somewhere-else', session('faculty'))))).toBe('/faculty/dashboard');
  });
});

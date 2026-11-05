// FE-003: redirects stay on the host the user is on, behind any proxy.
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { middleware } from './middleware';

const PROXY = { 'x-forwarded-host': 'portal.example.com', 'x-forwarded-proto': 'https' };

function call(path, { headers = {}, cookie = '' } = {}) {
  return middleware(new NextRequest(`http://localhost:3100${path}`, {
    headers: { host: 'app.internal:3100', cookie, ...headers },
  }));
}

const STUDENT = 'pk_session=1; pk_role=student';

describe('middleware redirects', () => {
  it.each([
    ['/', STUDENT, 'https://portal.example.com/student/home'],
    ['/admin/dashboard', STUDENT, 'https://portal.example.com/student/home'],
    ['/admin/dashboard', '', 'https://portal.example.com/auth/login'],
    ['/', '', 'https://portal.example.com/auth/login'],
    ['/pricing', STUDENT, 'https://portal.example.com/student/home'],
    ['/nowhere', '', 'https://portal.example.com/auth/login'],
  ])('%s with cookie "%s" uses the forwarded host', async (path, cookie, want) => {
    const res = await call(path, { headers: PROXY, cookie });
    expect(res.headers.get('location')).toBe(want);
  });

  it('keeps the query string on legacy login URLs', async () => {
    const res = await call('/admin/login?next=1', { headers: PROXY });
    expect(res.headers.get('location')).toBe('https://portal.example.com/auth/login?next=1');
  });

  it('falls back to Host when no proxy header is sent', async () => {
    const res = await call('/admin/dashboard');
    expect(res.headers.get('location')).toBe('http://app.internal:3100/auth/login');
  });

  it('uses the first entry of a forwarded chain', async () => {
    const res = await call('/', {
      headers: { 'x-forwarded-host': 'portal.example.com, edge.internal', 'x-forwarded-proto': 'https,http' },
    });
    expect(res.headers.get('location')).toBe('https://portal.example.com/auth/login');
  });

  it('ignores a malformed forwarded host', async () => {
    const res = await call('/', { headers: { 'x-forwarded-host': 'evil.example/path?x=' } });
    expect(res.headers.get('location')).toBe('http://app.internal:3100/auth/login');
  });
});

// COV: client session cookies (AUTH-010 legacy token removal, flows/login, flows/logout).
import { beforeEach, describe, expect, it, vi } from 'vitest';

let jar;
let store;
let href;
function install(protocol = 'http:', pathname = '/student/home') {
  jar = [];
  store = { voiceQnaToken: 'old', other: 'keep' };
  href = null;
  vi.stubGlobal('document', {
    // Browser semantics: the latest write for a name wins; max-age=0 deletes it.
    get cookie() {
      const live = new Map();
      for (const c of jar) {
        const [pair] = c.split(';');
        const name = pair.split('=')[0];
        if (/max-age=0/.test(c)) live.delete(name); else live.set(name, pair);
      }
      return [...live.values()].join('; ');
    },
    set cookie(v) { jar.push(v); },
  });
  vi.stubGlobal('window', {
    location: { protocol, pathname, set href(v) { href = v; }, get href() { return href; } },
    localStorage: { removeItem: (k) => { delete store[k]; } },
    sessionStorage: { removeItem: () => {} },
  });
}

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe('session cookies', () => {
  it('sign-in sets a 30-day Lax session flag, Secure only on https', async () => {
    install('https:');
    const t = await import('./tokens');
    t.setSessionCookie();
    expect(jar.at(-1)).toMatch(/^pk_session=1; path=\/; max-age=2592000; SameSite=Lax; Secure$/);
    install('http:');
    t.setSessionCookie();
    expect(jar.at(-1)).not.toMatch(/Secure/);
  });

  it('sign-in and logout drop the legacy voice token but nothing else', async () => {
    install();
    const t = await import('./tokens');
    t.setSessionCookie();
    expect(store).toEqual({ other: 'keep' });
    store.voiceQnaToken = 'again';
    t.clearTokens();
    expect(store).toEqual({ other: 'keep' });
  });

  it('logout expires every frontend cookie', async () => {
    install();
    const t = await import('./tokens');
    t.clearTokens();
    const expired = jar.filter((c) => /max-age=0/.test(c)).map((c) => c.split('=')[0]);
    expect(expired.sort()).toEqual(['pk_onb', 'pk_role', 'pk_session', 'pk_tenant']);
  });

  it('role and tenant cookies round-trip with encoding; empty tenant reads as null', async () => {
    install();
    const t = await import('./tokens');
    t.setRoleCookie('college_admin');
    expect(t.getRoleCookie()).toBe('college_admin');
    t.setTenantCookie('a b/c');
    expect(t.getTenantCookie()).toBe('a b/c');
    t.setTenantCookie(null);
    expect(t.getTenantCookie()).toBeNull();
  });

  it('is a no-op on the server', async () => {
    const t = await import('./tokens');
    expect(() => { t.setSessionCookie(); t.clearTokens(); t.setRoleCookie('x'); }).not.toThrow();
    expect(t.getRoleCookie()).toBeNull();
  });
});

describe('session expiry', () => {
  it('clears local state and redirects to login once', async () => {
    install();
    const { handleSessionExpired } = await import('./sessionExpiry');
    handleSessionExpired();
    expect(href).toBe('/auth/login');
    expect(store.voiceQnaToken).toBeUndefined();
    href = null;
    handleSessionExpired();
    expect(href).toBeNull();
  });

  it('does nothing on auth pages', async () => {
    install('http:', '/auth/login');
    const { handleSessionExpired } = await import('./sessionExpiry');
    handleSessionExpired();
    expect(href).toBeNull();
    expect(store.voiceQnaToken).toBe('old');
  });
});

// SECB-009: nonce CSP, pinned sources.
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { middleware } from '../../middleware';
import { buildCsp, configuredOrigins, createNonce, originList } from './csp';

const parse = (csp) => Object.fromEntries(csp.split('; ').map((d) => {
  const [name, ...sources] = d.split(' ');
  return [name, sources];
}));

describe('buildCsp', () => {
  const prod = parse(buildCsp({ nonce: 'abc', host: 'portal.example.com' }));

  it('runs scripts by nonce only, with no inline or eval escape hatch', () => {
    expect(prod['script-src']).toEqual(["'self'", "'nonce-abc'", "'strict-dynamic'"]);
    expect(Object.values(prod).flat()).not.toContain("'unsafe-eval'");
    expect(prod['style-src']).toEqual(["'self'", "'nonce-abc'"]);
    // Only style="" attributes stay inline (server-rendered React styles cannot carry a nonce).
    expect(prod['style-src-attr']).toEqual(["'unsafe-inline'"]);
  });

  it('has no scheme-wide network, image or media source', () => {
    for (const name of ['connect-src', 'img-src', 'media-src', 'default-src', 'script-src']) {
      for (const bare of ['https:', 'http:', 'wss:', 'ws:', '*']) expect(prod[name], name).not.toContain(bare);
    }
  });

  it('allows this host, its LiveKit socket and the media bucket', () => {
    expect(prod['connect-src']).toEqual(["'self'", 'wss://portal.example.com']);
    expect(prod['media-src']).toContain('https://projectk-media.s3.ap-south-1.amazonaws.com');
    expect(prod['img-src']).toContain('https://projectk-media.s3.ap-south-1.amazonaws.com');
    expect(prod['frame-ancestors']).toEqual(["'none'"]);
    expect(prod['object-src']).toEqual(["'none'"]);
  });

  it('adds the local API and LiveKit only for a page served on localhost', () => {
    const local = parse(buildCsp({ nonce: 'n', host: 'localhost:3000' }));
    expect(local['connect-src']).toEqual(expect.arrayContaining(['ws://localhost:3000', 'http://localhost:8000', 'ws://localhost:7880']));
    expect(prod['connect-src']).not.toContain('http://localhost:8000');
  });

  it('ignores a forged host', () => {
    const csp = buildCsp({ nonce: 'n', host: "evil.example; script-src 'unsafe-inline'" });
    expect(csp).not.toContain('evil');
    expect(parse(csp)['connect-src']).toEqual(["'self'"]);
  });

  it('keeps eval and inline <style> for next dev only', () => {
    const dev = parse(buildCsp({ nonce: 'n', host: 'localhost:3000', dev: true }));
    expect(dev['script-src']).toContain("'unsafe-eval'");
    expect(dev['style-src']).toEqual(["'self'", "'unsafe-inline'"]);
  });

  it('takes extra origins from the environment and drops anything but bare origins', () => {
    const env = {
      NEXT_PUBLIC_LIVEKIT_URL: 'wss://rtc.example.com/livekit/',
      CSP_CONNECT_ORIGINS: "wss://lk.example.org, 'unsafe-inline' javascript:alert(1)",
      CSP_MEDIA_ORIGINS: 'https://cdn.example.net/path',
      NEXT_PUBLIC_AWS_S3_BUCKET: 'other-bucket',
    };
    const { connect, media } = configuredOrigins(env);
    expect(connect).toEqual(['wss://rtc.example.com', 'https://rtc.example.com', 'wss://lk.example.org', 'https://lk.example.org']);
    expect(media).toEqual(['https://other-bucket.s3.ap-south-1.amazonaws.com', 'https://other-bucket.s3.amazonaws.com', 'https://cdn.example.net']);
    expect(originList("'self' data: *")).toEqual([]);
  });

  it('makes a fresh, unguessable nonce each time', () => {
    const a = createNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(createNonce()).not.toBe(a);
  });
});

describe('middleware CSP', () => {
  const call = (path, cookie = '') => middleware(new NextRequest(`http://localhost:3000${path}`, { headers: cookie ? { cookie } : {} }));

  it('sends a per-request nonce policy on pages and hands the nonce to the renderer', async () => {
    const one = await call('/auth/login');
    const two = await call('/auth/login');
    const csp = one.headers.get('content-security-policy');
    const nonce = csp.match(/'nonce-([^']+)'/)[1];
    expect(two.headers.get('content-security-policy')).not.toContain(nonce);
    // NextResponse.next({ request: { headers } }) forwards overridden request headers this way.
    expect(one.headers.get('x-middleware-request-x-nonce')).toBe(nonce);
    expect(one.headers.get('x-middleware-request-content-security-policy')).toBe(csp);
  });

  it('also covers signed-in portal pages', async () => {
    const res = await call('/student/home', 'pk_session=1; pk_role=student');
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('content-security-policy')).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  });
});

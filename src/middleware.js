import { NextResponse } from 'next/server';
import { buildCsp, createNonce, cspEnv } from '@/lib/security/csp';

const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/activate', // invite e-mail link: first password (signed out)
];

/** Legacy portal login URLs — always redirect to the unified login. */
const LEGACY_LOGIN_PATHS = [
  '/admin/login',
  '/superadmin/login',
  '/faculty/login',
  '/student/login',
];

/** host[:port] only: a forwarded value must not be able to change the path of a redirect. */
const HOST_RE = /^[a-z0-9.-]+(:\d{1,5})?$/i;

function firstHeaderValue(req, name) {
  return (req.headers.get(name) || '').split(',')[0].trim();
}

/**
 * Absolute redirect target on the host the user is on. req.url carries the server's own
 * host (localhost:<port>), which is wrong behind a proxy.
 */
function publicUrl(req, path) {
  const dest = new URL(path, req.url);
  const host = firstHeaderValue(req, 'x-forwarded-host') || firstHeaderValue(req, 'host');
  const safeHost = HOST_RE.test(host) ? host : firstHeaderValue(req, 'host');
  if (HOST_RE.test(safeHost)) {
    dest.port = '';
    dest.host = safeHost;
  }
  const proto = firstHeaderValue(req, 'x-forwarded-proto');
  if (proto === 'http' || proto === 'https') dest.protocol = `${proto}:`;
  return dest;
}

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Lets the request through with this request's CSP (SECB-009). Next reads the nonce from the
 * Content-Security-Policy request header and stamps it on its own scripts; the layout reads x-nonce.
 */
function pass(req, tenant) {
  const nonce = createNonce();
  const host = firstHeaderValue(req, 'x-forwarded-host') || firstHeaderValue(req, 'host');
  const csp = buildCsp({ nonce, host, dev: process.env.NODE_ENV === 'development', env: cspEnv() });
  const headers = new Headers(req.headers);
  headers.set('x-nonce', nonce);
  headers.set('content-security-policy', csp);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set('Content-Security-Policy', csp);
  if (tenant) res.headers.set('x-tenant-id', tenant);
  return res;
}

function homeForRole(role) {
  if (role === 'superadmin') return '/superadmin/dashboard';
  if (role === 'college_admin') return '/admin/dashboard';
  if (role === 'faculty' || role === 'hod') return '/faculty/dashboard';
  if (role === 'student') return '/student/home';
  return '/auth/login';
}

/** Single login URL for every portal role. */
function loginForRole() {
  return '/auth/login';
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  if (LEGACY_LOGIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const dest = publicUrl(req, '/auth/login');
    dest.search = req.nextUrl.search;
    return NextResponse.redirect(dest);
  }

  if (isPublicPath(pathname)) return pass(req);

  const session = req.cookies.get('pk_session')?.value;
  const role = req.cookies.get('pk_role')?.value;
  const tenant = req.cookies.get('pk_tenant')?.value;

  // Legacy B2C paths
  if (pathname.startsWith('/main') || pathname.startsWith('/pricing')) {
    if (session && role) {
      return NextResponse.redirect(publicUrl(req, homeForRole(role)));
    }
    return NextResponse.redirect(publicUrl(req, '/auth/login'));
  }

  if (pathname === '/') {
    if (session && role) {
      return NextResponse.redirect(publicUrl(req, homeForRole(role)));
    }
    return NextResponse.redirect(publicUrl(req, '/auth/login'));
  }

  const portalGuards = [
    { prefix: '/admin', role: 'college_admin' },
    { prefix: '/superadmin', role: 'superadmin' },
    { prefix: '/faculty', roles: ['faculty', 'hod'] },
    { prefix: '/student', role: 'student' },
    // Watch-only video tab (VideoPreviewModal "Open in a new tab"); the API checks who may watch.
    { prefix: '/watch/', roles: ['superadmin', 'college_admin', 'hod', 'faculty', 'student'] },
  ];

  for (const guard of portalGuards) {
    if (!pathname.startsWith(guard.prefix)) continue;
    const allowed = guard.roles
      ? guard.roles.includes(role)
      : role === guard.role;
    if (!session || !allowed) {
      if (session && role) {
        return NextResponse.redirect(publicUrl(req, homeForRole(role)));
      }
      return NextResponse.redirect(publicUrl(req, loginForRole()));
    }
    return pass(req, tenant);
  }

  if (session && role) {
    return NextResponse.redirect(publicUrl(req, homeForRole(role)));
  }
  return NextResponse.redirect(publicUrl(req, '/auth/login'));
}

export const config = {
  // Skip Next auth redirects for FastAPI mounts proxied on :3000 and static assets.
  matcher: ['/((?!_next|favicon\\.ico|api|edu_video|voice_qna|.*\\.png|.*\\.jpg|.*\\.svg).*)'],
};

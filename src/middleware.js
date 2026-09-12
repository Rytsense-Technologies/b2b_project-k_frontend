import { NextResponse } from 'next/server';

const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password',
];

/** Legacy portal login URLs — always redirect to the unified login. */
const LEGACY_LOGIN_PATHS = [
  '/admin/login',
  '/superadmin/login',
  '/faculty/login',
  '/student/login',
];

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function withTenantHeader(req, tenant) {
  const res = NextResponse.next();
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
    const dest = new URL('/auth/login', req.url);
    dest.search = req.nextUrl.search;
    return NextResponse.redirect(dest);
  }

  if (isPublicPath(pathname)) return NextResponse.next();

  const session = req.cookies.get('pk_session')?.value;
  const role = req.cookies.get('pk_role')?.value;
  const tenant = req.cookies.get('pk_tenant')?.value;

  // Legacy B2C paths
  if (pathname.startsWith('/main') || pathname.startsWith('/pricing')) {
    if (session && role) {
      return NextResponse.redirect(new URL(homeForRole(role), req.url));
    }
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  if (pathname === '/') {
    if (session && role) {
      return NextResponse.redirect(new URL(homeForRole(role), req.url));
    }
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  const portalGuards = [
    { prefix: '/admin', role: 'college_admin' },
    { prefix: '/superadmin', role: 'superadmin' },
    { prefix: '/faculty', roles: ['faculty', 'hod'] },
    { prefix: '/student', role: 'student' },
  ];

  for (const guard of portalGuards) {
    if (!pathname.startsWith(guard.prefix)) continue;
    const allowed = guard.roles
      ? guard.roles.includes(role)
      : role === guard.role;
    if (!session || !allowed) {
      if (session && role) {
        return NextResponse.redirect(new URL(homeForRole(role), req.url));
      }
      return NextResponse.redirect(new URL(loginForRole(), req.url));
    }
    return withTenantHeader(req, tenant);
  }

  if (session && role) {
    return NextResponse.redirect(new URL(homeForRole(role), req.url));
  }
  return NextResponse.redirect(new URL('/auth/login', req.url));
}

export const config = {
  // Skip Next auth redirects for FastAPI mounts proxied on :3000 and static assets.
  matcher: ['/((?!_next|favicon\\.ico|api|edu_video|.*\\.png|.*\\.jpg|.*\\.svg).*)'],
};

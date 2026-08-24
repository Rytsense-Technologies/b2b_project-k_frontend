import { NextResponse } from 'next/server';

/** This app is Super Admin only — other portals are not implemented here. */
const PUBLIC_PATHS = [
  '/auth/login',
  '/superadmin/login',
];

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  const session = req.cookies.get('pk_session')?.value;
  const role = req.cookies.get('pk_role')?.value;
  const tenant = req.cookies.get('pk_tenant')?.value;

  // Old cookies / other-role logins used to send users to /admin, /main, /faculty
  // which do not exist in this repo → Next.js 404. Always bounce those home.
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/faculty') ||
    pathname.startsWith('/main') ||
    pathname.startsWith('/pricing')
  ) {
    if (session && role === 'superadmin') {
      return NextResponse.redirect(new URL('/superadmin/dashboard', req.url));
    }
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  if (!session || role !== 'superadmin') {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/superadmin/dashboard', req.url));
  }

  if (pathname.startsWith('/superadmin')) {
    const res = NextResponse.next();
    if (tenant) res.headers.set('x-tenant-id', tenant);
    return res;
  }

  return NextResponse.redirect(new URL('/superadmin/dashboard', req.url));
}

export const config = {
  matcher: ['/((?!_next|favicon\\.ico|api|.*\\.png|.*\\.jpg|.*\\.svg).*)'],
};

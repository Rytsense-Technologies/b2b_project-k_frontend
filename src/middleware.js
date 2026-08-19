import { NextResponse } from 'next/server';

const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/register',
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
  const onb = req.cookies.get('pk_onb')?.value;
  const tenant = req.cookies.get('pk_tenant')?.value;

  if (!session) {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  if (pathname.startsWith('/superadmin') && role !== 'superadmin') {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  if (pathname.startsWith('/admin') && role !== 'college_admin') {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  if (pathname.startsWith('/faculty') && role !== 'faculty') {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  if (pathname.startsWith('/main') && role === 'student') {
    if (onb === 'plan') return NextResponse.redirect(new URL('/pricing?onboarding=1', req.url));
    if (onb === 'profile') return NextResponse.redirect(new URL('/main/profile-setup', req.url));
  }

  if (pathname === '/') {
    const homes = {
      superadmin: '/superadmin/dashboard',
      college_admin: '/admin/dashboard',
      faculty: '/faculty/dashboard',
      student: '/main/dashboard',
    };
    const dest = homes[role] || '/auth/login';
    return NextResponse.redirect(new URL(dest, req.url));
  }

  const res = NextResponse.next();
  if (tenant) {
    res.headers.set('x-tenant-id', tenant);
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next|favicon\\.ico|api|.*\\.png|.*\\.jpg|.*\\.svg).*)'],
};

import { NextResponse } from 'next/server';

const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/superadmin/login',
];

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = req.cookies.get('pk_session')?.value;
  const role = req.cookies.get('pk_role')?.value;

  if (pathname.startsWith('/superadmin')) {
    if (!session || role !== 'superadmin') {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
    return NextResponse.next();
  }

  if (pathname === '/') {
    if (session && role === 'superadmin') {
      return NextResponse.redirect(new URL('/superadmin/dashboard', req.url));
    }
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon\\.ico|api|.*\\.png|.*\\.jpg|.*\\.svg).*)'],
};

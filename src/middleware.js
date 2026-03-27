import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Routes publiques — pas de protection
  if (
    pathname.startsWith('/menu') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/offline.html' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Routes dashboard — vérifier la session
  const token =
    request.cookies.get('sb-access-token') ||
    request.cookies.get('sb-klfmifhwklhcpwwxfwlk-auth-token');

  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
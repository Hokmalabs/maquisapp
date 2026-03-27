import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Tout ce qui est public — laisser passer sans vérification
  if (
    pathname.startsWith('/menu') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/api') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/offline.html' ||
    pathname === '/favicon.ico' ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  // Pour le dashboard, chercher n'importe quel cookie Supabase
  const cookieHeader = request.headers.get('cookie') || '';
  const hasSession = cookieHeader.includes('sb-') || 
                     cookieHeader.includes('supabase');

  if (!hasSession) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('auth');
  const path = request.nextUrl.pathname;

  // Protect teacher, student, and admin routes
  if (path.startsWith('/teacher') || path.startsWith('/student') || path.startsWith('/admin')) {
    if (!authCookie || authCookie.value !== 'true') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/teacher/:path*',
    '/student/:path*',
    '/admin/:path*'
  ]
};

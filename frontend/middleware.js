import { NextResponse } from 'next/server';

export function middleware(req) {
  const token = req.cookies.get('orbit_token');
  const { pathname } = req.nextUrl;

  // se já estiver no login, não faz nada
  if (pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  // se não tem token, redireciona
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}


export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
  ],
};

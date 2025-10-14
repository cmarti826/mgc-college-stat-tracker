// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED = [
  '/rounds',
  '/players',
  '/courses',
  '/teams',
  '/events'
];

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;

  const isProtected = PROTECTED.some(p => path === p || path.startsWith(`${p}/`));
  const hasSession = req.cookies.get('sb:token') || req.cookies.get('sb-access-token');

  if (isProtected && !hasSession) {
    const login = new URL('/login', req.url);
    login.searchParams.set('redirect', path);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

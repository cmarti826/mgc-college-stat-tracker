import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Protect these path prefixes
  const protectedPrefixes = ['/admin', '/rounds', '/player'];

  if (protectedPrefixes.some((p) => req.nextUrl.pathname.startsWith(p))) {
    if (!user) {
      const url = req.nextUrl.clone();
      url.pathname = '/(auth)/login';
      url.searchParams.set('redirectTo', req.nextUrl.pathname + req.nextUrl.search);
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/rounds/:path*',
    '/player/:path*',
  ],
};

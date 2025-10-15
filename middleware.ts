// middleware.ts (root)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({
    req,
    res,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  });

  // Refresh session if needed, sets cookies on res
  await supabase.auth.getSession();

  const { data: { user } } = await supabase.auth.getUser();

  // Only guard protected routes
  const isProtected = req.nextUrl.pathname.startsWith("/rounds")
    || req.nextUrl.pathname.startsWith("/players")
    || req.nextUrl.pathname.startsWith("/teams")
    || req.nextUrl.pathname === "/";

  if (isProtected && !user) {
    const login = new URL("/login", req.url);
    login.searchParams.set("redirect", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(login);
  }

  return res;
}

export const config = {
  matcher: [
    "/",           // dashboard
    "/rounds/:path*",
    "/players/:path*",
    "/teams/:path*",
  ],
};

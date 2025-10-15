// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  // We always construct a response so we can set/refresh cookies on it
  const res = NextResponse.next();

  // Create a Supabase client that reads cookies from the request
  // and writes refreshed cookies to the response.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // write to the outgoing response
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Refresh the session if it's expired; this will set cookies on `res`.
  await supabase.auth.getSession();

  // Protect selected routes
  const pathname = req.nextUrl.pathname;
  const isProtected =
    pathname === "/" ||
    pathname.startsWith("/rounds") ||
    pathname.startsWith("/players") ||
    pathname.startsWith("/teams");

  if (isProtected) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const login = new URL("/login", req.url);
      login.searchParams.set("redirect", pathname + req.nextUrl.search);
      return NextResponse.redirect(login);
    }
  }

  return res;
}

export const config = {
  matcher: ["/", "/rounds/:path*", "/players/:path*", "/teams/:path*"],
};

// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          res.cookies.set({ name, value, ...options });
        },
        remove: (name: string) => {
          // ✅ proper delete so the browser actually clears it
          res.cookies.delete(name);
        },
      },
    }
  );

  // Refresh/seed session (sets cookies on `res` if needed)
  await supabase.auth.getSession();

  const path = req.nextUrl.pathname;
  const isProtected =
    path === "/" ||
    path.startsWith("/rounds") ||
    path.startsWith("/players") ||
    path.startsWith("/teams");

  if (isProtected) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const login = new URL("/login", req.url);
      login.searchParams.set("redirect", path + req.nextUrl.search);
      return NextResponse.redirect(login);
    }
  }

  return res;
}

export const config = {
  matcher: ["/", "/rounds/:path*", "/players/:path*", "/teams/:path*"],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED = ["/rounds", "/players", "/courses", "/events"]; // add more as needed

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtected = PROTECTED.some(p => path === p || path.startsWith(`${p}/`));

  if (!isProtected) return NextResponse.next();

  // Supabase cookies that may be present
  const hasAccess =
    req.cookies.get("sb-access-token")?.value ||
    req.cookies.get("sb:token")?.value || // sometimes used
    req.cookies.get("supabase-auth-token")?.value; // older

  if (!hasAccess) {
    const login = new URL("/login", req.url);
    login.searchParams.set("redirect", path);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|public).*)"],
};

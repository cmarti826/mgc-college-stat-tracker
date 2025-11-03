// app/middleware.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

type Role = "admin" | "coach" | "player" | null;

const ROUTE_ROLES: Record<string, Role[]> = {
  "/admin": ["admin"],
  "/rounds": ["admin", "coach", "player"],
  "/player": ["player"],
};

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = req.nextUrl.pathname;

  // === Public assets ===
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon.ico")) {
    return res;
  }

  // === Find protected route ===
  const protectedPrefix = Object.keys(ROUTE_ROLES).find((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!protectedPrefix) return res;

  // === No user → login ===
  if (!user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirectTo", pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // === Fetch role ===
  let role: Role = null;

  try {
    // Option 1: Use RPC (recommended)
    const { data, error } = await supabase
      .rpc("get_user_role", { user_id: user.id })
      .single();

    if (!error && data) {
      role = (data as { role: Role }).role;
    }
  } catch {
    // Option 2: Fallback query
    const { data: link } = await supabase
      .from("user_players")
      .select("player_id")
      .eq("user_id", user.id)
      .single();

    if (link?.player_id) {
      const { data: membership } = await supabase
        .from("team_members")
        .select("role")
        .eq("player_id", link.player_id)
        .single();

      role = (membership?.role as Role) ?? "player";
    }
  }

  // === Role check ===
  const required = ROUTE_ROLES[protectedPrefix];
  if (!role || !required.includes(role)) {
    const unauthorizedUrl = new URL("/unauthorized", req.url);
    unauthorizedUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(unauthorizedUrl);
  }

  return res;
}

export const config = {
  matcher: "/((?!api|_next/static|_next/image|favicon.ico).*)",
};
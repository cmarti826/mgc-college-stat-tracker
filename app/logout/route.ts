// app/logout/route.ts
import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server-route";

export async function POST(req: Request) {
  const supabase = createRouteClient();
  await supabase.auth.signOut();

  const url = new URL(req.url);
  const login = new URL("/login", url.origin);

  const res = NextResponse.redirect(login, { status: 302 });
  // Avoid showing cached authed pages after logout
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

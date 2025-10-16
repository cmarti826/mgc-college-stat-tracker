import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createClient();

  // This clears sb-access-token / sb-refresh-token via Set-Cookie on the response
  await supabase.auth.signOut();

  const url = new URL(req.url);
  const login = new URL("/login", url.origin);

  const res = NextResponse.redirect(login, { status: 302 });
  // Helpful to avoid showing cached authed pages after logout
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

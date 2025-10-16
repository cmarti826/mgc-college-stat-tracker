// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server-route";

export async function GET(req: Request) {
  const supabase = createRouteClient();
  const url = new URL(req.url);
  const redirectTo = url.searchParams.get("redirect") || "/rounds";

  // Sets auth cookies for the current domain
  await supabase.auth.exchangeCodeForSession(req.url);

  return NextResponse.redirect(new URL(redirectTo, url.origin));
}

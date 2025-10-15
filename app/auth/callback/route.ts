// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = createClient();
  const url = new URL(req.url);
  const redirectTo = url.searchParams.get("redirect") || "/rounds";

  try {
    // ✅ MUST pass the full request URL string
    await supabase.auth.exchangeCodeForSession(req.url);
    return NextResponse.redirect(new URL(redirectTo, url.origin));
  } catch (err: any) {
    const login = new URL("/login", url.origin);
    login.searchParams.set("error", err?.message ?? "auth_failed");
    login.searchParams.set("redirect", redirectTo);
    return NextResponse.redirect(login);
  }
}

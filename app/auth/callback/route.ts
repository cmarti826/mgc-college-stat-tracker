// app/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = createClient();

  // ✅ pass the string URL (req.url), not new URL(...)
  await supabase.auth.exchangeCodeForSession(req.url);

  const url = new URL(req.url);
  const redirectTo = url.searchParams.get('redirect') || '/rounds';
  return NextResponse.redirect(new URL(redirectTo, url.origin));
}

// app/logout/route.ts
import { NextResponse } from 'next/server';
import { createBrowserSupabase } from '@/lib/supabase';

export async function POST() {
  const supabase = await createBrowserSupabase();
  await supabase.auth.signOut();

  // Redirect back to login
  return NextResponse.redirect(
    new URL('/login', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000')
  );
}

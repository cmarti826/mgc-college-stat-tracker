// app/logout/route.ts

import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST() {
  const supabase = createServerSupabase(); // ← Server-side client

  // Sign out user
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Logout error:', error);
  }

  // Redirect to login
  const url = new URL('/(auth)/login', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');
  return NextResponse.redirect(url);
}
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createBrowserSupabase();
    // This will exchange the code for a session and set cookies
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect wherever you want a new session to land
  return NextResponse.redirect(new URL('/', request.url));
}

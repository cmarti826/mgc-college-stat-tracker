// app/(auth)/callback/route.ts
import { NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase/route'; // DIRECT IMPORT

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = createRouteSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL('/', request.url));
}
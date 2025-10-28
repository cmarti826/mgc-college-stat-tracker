// app/api/admin/send-password-reset/route.ts
import { NextResponse } from 'next/server';
import { createClient as createClient } from '@/lib/supabase';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });

    // Confirm requester is an admin
    const supabase = await createBrowserSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: isAdmin } = await supabase.rpc('is_admin', { u: user.id });
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Use service role to trigger reset email
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo:
          process.env.NEXT_PUBLIC_SITE_URL
            ? `${process.env.NEXT_PUBLIC_SITE_URL}/login`
            : 'http://localhost:3000/login',
      },
    });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Password reset error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

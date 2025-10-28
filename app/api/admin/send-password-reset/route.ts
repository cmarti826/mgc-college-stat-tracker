// app/api/admin/send-password-reset/route.ts
import { NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase/route';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body ?? {};

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    // Confirm requester is an admin
    const supabase = createRouteSupabase(); // No await needed
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin via RPC
    const { data: isAdmin, error: adminErr } = await supabase.rpc('is_admin', { uid: user.id });
    if (adminErr || !isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Use service role to send password reset
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createAdminClient(supabaseUrl, serviceKey);

    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
      },
    });

    if (error) {
      return NextResponse.json({ error: `Failed to send reset: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, action_link: data?.properties?.action_link });
  } catch (err: any) {
    console.error('send-password-reset error:', err);
    return NextResponse.json({ error: err?.message ?? 'Server error' }, { status: 500 });
  }
}
// app/api/admin/create-player/route.ts
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic'; // ensure Node runtime, not Edge

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, grad_year, team_id, email, password } = body ?? {};

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // ---------- guard: env vars ----------
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        {
          error:
            'Server misconfiguration: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.',
        },
        { status: 500 }
      );
    }

    // ---------- 1) verify requester is admin ----------
    const supabase = await createServerClient();
    const {
      data: { user },
      error: getUserErr,
    } = await supabase.auth.getUser();
    if (getUserErr) {
      return NextResponse.json({ error: `Auth error: ${getUserErr.message}` }, { status: 401 });
    }
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // If your RPC doesn't exist yet or returns null/false, this will stop here.
    const { data: isAdmin, error: adminErr } = await supabase.rpc('is_admin', { u: user.id });
    if (adminErr) {
      return NextResponse.json(
        { error: `RPC is_admin error: ${adminErr.message}` },
        { status: 500 }
      );
    }
    if (!isAdmin) {
      return NextResponse.json({ error: 'Not an admin' }, { status: 403 });
    }

    // ---------- 2) create auth user with SERVICE ROLE ----------
    const admin = createAdminClient(supabaseUrl, serviceKey);

    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr) {
      // If this says "Forbidden", your key is not the service_role key.
      return NextResponse.json(
        { error: `admin.createUser failed: ${createErr.message}` },
        { status: 500 }
      );
    }
    if (!newUser?.user) {
      return NextResponse.json({ error: 'User not created' }, { status: 500 });
    }

    // ---------- 3) create player row ----------
    const { data: player, error: playerErr } = await supabase
      .from('players')
      .insert({ full_name: name, grad_year, email })
      .select('id')
      .single();
    if (playerErr) {
      return NextResponse.json({ error: `Create player failed: ${playerErr.message}` }, { status: 500 });
    }

    // ---------- 4) link user -> player ----------
    const { error: linkErr } = await supabase
      .from('user_players')
      .upsert({ user_id: newUser.user.id, player_id: player.id });
    if (linkErr) {
      return NextResponse.json({ error: `Link user->player failed: ${linkErr.message}` }, { status: 500 });
    }

    // ---------- 5) optional roster row ----------
    if (team_id) {
      const { error: rosterErr } = await supabase
        .from('team_members')
        .insert({ team_id, player_id: player.id });
      if (rosterErr) {
        return NextResponse.json({ error: `Add to roster failed: ${rosterErr.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, player_id: player.id });
  } catch (err: any) {
    console.error('create-player error:', err);
    return NextResponse.json({ error: err?.message ?? 'Server error' }, { status: 500 });
  }
}

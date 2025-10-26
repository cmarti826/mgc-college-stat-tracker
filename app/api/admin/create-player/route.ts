// app/api/admin/create-player/route.ts
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, grad_year, team_id, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // 1. Verify requester is an admin
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: isAdmin } = await supabase.rpc('is_admin', { u: user.id });
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // 2. Use service role client to create user
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr) throw createErr;
    if (!newUser.user) throw new Error('User not created');

    // 3. Create player row
    const { data: player, error: playerErr } = await supabase
      .from('players')
      .insert({ full_name: name, grad_year, team_id })
      .select('id')
      .single();
    if (playerErr) throw playerErr;

    // 4. Link user → player
    const { error: linkErr } = await supabase
      .from('user_players')
      .upsert({ user_id: newUser.user.id, player_id: player.id });
    if (linkErr) throw linkErr;

    return NextResponse.json({ success: true, player_id: player.id });
  } catch (err: any) {
    console.error('create-player error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

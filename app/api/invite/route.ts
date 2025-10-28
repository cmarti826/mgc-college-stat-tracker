// app/api/invite/route.ts
import { NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase/route';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, team_id, role = 'player' } = body;

    if (!email || !team_id) {
      return NextResponse.json({ error: 'email and team_id required' }, { status: 400 });
    }

    // 1. Verify caller session
    const authz = req.headers.get('authorization') || '';
    const token = authz.startsWith('Bearer ') ? authz.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createRouteSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const meId = user.id;

    // 2. Check caller is coach/admin of team
    const { data: member, error: memberErr } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', team_id)
      .eq('user_id', meId)
      .single();

    if (memberErr || !member) {
      return NextResponse.json({ error: 'Not team member' }, { status: 403 });
    }

    const isCoachOrAdmin = ['coach', 'admin'].includes(member.role);
    if (!isCoachOrAdmin) {
      return NextResponse.json({ error: 'Coach/admin required' }, { status: 403 });
    }

    // 3. Invite or generate magic link
    let userId: string | null = null;
    let actionLink: string | null = null;
    let info = 'invited';
    let teamAdded = false;
    let warn: string | null = null;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createAdminClient(supabaseUrl, serviceKey);

    // Check if user exists
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const found = existingUsers.users.find(u => u.email === email);

    if (found) {
      userId = found.id;
      info = 'existing_user_magic_link';

      // Generate magic link for existing user
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        },
      });

      if (linkError) {
        return NextResponse.json({ error: linkError.message }, { status: linkError.status || 500 });
      }

      actionLink = linkData?.properties?.action_link || null;
    } else {
      // Invite new user (no password)
      const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      });

      if (inviteError) {
        return NextResponse.json({ error: inviteError.message }, { status: inviteError.status || 500 });
      }

      userId = inviteData.user.id;
      actionLink = inviteData.user.action_link || null;
    }

    // 4. Add to team (if not already)
    if (userId) {
      const { error: addErr } = await supabase
        .from('team_members')
        .upsert(
          { team_id, user_id: userId, role },
          { onConflict: 'team_id,user_id' }
        );

      if (addErr) {
        warn = `Team add failed: ${addErr.message}`;
      } else {
        teamAdded = true;
      }
    }

    // 5. Success
    return NextResponse.json({
      ok: true,
      status: info,
      userId,
      action_link: actionLink,
      teamAdded,
      warn,
    });

  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createClient } from '@supabase/supabase-js'

type Body = { email: string; teamId: string; role?: 'player'|'coach'|'admin' }

export async function POST(req: Request) {
  try {
    const { email, teamId, role = 'player' } = (await req.json()) as Body
    if (!email || !teamId) return NextResponse.json({ error: 'email and teamId required' }, { status: 400 })

    // Authenticate the caller (coach/admin) using their access token
    const authz = req.headers.get('authorization') || ''
    const token = authz.startsWith('Bearer ') ? authz.slice(7) : null
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify user & role
    const supabaseAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: me } = await supabaseAnon.auth.getUser()
    const meId = me?.user?.id
    if (!meId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: prof, error: profErr } = await supabaseAnon
      .from('profiles')
      .select('role')
      .eq('id', meId)
      .single()
    if (profErr || !prof || !['coach','admin'].includes(prof.role)) {
      return NextResponse.json({ error: 'Coach/admin required' }, { status: 403 })
    }

    // Try to send an official Supabase "invite" (creates user if not exists)
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://mgcstats.vercel.app'}/auth/callback`
    const inviteRes = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo })

    let userId: string | undefined = inviteRes.data?.user?.id
    let info = 'invited'

    // If user already exists, generate a magic link instead
    if (inviteRes.error && inviteRes.error.status === 422) {
      const linkRes = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo },
      })
      if (linkRes.error) {
        return NextResponse.json({ error: linkRes.error.message }, { status: linkRes.error.status || 500 })
      }
      userId = linkRes.data?.user?.id
      info = 'existing_user_magic_link'
    } else if (inviteRes.error) {
      // Any other admin error
      return NextResponse.json({ error: inviteRes.error.message }, { status: inviteRes.error.status || 500 })
    }

    // Add the user to the team by email (works once user exists/invited)
    const rpc = await supabaseAdmin.rpc('add_team_member_by_email', {
      p_team: teamId,
      p_email: email,
      p_role: role,
    })
    if (rpc.error) {
      // Not fatal to the invite; return both states
      return NextResponse.json({
        ok: true,
        status: info,
        userId,
        warn: `Invite sent, but team add failed: ${rpc.error.message}`,
      })
    }

    return NextResponse.json({ ok: true, status: info, userId })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}

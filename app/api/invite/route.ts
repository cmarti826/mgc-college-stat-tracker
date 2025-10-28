// /app/api/invite/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server';
const supabase = createClient();

// Force Node runtime (admin client requires it)
export const runtime = 'nodejs'

type Role = 'player' | 'coach' | 'admin'
type Body = { email: string; teamId: string; role?: Role }

export async function POST(req: Request) {
  try {
    const { email, teamId, role = 'player' } = (await req.json()) as Body
    if (!email || !teamId) {
      return NextResponse.json({ error: 'email and teamId required' }, { status: 400 })
    }

    // Verify caller session (Bearer access token from the browser)
    const authz = req.headers.get('authorization') || ''
    const token = authz.startsWith('Bearer ') ? authz.slice(7) : null
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    const { data: meData, error: meErr } = await anon.auth.getUser()
    if (meErr || !meData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const meId = meData.user.id

    // Require coach/admin: profiles.role OR team_members.role for this team
    let isCoachOrAdmin = false
    const { data: prof } = await anon.from('profiles').select('role').eq('id', meId).maybeSingle()
    if (prof && (prof as any).role && ['coach', 'admin'].includes((prof as any).role)) {
      isCoachOrAdmin = true
    }
    if (!isCoachOrAdmin) {
      const { data: tm } = await anon
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', meId)
        .maybeSingle()
      if (tm && (tm as any).role && ['coach', 'admin'].includes((tm as any).role)) {
        isCoachOrAdmin = true
      }
    }
    if (!isCoachOrAdmin) {
      return NextResponse.json({ error: 'Coach/admin required' }, { status: 403 })
    }

    // Invite or generate magic link
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://mgcstats.vercel.app'}/auth/callback`
    const { data: inviteData, error: inviteError } = await createClient.auth.admin.inviteUserByEmail(email, { redirectTo })

    let userId: string | undefined = inviteData?.user?.id
    let info: 'invited' | 'existing_user_magic_link' = 'invited'
    let actionLink: string | undefined

    if (inviteError) {
      if (inviteError.status === 422) {
        // Existing user → generate a magic link instead
        const { data: linkData, error: linkError } = await createClient.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: { redirectTo },
        })
        if (linkError) {
          return NextResponse.json({ error: linkError.message }, { status: linkError.status || 500 })
        }
        userId = linkData?.user?.id
        // Supabase types differ by version; try both shapes
        actionLink =
          // @ts-ignore
          (linkData as any)?.properties?.action_link ||
          // @ts-ignore
          (linkData as any)?.action_link ||
          undefined
        info = 'existing_user_magic_link'
      } else {
        return NextResponse.json({ error: inviteError.message }, { status: inviteError.status || 500 })
      }
    }

    // Add to team via RPC (preferred), with safe narrowing and fallback
    let teamAdded = false
    let warn: string | undefined

    try {
      const { error: rpcError } = await createClient.rpc('add_team_member_by_email', {
        p_team: teamId,
        p_email: email,
        p_role: role,
      })

      if (rpcError) {
        warn = `Invite ok but team add via RPC failed: ${rpcError.message}`
        // Fallback: if we know the userId, upsert team_members directly
        if (userId) {
          const { error: insErr } = await createClient
            .from('team_members')
            .upsert({ team_id: teamId, user_id: userId, role })
          if (insErr) {
            warn += `; fallback insert failed: ${insErr.message}`
          } else {
            teamAdded = true
          }
        }
      } else {
        teamAdded = true
      }
    } catch (e: any) {
      warn = `Team add exception: ${e?.message || String(e)}`
    }

    return NextResponse.json({ ok: true, status: info, userId, action_link: actionLink, teamAdded, warn })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}

// app/rounds/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'

type Scope = 'me' | 'team' | 'all'

type EnrichedRound = {
  id: string
  created_at: string | null
  course_id: string | null
  tee_set_id: string | null
  player_id: string | null
  player_name: string | null
  team_id: string | null
  team_name: string | null
  course_name: string | null
}

type RoundTotals = {
  round_id: string
  strokes: number
  putts: number
  fairways_hit: number
  greens_in_reg: number
  penalties: number
}

export default function RoundsPage() {
  const supabase = useMemo(() => supabaseBrowser(), [])
  const [loading, setLoading] = useState(true)
  const [scope, setScope] = useState<Scope>('me')
  const [userId, setUserId] = useState<string | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [rounds, setRounds] = useState<EnrichedRound[]>([])
  const [totalsByRound, setTotalsByRound] = useState<Record<string, RoundTotals>>({})

  useEffect(() => {
    (async () => {
      setLoading(true)
      // who is logged in?
      const { data: { user } } = await supabase.auth.getUser()
      const uid = user?.id ?? null
      setUserId(uid)

      // resolve current player from mapping
      let pid: string | null = null
      if (uid) {
        const { data: mapping } = await supabase
          .from('user_players')
          .select('player_id')
          .eq('user_id', uid)
          .maybeSingle()
        pid = mapping?.player_id ?? null
      }
      setPlayerId(pid)

      // teams this player belongs to
      let tids: string[] = []
      if (pid) {
        const { data: memberships } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('player_id', pid)
        tids = (memberships ?? []).map((m: any) => m.team_id)
      }
      setTeamIds(tids)

      // fetch enriched rounds with scope
      let query = supabase
        .from('v_rounds_enriched')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (scope === 'me' && pid) query = query.eq('player_id', pid)
      if (scope === 'team' && tids.length) query = query.in('team_id', tids)

      const { data: enriched } = await query
      const list = (enriched ?? []) as EnrichedRound[]
      setRounds(list)

      // fetch totals for those rounds
      const roundIds = list.map((r) => r.id)
      if (roundIds.length) {
        const { data: totals } = await supabase
          .from('v_round_totals_basic')
          .select('*')
          .in('round_id', roundIds)

        const map: Record<string, RoundTotals> = {}
        for (const t of (totals ?? []) as RoundTotals[]) map[t.round_id] = t
        setTotalsByRound(map)
      } else {
        setTotalsByRound({})
      }

      setLoading(false)
    })()
  }, [supabase, scope])

  const scopeBtn = (key: Scope, label: string) => (
    <button
      key={key}
      onClick={() => setScope(key)}
      className={[
        'px-3 py-1.5 rounded-full text-sm border transition-colors',
        scope === key
          ? 'bg-[#3C3B6E] text-white border-[#3C3B6E]'
          : 'bg-white hover:bg-gray-50 text-[#3C3B6E] border-gray-300',
      ].join(' ')}
      aria-pressed={scope === key}
    >
      {label}
    </button>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1>Rounds</h1>
        <div className="flex gap-2">
          {scopeBtn('me', 'My Rounds')}
          {scopeBtn('team', 'Team')}
          {scopeBtn('all', 'All')}
        </div>
      </div>

      {/* Helper if the user isn't linked to a player yet */}
      {userId && !playerId && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Link your account to a player</div>
          </div>
          <p className="text-sm text-gray-600">
            Your login isn’t linked to a player yet. Ask a coach/admin to add a row in
            <code className="mx-1 px-1 rounded bg-gray-100">user_players</code> for your user.
          </p>
        </div>
      )}

      {loading ? (
        <div className="card">Loading…</div>
      ) : rounds.length === 0 ? (
        <div className="card">No rounds yet.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rounds.map((r) => {
            const t = totalsByRound[r.id]
            return (
              <div key={r.id} className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">
                      {r.course_name ?? 'Course'} {r.team_name ? `— ${r.team_name}` : ''}
                    </div>
                    <div className="card-subtle">
                      {r.player_name ?? 'Player'} • {new Date(r.created_at ?? '').toLocaleString()}
                    </div>
                  </div>
                  <Link href={`/rounds/${r.id}`} className="btn-on-light-outline">
                    Open
                  </Link>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Strokes</div>
                    <div className="stat-number">{t?.strokes ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Putts</div>
                    <div className="stat-number">{t?.putts ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Penalties</div>
                    <div className="stat-number">{t?.penalties ?? '—'}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-600">
                  FIR: {t?.fairways_hit ?? '—'} • GIR: {t?.greens_in_reg ?? '—'}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

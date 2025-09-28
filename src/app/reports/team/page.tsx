'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Team = { id: string; name: string }
type RosterRow = { player_id: string }
type Player = { id: string; display_name: string }
type Round = { id: string; player_id: string | null; start_time: string | null; status: string }
type VTotal = { round_id: string; to_par: number | null; strokes: number | null }

export default function TeamReportsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [teamId, setTeamId] = useState<string>('')

  // data
  const [roster, setRoster] = useState<RosterRow[]>([])
  const [players, setPlayers] = useState<Record<string, Player>>({})
  const [rounds, setRounds] = useState<Round[]>([])
  const [totals, setTotals] = useState<Record<string, VTotal>>({}) // by round_id

  const [err, setErr] = useState<string | null>(null)

  // load teams the user can see
  const loadTeams = async () => {
    setErr(null)
    const { data, error } = await supabase.from('teams').select('id,name').order('name')
    if (error) { setErr(error.message); return }
    const list = (data ?? []) as Team[]
    setTeams(list)
    setTeamId(prev => (list.some(t => t.id === prev) ? prev : (list[0]?.id ?? '')))
  }

  const loadAllForTeam = async (tid: string) => {
    if (!tid) { setRoster([]); setPlayers({}); setRounds([]); setTotals({}); return }
    setErr(null)

    // roster
    const { data: r, error: er } = await supabase
      .from('team_roster')
      .select('player_id')
      .eq('team_id', tid)
    if (er) { setErr(er.message); return }
    const rosterRows = (r ?? []) as RosterRow[]
    setRoster(rosterRows)

    const ids = rosterRows.map(x => x.player_id)
    if (ids.length) {
      const { data: p } = await supabase
        .from('players')
        .select('id,display_name')
        .in('id', ids)
      const map: Record<string, Player> = {}
      for (const row of (p ?? []) as Player[]) map[row.id] = row
      setPlayers(map)
    } else {
      setPlayers({})
    }

    // recent rounds (last 30 days) for the team
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
    const { data: rd } = await supabase
      .from('rounds')
      .select('id,player_id,start_time,status')
      .eq('team_id', tid)
      .gte('start_time', since)
      .order('start_time', { ascending: false })
      .limit(50)
    const roundRows = (rd ?? []) as Round[]
    setRounds(roundRows)

    // pull totals if the view exists (ignore errors silently)
    if (roundRows.length) {
      const roundIds = roundRows.map(r => r.id)
      const { data: vt } = await supabase
        .from('v_round_totals')
        .select('round_id,strokes,to_par')
        .in('round_id', roundIds as any)
      const map: Record<string, VTotal> = {}
      for (const row of (vt ?? []) as VTotal[]) map[row.round_id] = row
      setTotals(map)
    } else {
      setTotals({})
    }
  }

  useEffect(() => { loadTeams() }, [])
  useEffect(() => { loadAllForTeam(teamId) }, [teamId])

  // derived
  const teamName = useMemo(() => teams.find(t => t.id === teamId)?.name ?? '—', [teams, teamId])
  const rosterSize = roster.length
  const recentRoundCount = rounds.length
  const avgToPar = useMemo(() => {
    const vals = rounds.map(r => totals[r.id]?.to_par).filter(v => typeof v === 'number') as number[]
    if (!vals.length) return null
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    return Math.round(avg * 10) / 10
  }, [rounds, totals])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Team Reports</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Team:</span>
          <select
            className="rounded border px-2 py-1"
            value={teamId}
            onChange={e => setTeamId(e.target.value)}
          >
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            {!teams.length && <option value="">No teams</option>}
          </select>
        </div>
      </div>

      {err && <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{err}</div>}

      {/* KPI tiles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile title="Roster Size" value={String(rosterSize)} />
        <Tile title="Rounds (30d)" value={String(recentRoundCount)} />
        <Tile title="Avg To-Par (30d)" value={avgToPar == null ? '—' : (avgToPar > 0 ? `+${avgToPar}` : String(avgToPar))} />
        <Tile title="Team" value={teamName} />
      </div>

      {/* Recent rounds table */}
      <div className="rounded border bg-white">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="font-semibold">Recent Rounds (30 days)</div>
          <Link className="text-sm underline" href="/events">Events</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">When</th>
                <th className="px-3 py-2 text-left">Player</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Strokes</th>
                <th className="px-3 py-2 text-right">To-Par</th>
                <th className="px-3 py-2 text-right">Open</th>
              </tr>
            </thead>
            <tbody>
              {rounds.length ? rounds.map(r => {
                const p = r.player_id ? players[r.player_id] : null
                const vt = totals[r.id]
                return (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">{r.start_time?.slice(0, 19).replace('T', ' ') ?? '—'}</td>
                    <td className="px-3 py-2">{p?.display_name ?? '—'}</td>
                    <td className="px-3 py-2">{r.status}</td>
                    <td className="px-3 py-2 text-right">{vt?.strokes ?? '—'}</td>
                    <td className="px-3 py-2 text-right">
                      {vt?.to_par == null ? '—' : (vt.to_par > 0 ? `+${vt.to_par}` : vt.to_par)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link href={`/rounds/${r.id}`} className="underline text-[#0033A0]">Open</Link>
                    </td>
                  </tr>
                )
              }) : (
                <tr><td className="px-3 py-4 text-gray-600" colSpan={6}>No recent rounds.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Roster list */}
      <div className="rounded border bg-white">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="font-semibold">Roster</div>
          <Link className="text-sm underline" href="/admin/roster">Manage Roster</Link>
        </div>
        <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
          {roster.length ? roster.map(r => {
            const p = players[r.player_id]
            return (
              <div key={r.player_id} className="rounded border p-2">
                <div className="font-medium">{p?.display_name ?? r.player_id}</div>
                <div className="text-sm text-gray-600">
                  <Link className="underline" href={`/players/${r.player_id}`}>Player Report</Link>
                </div>
              </div>
            )
          }) : (
            <div className="text-sm text-gray-600">No players on this team.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function Tile({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded border bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{title}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  )
}

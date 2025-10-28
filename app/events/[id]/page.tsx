// app/events/[id]/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();

type EventHeader = {
  id: string
  name: string
  event_type: 'TOURNAMENT'|'QUALIFYING'|'PRACTICE'|null
  start_date: string|null
  end_date: string|null
  course_name: string|null
  team_name: string|null
}

type PlayerRound = {
  event_id: string
  round_id: string
  round_number: number | null
  day: string | null
  player_id: string | null
  player_name: string | null
  team_id: string | null
  team_name: string | null
  created_at: string | null
  to_par: number | null
  sg_total: number | null
  sg_ott: number | null
  sg_app: number | null
  sg_arg: number | null
  sg_putt: number | null
  round_index: number | null
}

type LbRow = {
  event_id: string
  player_id: string
  player_name: string
  team_id: string | null
  team_name: string | null
  rounds: number
  total_to_par: number
  avg_to_par: number
  avg_sg_total: number | null
  avg_sg_ott: number | null
  avg_sg_app: number | null
  avg_sg_arg: number | null
  avg_sg_putt: number | null
  best_round_to_par: number | null
  last_played: string | null
  position: number
}

type ERoundBase = {
  round_id: string
  created_at: string | null
  player_id: string | null
  player_name: string | null
  team_name: string | null
  to_par: number | null
  sg_total: number | null
}

type ViewMode = 'individuals' | 'teams'
type TeamMode = 'sum_all' | 'best_n'

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = useMemo(() => createClient(), [])

  const [hdr, setHdr] = useState<EventHeader | null>(null)
  const [leader, setLeader] = useState<LbRow[]>([])
  const [playerRounds, setPlayerRounds] = useState<PlayerRound[]>([])
  const [attached, setAttached] = useState<ERoundBase[]>([])
  const [recent, setRecent] = useState<ERoundBase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // toggles
  const [viewMode, setViewMode] = useState<ViewMode>('individuals')
  const [teamMode, setTeamMode] = useState<TeamMode>('best_n')
  const [bestN, setBestN] = useState<number>(4)

  async function loadAll() {
    setLoading(true); setError(null)

    // header
    const { data: e1 } = await supabase
      .from('v_events_enriched')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    setHdr(e1 as any)

    // leaderboard by player (totals/averages)
    const { data: lb } = await supabase
      .from('v_event_leaderboard_by_player')
      .select('*')
      .eq('event_id', id)
    const sorted = (lb ?? []).sort((a: any, b: any) => a.position - b.position) as LbRow[]
    setLeader(sorted)

    // all player-round rows (for per-round columns + team scoring)
    const { data: pr } = await supabase
      .from('v_event_player_rounds')
      .select('*')
      .eq('event_id', id)
    setPlayerRounds((pr ?? []) as PlayerRound[])

    // attached rounds (for the table below)
    const { data: er } = await supabase
      .from('event_rounds')
      .select('round_id')
      .eq('event_id', id)

    const attachedIds = (er ?? []).map((r: any) => r.round_id)
    if (attachedIds.length) {
      const { data: r1 } = await supabase
        .from('v_round_leaderboard_base')
        .select('round_id, created_at, player_id, player_name, team_name, to_par, sg_total')
        .in('round_id', attachedIds)
        .order('created_at', { ascending: true })
      setAttached((r1 ?? []) as ERoundBase[])
    } else {
      setAttached([])
    }

    // quick-pick: recent rounds in date window, not attached yet
    const start = (e1 as any)?.start_date ?? null
    const end = (e1 as any)?.end_date ?? null
    let q = supabase
      .from('v_round_leaderboard_base')
      .select('round_id, created_at, player_id, player_name, team_name, to_par, sg_total')
      .order('created_at', { ascending: false })
      .limit(200)
    if (start) q = q.gte('created_at', start)
    if (end) q = q.lte('created_at', end + 'T23:59:59')
    const { data: r2 } = await q
    const cand = ((r2 ?? []) as ERoundBase[]).filter(r => !attachedIds.includes(r.round_id))
    setRecent(cand)

    setLoading(false)
  }

  useEffect(() => { loadAll() }, [id])

  async function attach(roundId: string) {
    setError(null)
    const { error: insErr } = await supabase.from('event_rounds').insert({
      event_id: id, round_id: roundId
    })
    if (insErr) { setError(insErr.message); return }
    await loadAll()
  }

  async function detach(roundId: string) {
    setError(null)
    const { error: delErr } = await supabase.from('event_rounds').delete()
      .eq('event_id', id).eq('round_id', roundId)
    if (delErr) { setError(delErr.message); return }
    await loadAll()
  }

  // ---------- Derived helpers ----------
  // distinct round indices present in this event, sorted asc
  const roundIndices = Array.from(new Set(
    playerRounds
      .map(r => r.round_index ?? 0)
      .filter(n => n && Number.isFinite(n))
  )).sort((a, b) => Number(a) - Number(b)) as number[]

  // Per-player pivot of to_par by round_index
  type PivotRow = LbRow & { roundsByIndex: Record<number, number | null> }
  const pivotIndividuals: PivotRow[] = (() => {
    const byPlayer = new Map<string, PivotRow>()
    // seed with leaderboard totals for ordering/averages
    for (const l of leader) {
      byPlayer.set(l.player_id, {
        ...l,
        roundsByIndex: {},
      })
    }
    // fill per-round cells
    for (const r of playerRounds) {
      const pid = r.player_id ?? 'unknown'
      if (!byPlayer.has(pid)) {
        byPlayer.set(pid, {
          player_id: pid,
          player_name: r.player_name ?? '—',
          team_id: r.team_id ?? null,
          team_name: r.team_name ?? null,
          event_id: id,
          rounds: 0,
          total_to_par: 0,
          avg_to_par: 0,
          avg_sg_total: null,
          avg_sg_ott: null,
          avg_sg_app: null,
          avg_sg_arg: null,
          avg_sg_putt: null,
          best_round_to_par: null,
          last_played: null,
          position: 9999,
          roundsByIndex: {},
        } as any)
      }
      const row = byPlayer.get(pid)!
      const idx = Number(r.round_index ?? 0)
      if (idx) row.roundsByIndex[idx] = r.to_par ?? null
    }
    return Array.from(byPlayer.values()).sort((a, b) => a.position - b.position)
  })()

  // Team tables
  type TeamAgg = {
    team_id: string
    team_name: string | null
    totalsByIndex: Record<number, number>
    grandTotal: number
    includedCount: number
    avg_sg_total: number | null
  }

  const teamTable: TeamAgg[] = (() => {
    const byTeam: Map<string, TeamAgg> = new Map()
    const ensureTeam = (tid: string | null, tname: string | null) => {
      const key = tid ?? 'unknown'
      if (!byTeam.has(key)) {
        byTeam.set(key, {
          team_id: key,
          team_name: tname ?? '—',
          totalsByIndex: {},
          grandTotal: 0,
          includedCount: 0,
          avg_sg_total: null,
        })
      }
      return byTeam.get(key)!
    }

    if (teamMode === 'sum_all') {
      const byTeamRound: Record<string, number> = {}
      const sgTotals: Record<string, { sum: number; cnt: number }> = {}

      for (const r of playerRounds) {
        const tid = r.team_id ?? 'unknown'
        const tname = r.team_name ?? '—'
        const idx = Number(r.round_index ?? 0)
        if (!idx || r.to_par === null || r.to_par === undefined) continue
        const key = `${tid}:${idx}`
        byTeamRound[key] = (byTeamRound[key] ?? 0) + Number(r.to_par)

        if (r.sg_total !== null && r.sg_total !== undefined && Number.isFinite(Number(r.sg_total))) {
          sgTotals[tid] = sgTotals[tid] || { sum: 0, cnt: 0 }
          sgTotals[tid].sum += Number(r.sg_total)
          sgTotals[tid].cnt += 1
        }

        ensureTeam(tid, tname)
      }

      for (const [key, total] of Object.entries(byTeamRound)) {
        const [tid, idxStr] = key.split(':')
        const idx = Number(idxStr)
        const row = ensureTeam(tid, null)
        row.totalsByIndex[idx] = (row.totalsByIndex[idx] ?? 0) + total
      }

      for (const row of byTeam.values()) {
        row.grandTotal = roundIndices.reduce((s, i) => s + (row.totalsByIndex[i] ?? 0), 0)
        const sg = (sgTotals[row.team_id] ?? null)
        row.avg_sg_total = sg && sg.cnt ? sg.sum / sg.cnt : null
        row.includedCount = sg?.cnt ?? 0
      }

    } else {
      // best N per round
      type PR = { to_par: number; sg_total: number | null }
      const bucketsPR: Record<string, PR[]> = {}
      for (const r of playerRounds) {
        const tid = r.team_id ?? 'unknown'
        const idx = Number(r.round_index ?? 0)
        if (!idx || r.to_par === null || r.to_par === undefined) continue
        const key = `${tid}:${idx}`
        bucketsPR[key] = bucketsPR[key] || []
        bucketsPR[key].push({
          to_par: Number(r.to_par),
          sg_total: (r.sg_total === null || r.sg_total === undefined || !Number.isFinite(Number(r.sg_total))) ? null : Number(r.sg_total)
        })
        ensureTeam(tid, r.team_name ?? '—')
      }

      const sgTotalsPerTeam: Record<string, { sum: number; cnt: number }> = {}
      for (const [key, arr] of Object.entries(bucketsPR)) {
        const [tid, idxStr] = key.split(':')
        const idx = Number(idxStr)
        arr.sort((a, b) => a.to_par - b.to_par)
        const picked = arr.slice(0, Math.max(1, bestN))
        const sumRound = picked.reduce((s, x) => s + x.to_par, 0)
        const row = ensureTeam(tid, null)
        row.totalsByIndex[idx] = (row.totalsByIndex[idx] ?? 0) + sumRound

        for (const p of picked) {
          if (p.sg_total !== null) {
            sgTotalsPerTeam[tid] = sgTotalsPerTeam[tid] || { sum: 0, cnt: 0 }
            sgTotalsPerTeam[tid].sum += p.sg_total
            sgTotalsPerTeam[tid].cnt += 1
          }
        }
      }

      for (const row of byTeam.values()) {
        row.grandTotal = roundIndices.reduce((s, i) => s + (row.totalsByIndex[i] ?? 0), 0)
        const sg = (sgTotalsPerTeam[row.team_id] ?? null)
        row.avg_sg_total = sg && sg.cnt ? sg.sum / sg.cnt : null
        row.includedCount = sg?.cnt ?? 0
      }
    }

    return Array.from(byTeam.values()).sort((a, b) => a.grandTotal - b.grandTotal)
  })()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1>Event</h1>
        <div className="flex gap-2">
          <Link href="/events" className="btn-on-light-outline">All Events</Link>
          <Link href="/leaderboard" className="btn-on-light-outline">Leaderboard</Link>
        </div>
      </div>

      {/* Header */}
      <div className="card">
        {hdr ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="text-xl font-bold">{hdr.name}</div>
              <div className="text-sm text-gray-600">
                {hdr.event_type ?? '—'} • {(hdr.start_date ?? '—')} — {(hdr.end_date ?? '—')}
              </div>
              <div className="text-sm text-gray-600">
                {hdr.course_name ? `Course: ${hdr.course_name}` : ''} {hdr.team_name ? ` • Host: ${hdr.team_name}` : ''}
              </div>
            </div>
            <div className="flag-accent" />
          </div>
        ) : loading ? 'Loading…' : 'Not found.'}
      </div>

      {/* Attach / Recent rounds */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Attach Rounds</div>
          <div className="card-subtle">Pick from recent rounds in the event date window.</div>
        </div>
        {error && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        {recent.length === 0 ? (
          <div className="text-sm text-gray-600">No candidate rounds in this date range.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Player</th>
                  <th>Team</th>
                  <th>To Par</th>
                  <th>SG Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recent.map(r => (
                  <tr key={r.round_id}>
                    <td>{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
                    <td>{r.player_name ?? '—'}</td>
                    <td>{r.team_name ?? '—'}</td>
                    <td>{r.to_par ?? '—'}</td>
                    <td>{r.sg_total === null ? '—' : Number(r.sg_total).toFixed(2)}</td>
                    <td className="text-right">
                      <button className="btn-on-light-outline" onClick={()=>attach(r.round_id)}>Attach</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attached rounds */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Attached Rounds</div>
        </div>
        {attached.length === 0 ? (
          <div className="text-sm text-gray-600">No rounds attached yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th><th>Player</th><th>Team</th><th>To Par</th><th>SG Total</th><th></th>
                </tr>
              </thead>
              <tbody>
                {attached.map(r => (
                  <tr key={r.round_id}>
                    <td>{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
                    <td>{r.player_name ?? '—'}</td>
                    <td>{r.team_name ?? '—'}</td>
                    <td>{r.to_par ?? '—'}</td>
                    <td>{r.sg_total === null ? '—' : Number(r.sg_total).toFixed(2)}</td>
                    <td className="text-right">
                      <button className="btn-on-light-outline" onClick={()=>detach(r.round_id)}>Detach</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Leaderboard with toggles */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Leaderboard</div>
          <div className="flex items-center gap-2">
            <button
              className={['px-3 py-1.5 rounded-full text-sm border', viewMode === 'individuals' ? 'bg-[#3C3B6E] text-white border-[#3C3B6E]' : 'bg-white text-[#3C3B6E] border-gray-300 hover:bg-gray-50'].join(' ')}
              onClick={() => setViewMode('individuals')}
            >
              Individuals
            </button>
            <button
              className={['px-3 py-1.5 rounded-full text-sm border', viewMode === 'teams' ? 'bg-[#3C3B6E] text-white border-[#3C3B6E]' : 'bg-white text-[#3C3B6E] border-gray-300 hover:bg-gray-50'].join(' ')}
              onClick={() => setViewMode('teams')}
            >
              Teams
            </button>

            {viewMode === 'teams' && (
              <div className="ml-4 flex items-center gap-2">
                <span className="text-sm text-gray-700">Scoring:</span>
                <button
                  className={['px-3 py-1.5 rounded-full text-sm border', teamMode === 'sum_all' ? 'bg-[#B22234] text-white border-[#B22234]' : 'bg-white text-[#3C3B6E] border-gray-300 hover:bg-gray-50'].join(' ')}
                  onClick={() => setTeamMode('sum_all')}
                >
                  Sum All
                </button>
                <button
                  className={['px-3 py-1.5 rounded-full text-sm border', teamMode === 'best_n' ? 'bg-[#B22234] text-white border-[#B22234]' : 'bg-white text-[#3C3B6E] border-gray-300 hover:bg-gray-50'].join(' ')}
                  onClick={() => setTeamMode('best_n')}
                >
                  Best N
                </button>
                {teamMode === 'best_n' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">N</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={bestN}
                      onChange={e => setBestN(Math.max(1, Math.min(10, Number(e.target.value || 1))))}
                      className="input w-20"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* INDIVIDUALS TABLE */}
        {viewMode === 'individuals' && (
          <div className="overflow-x-auto">
            {leader.length === 0 ? (
              <div className="text-sm text-gray-600 p-2">No leaderboard yet.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Player</th>
                    <th>Team</th>
                    {roundIndices.map(i => (<th key={`ri-${i}`}>R{i}</th>))}
                    <th>Total To Par</th>
                    <th>Avg To Par</th>
                    <th>Avg SG Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pivotIndividuals.map((r) => (
                    <tr key={r.player_id}>
                      <td>{r.position}</td>
                      <td>{r.player_name}</td>
                      <td>{r.team_name ?? '—'}</td>
                      {roundIndices.map(i => (
                        <td key={`cell-${r.player_id}-${i}`}>{r.roundsByIndex[i] ?? '—'}</td>
                      ))}
                      <td>{r.total_to_par}</td>
                      <td>{r.avg_to_par.toFixed(2)}</td>
                      <td>{r.avg_sg_total === null ? '—' : r.avg_sg_total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TEAMS TABLE */}
        {viewMode === 'teams' && (
          <div className="overflow-x-auto">
            {teamTable.length === 0 ? (
              <div className="text-sm text-gray-600 p-2">No team scoring yet.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Team</th>
                    {roundIndices.map(i => (<th key={`tri-${i}`}>R{i}</th>))}
                    <th>Total To Par</th>
                    <th>Avg SG Total</th>
                  </tr>
                </thead>
                <tbody>
                  {teamTable.map((t, idx) => (
                    <tr key={t.team_id}>
                      <td>{idx + 1}</td>
                      <td>{t.team_name ?? '—'}</td>
                      {roundIndices.map(i => (
                        <td key={`tcell-${t.team_id}-${i}`}>{(t.totalsByIndex[i] ?? null) === null ? '—' : (t.totalsByIndex[i]).toFixed(0)}</td>
                      ))}
                      <td>{t.grandTotal.toFixed(0)}</td>
                      <td>{t.avg_sg_total === null ? '—' : t.avg_sg_total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

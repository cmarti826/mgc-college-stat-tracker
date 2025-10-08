// app/events/[id]/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

type EventHeader = {
  id: string
  name: string
  event_type: 'TOURNAMENT'|'QUALIFYING'|'PRACTICE'|null
  start_date: string|null
  end_date: string|null
  course_name: string|null
  team_name: string|null
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

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = useMemo(() => supabaseBrowser(), [])

  const [hdr, setHdr] = useState<EventHeader | null>(null)
  const [leader, setLeader] = useState<LbRow[]>([])
  const [attached, setAttached] = useState<ERoundBase[]>([])
  const [recent, setRecent] = useState<ERoundBase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadAll() {
    setLoading(true); setError(null)

    // header
    const { data: e1 } = await supabase
      .from('v_events_enriched')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    setHdr(e1 as any)

    // leaderboard for event
    const { data: lb } = await supabase
      .from('v_event_leaderboard_by_player')
      .select('*')
      .eq('event_id', id)
    const sorted = (lb ?? []).sort((a: any, b: any) => a.position - b.position) as LbRow[]
    setLeader(sorted)

    // attached rounds (show small list)
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
    const start = hdr?.start_date ?? e1?.start_date ?? null
    const end = hdr?.end_date ?? e1?.end_date ?? null
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
                  <th>Date</th><th>Player</th><th>Team</th><th>To Par</th><th>SG Total</th><th></th>
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

      {/* Leaderboard */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Leaderboard</div>
          <div className="card-subtle">Totals to par; SG averages across attached rounds.</div>
        </div>
        {leader.length === 0 ? (
          <div className="text-sm text-gray-600">No leaderboard yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Pos</th><th>Player</th><th>Team</th>
                  <th>Rounds</th><th>Total To Par</th><th>Avg To Par</th>
                  <th>Avg SG Total</th><th>OTT</th><th>APP</th><th>ARG</th><th>PUTT</th>
                  <th>Best Round</th><th>Last Played</th>
                </tr>
              </thead>
              <tbody>
                {leader.map(r => (
                  <tr key={r.player_id}>
                    <td>{r.position}</td>
                    <td>{r.player_name}</td>
                    <td>{r.team_name ?? '—'}</td>
                    <td>{r.rounds}</td>
                    <td>{r.total_to_par}</td>
                    <td>{r.avg_to_par.toFixed(2)}</td>
                    <td>{r.avg_sg_total === null ? '—' : r.avg_sg_total.toFixed(2)}</td>
                    <td>{r.avg_sg_ott   === null ? '—' : r.avg_sg_ott.toFixed(2)}</td>
                    <td>{r.avg_sg_app   === null ? '—' : r.avg_sg_app.toFixed(2)}</td>
                    <td>{r.avg_sg_arg   === null ? '—' : r.avg_sg_arg.toFixed(2)}</td>
                    <td>{r.avg_sg_putt  === null ? '—' : r.avg_sg_putt.toFixed(2)}</td>
                    <td>{r.best_round_to_par === null ? '—' : r.best_round_to_par}</td>
                    <td>{r.last_played ? new Date(r.last_played).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

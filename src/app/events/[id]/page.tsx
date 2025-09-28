'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type EventRow = {
  id: string; name: string; type: 'qualifying'|'tournament'|'practice'
  status: 'draft'|'live'|'final'; start_date: string|null; end_date: string|null
  team_id: string; course_id: string|null; course_tee_id: string|null
}
type Player = { id: string; display_name: string }
type Entry = { player_id: string }
type Round = { id: string; player_id: string|null; start_time: string|null; status: string }
type VTotal = { round_id: string; to_par: number|null; strokes: number|null }

export default function EventLeaderboardPage() {
  const { id } = useParams<{ id: string }>()
  const eventId = id

  const [evt, setEvt] = useState<EventRow | null>(null)
  const [course, setCourse] = useState<{ name: string; city: string|null; state: string|null } | null>(null)
  const [tee, setTee] = useState<{ tee_name: string|null; color: string|null; course_rating: number|null; slope_rating: number|null } | null>(null)

  const [entries, setEntries] = useState<Entry[]>([])
  const [players, setPlayers] = useState<Record<string, Player>>({})

  const [rounds, setRounds] = useState<Round[]>([])
  const [totals, setTotals] = useState<Record<string, VTotal>>({})

  const [err, setErr] = useState<string|null>(null)

  useEffect(() => {
    ;(async () => {
      setErr(null)
      // Event
      const { data: e, error: ee } = await supabase
        .from('events')
        .select('id,name,type,status,start_date,end_date,team_id,course_id,course_tee_id')
        .eq('id', eventId)
        .single()
      if (ee) { setErr(ee.message); return }
      setEvt(e as EventRow)

      // Course + Tee (optional)
      if (e.course_id) {
        const { data: c } = await supabase
          .from('courses').select('name,city,state').eq('id', e.course_id).maybeSingle()
        if (c) setCourse(c as any)
      }
      if (e.course_tee_id) {
        const { data: t } = await supabase
          .from('course_tees')
          .select('tee_name,color,course_rating,slope_rating')
          .eq('id', e.course_tee_id).maybeSingle()
        if (t) setTee(t as any)
      }

      // Entries
      const { data: en, error: enErr } = await supabase
        .from('event_entries')
        .select('player_id')
        .eq('event_id', eventId)
      if (enErr) { setErr(enErr.message); return }
      setEntries((en ?? []) as Entry[])
      const pids = ((en ?? []) as Entry[]).map(x => x.player_id)
      if (pids.length) {
        const { data: ps } = await supabase.from('players').select('id,display_name').in('id', pids as any)
        const map: Record<string, Player> = {}
        for (const row of (ps ?? []) as Player[]) map[row.id] = row
        setPlayers(map)
      }

      // Rounds for this event
      const { data: rd } = await supabase
        .from('rounds')
        .select('id,player_id,start_time,status')
        .eq('event_id', eventId)
        .order('start_time', { ascending: true })
      const rds = (rd ?? []) as Round[]
      setRounds(rds)

      // Totals for those rounds
      if (rds.length) {
        const { data: vt } = await supabase
          .from('v_round_totals')
          .select('round_id,strokes,to_par')
          .in('round_id', rds.map(r => r.id) as any)
        const tmap: Record<string, VTotal> = {}
        for (const row of (vt ?? []) as VTotal[]) tmap[row.round_id] = row
        setTotals(tmap)
      } else {
        setTotals({})
      }
    })()
  }, [eventId])

  // Group rounds per player, sorted by start_time
  const roundsByPlayer = useMemo(() => {
    const map: Record<string, Round[]> = {}
    for (const r of rounds) {
      const pid = r.player_id ?? '__unknown__'
      if (!map[pid]) map[pid] = []
      map[pid].push(r)
    }
    for (const pid of Object.keys(map)) {
      map[pid].sort((a,b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))
    }
    return map
  }, [rounds])

  const playerRows = useMemo(() => {
    const entryIds = entries.map(e => e.player_id)
    const setIds = new Set(entryIds.length ? entryIds : Object.keys(roundsByPlayer))
    return Array.from(setIds)
  }, [entries, roundsByPlayer])

  const maxRounds = useMemo(() => {
    let m = 0
    for (const pid of playerRows) m = Math.max(m, (roundsByPlayer[pid]?.length ?? 0))
    return Math.min(Math.max(m, 1), 4) // show up to 4 rounds
  }, [playerRows, roundsByPlayer])

  type Row = {
    player_id: string; name: string
    r: ({ to_par: number|null; strokes: number|null; round_id: string|null })[]
    total_to_par: number|null; total_strokes: number|null
  }

  const rows: Row[] = useMemo(() => {
    const out: Row[] = []
    for (const pid of playerRows) {
      const prs = roundsByPlayer[pid] ?? []
      const cells: Row['r'] = []
      let sumPar = 0; let sumSt = 0; let haveAny = false
      for (let i=0;i<maxRounds;i++) {
        const r = prs[i]
        if (r) {
          const vt = totals[r.id]
          const tp = vt?.to_par ?? null
          const st = vt?.strokes ?? null
          if (tp != null) { sumPar += tp; haveAny = true }
          if (st != null) { sumSt += st }
          cells.push({ to_par: tp, strokes: st, round_id: r.id })
        } else {
          cells.push({ to_par: null, strokes: null, round_id: null })
        }
      }
      out.push({
        player_id: pid,
        name: players[pid]?.display_name ?? '—',
        r: cells,
        total_to_par: haveAny ? sumPar : null,
        total_strokes: haveAny ? sumSt : null
      })
    }
    // sort by total_to_par, then total_strokes
    out.sort((a,b) => {
      const ap = a.total_to_par; const bp = b.total_to_par
      if (ap == null && bp == null) return a.name.localeCompare(b.name)
      if (ap == null) return 1
      if (bp == null) return -1
      if (ap !== bp) return ap - bp
      const as = a.total_strokes ?? Infinity
      const bs = b.total_strokes ?? Infinity
      return as - bs
    })
    return out
  }, [playerRows, roundsByPlayer, maxRounds, totals, players])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{evt?.name ?? 'Event'}</h1>
          <div className="text-sm text-gray-600">
            {evt?.type ?? '—'} • {evt?.status ?? '—'} • {fmtRange(evt?.start_date, evt?.end_date)}
          </div>
        </div>
        <div className="flex gap-2">
          <Link className="rounded border px-3 py-1.5" href={`/events/${eventId}/manage`}>Manage</Link>
        </div>
      </div>

      {/* Course/Tee summary */}
      <div className="rounded border bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-gray-700">
            <div className="font-semibold">
              {course?.name ?? 'Course'}
              {course ? <span className="ml-1 text-gray-600">• {[course.city, course.state].filter(Boolean).join(', ')}</span> : null}
            </div>
            <div className="mt-0.5">
              <span className="font-medium">Tee:</span>{' '}
              {tee?.tee_name ?? '—'}{' '}
              {tee?.color ? <span className="inline-block h-3 w-3 rounded-full border align-middle" style={{ backgroundColor: tee.color }} /> : null}
              {tee?.course_rating ? <> • <span className="font-medium">CR/SR:</span> {tee.course_rating}/{tee?.slope_rating ?? '—'}</> : null}
            </div>
          </div>
          <div className="text-sm text-gray-700">
            <Link className="underline text-[#0033A0]" href="/events">← All Events</Link>
          </div>
        </div>
      </div>

      {/* Error */}
      {err && <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{err}</div>}

      {/* Leaderboard */}
      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Player</th>
              {Array.from({ length: maxRounds }, (_,i)=>(
                <th key={i} className="px-3 py-2 text-right">R{i+1}</th>
              ))}
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.player_id || idx} className="border-t">
                <td className="px-3 py-2">{row.name}</td>
                {row.r.map((cell, i) => (
                  <td key={i} className="px-3 py-2 text-right">
                    {cell.to_par == null ? '—' : fmtPar(cell.to_par)}
                  </td>
                ))}
                <td className="px-3 py-2 text-right font-semibold">
                  {row.total_to_par == null ? '—' : fmtPar(row.total_to_par)}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td className="px-3 py-4 text-gray-600" colSpan={2 + maxRounds}>No entries.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function fmtRange(a?: string|null, b?: string|null) {
  if (!a && !b) return '—'
  if (a && !b) return a
  if (!a && b) return b
  return a === b ? a : `${a} → ${b}`
}
function fmtPar(v: number) { return v > 0 ? `+${v}` : String(v) }

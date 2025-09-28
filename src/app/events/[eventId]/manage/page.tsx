'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Event = {
  id: string
  name: string
  type: string
  status: string
  team_id: string
  course_id: string
  course_tee_id: string | null
  start_date: string | null
  end_date: string | null
}
type Player = { id: string; display_name: string }
type Entry = { player_id: string }
type RoundRow = { id: string; player_id: string; status: string }

export default function ManageEventPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [ev, setEv] = useState<Event | null>(null)
  const [roster, setRoster] = useState<Player[]>([])
  const [entries, setEntries] = useState<Set<string>>(new Set())
  const [rounds, setRounds] = useState<Record<string, RoundRow>>({})
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = async () => {
    setErr(null)
    // Event
    const { data: e, error: ee } = await supabase
      .from('events')
      .select('id,name,type,status,team_id,course_id,course_tee_id,start_date,end_date')
      .eq('id', eventId)
      .single()
    if (ee) { setErr(ee.message); return }
    setEv(e as Event)

    // Roster for team
    const teamId = (e as any).team_id
    const { data: r, error: er } = await supabase
      .from('team_roster')
      .select('player_id')
      .eq('team_id', teamId)
    if (er) { setErr(er.message); return }
    const playerIds = (r ?? []).map((x:any) => x.player_id as string)
    let players: Player[] = []
    if (playerIds.length) {
      const { data: p, error: ep } = await supabase
        .from('players')
        .select('id,display_name')
        .in('id', playerIds)
        .order('display_name')
      if (ep) { setErr(ep.message); return }
      players = (p ?? []) as Player[]
    }
    setRoster(players)

    // Entries
    const { data: en, error: een } = await supabase
      .from('event_entries')
      .select('player_id')
      .eq('event_id', eventId)
    if (een) { setErr(een.message); return }
    const setE = new Set<string>()
    for (const row of en ?? []) setE.add((row as Entry).player_id)
    setEntries(setE)

    // Rounds for this event (latest per player)
    const { data: rs, error: ers } = await supabase
      .from('rounds')
      .select('id,player_id,status')
      .eq('event_id', eventId)
    if (ers) { setErr(ers.message); return }
    const map: Record<string, RoundRow> = {}
    for (const rrow of rs ?? []) {
      const rr = rrow as RoundRow
      map[rr.player_id] = rr // if multiple, last one wins; good enough for now
    }
    setRounds(map)
  }

  useEffect(() => { load() }, [eventId])

  const toggleEntry = async (playerId: string, checked: boolean) => {
    setBusy(playerId); setErr(null)
    try {
      if (checked) {
        const { error } = await supabase
          .from('event_entries')
          .insert({ event_id: eventId, player_id: playerId })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('event_entries')
          .delete()
          .eq('event_id', eventId)
          .eq('player_id', playerId)
        if (error) throw error
      }
      await load()
    } catch (e:any) {
      setErr(e.message ?? 'Update failed')
    } finally {
      setBusy(null)
    }
  }

  const startRound = async (playerId: string) => {
    setBusy(`start-${playerId}`); setErr(null)
    try {
      const { data, error } = await supabase
        .rpc('start_round', { p_event: eventId, p_player: playerId })
      if (error) throw error
      // Go to the round
      const rid = data as string
      window.location.href = `/rounds/${rid}`
    } catch (e:any) {
      setErr(e.message ?? 'Start failed')
    } finally {
      setBusy(null)
    }
  }

  const hasRound = (pid: string) => !!rounds[pid]
  const roundPath = (pid: string) => rounds[pid] ? `/rounds/${rounds[pid].id}` : '#'

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-bold">Manage Event</h1>
        <div className="flex gap-2">
          <Link href={`/events/${eventId}`} className="rounded border px-3 py-1.5">Leaderboard</Link>
          <button onClick={load} className="rounded bg-[#0033A0] px-3 py-1.5 text-white">Refresh</button>
        </div>
      </div>

      {err && <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{err}</div>}

      {ev && (
        <div className="rounded border bg-white p-3 text-sm">
          <div className="font-medium">{ev.name}</div>
          <div className="text-gray-600">
            {ev.type} • {ev.status} • {ev.start_date ?? '—'}
            {ev.end_date && ev.end_date !== ev.start_date ? ` → ${ev.end_date}` : ''}
          </div>
        </div>
      )}

      <div className="rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Player</th>
              <th className="px-3 py-2 text-center">In Event?</th>
              <th className="px-3 py-2 text-center">Round</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roster.map(p => {
              const checked = entries.has(p.id)
              const r = rounds[p.id]
              return (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2">{p.display_name}</td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => toggleEntry(p.id, e.target.checked)}
                      disabled={busy === p.id}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r ? <Link className="text-[#0033A0] underline" href={roundPath(p.id)}>
                      {r.status === 'submitted' ? 'Submitted' : 'In Progress'}
                    </Link> : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {!r && checked && (
                      <button
                        onClick={() => startRound(p.id)}
                        disabled={busy === `start-${p.id}`}
                        className="rounded bg-[#0B6B3A] px-3 py-1.5 text-white disabled:opacity-50"
                      >
                        {busy === `start-${p.id}` ? 'Starting…' : 'Start Round'}
                      </button>
                    )}
                    {r && (
                      <Link href={roundPath(p.id)} className="rounded border px-3 py-1.5">
                        Open Scorecard
                      </Link>
                    )}
                  </td>
                </tr>
              )
            })}
            {!roster.length && (
              <tr><td className="px-3 py-4 text-gray-600" colSpan={4}>No roster yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type EventType = 'qualifying'|'tournament'|'practice'
type EventStatus = 'draft'|'live'|'final'

type EventRow = {
  id: string
  name: string
  team_id: string
  type: EventType
  status: EventStatus
  start_date: string | null
  end_date: string | null
  course_id: string | null
  course_tee_id: string | null
}
type Course = { id: string; name: string; city: string | null; state: string | null }
type Tee = { id: string; tee_name: string | null; color: string | null }
type Player = { id: string; display_name: string }
type Entry = { player_id: string }
type Round = { id: string; player_id: string | null; status: string; start_time: string | null }

export default function ManageEventPage() {
  const { id } = useParams<{ id: string }>()
  const eventId = id
  const router = useRouter()

  const [evt, setEvt] = useState<EventRow | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [courses, setCourses] = useState<Course[]>([])
  const [tees, setTees] = useState<Tee[]>([])

  const [entries, setEntries] = useState<Entry[]>([])
  const [players, setPlayers] = useState<Record<string, Player>>({})
  const [roster, setRoster] = useState<Player[]>([])
  const [addPid, setAddPid] = useState<string>('')

  const [rounds, setRounds] = useState<Round[]>([])

  const loadAll = useCallback(async () => {
    setErr(null); setInfo(null)

    // event
    const { data: e, error: ee } = await supabase
      .from('events')
      .select('id,name,team_id,type,status,start_date,end_date,course_id,course_tee_id')
      .eq('id', eventId)
      .single()
    if (ee) { setErr(ee.message); return }
    setEvt(e as EventRow)

    // courses
    const { data: cs } = await supabase.from('courses').select('id,name,city,state').order('name')
    setCourses((cs ?? []) as Course[])

    // tees for selected course
    if ((e as EventRow).course_id) {
      const { data: ts } = await supabase
        .from('course_tees')
        .select('id,tee_name,color')
        .eq('course_id', (e as EventRow).course_id)
        .order('tee_name')
      setTees((ts ?? []) as Tee[])
    } else {
      setTees([])
    }

    // entries
    const { data: en } = await supabase.from('event_entries').select('player_id').eq('event_id', eventId)
    const ens = (en ?? []) as Entry[]
    setEntries(ens)

    // players for entries
    const pids = ens.map(x => x.player_id)
    if (pids.length) {
      const { data: ps } = await supabase.from('players').select('id,display_name').in('id', pids)
      const map: Record<string, Player> = {}
      for (const row of (ps ?? []) as Player[]) map[row.id] = row
      setPlayers(map)
    } else {
      setPlayers({})
    }

    // team roster for add dropdown
    if ((e as EventRow).team_id) {
      const { data: tr } = await supabase.from('team_roster').select('player_id').eq('team_id', (e as EventRow).team_id)
      const trIds = (tr ?? []).map(x => (x as { player_id: string }).player_id)
      if (trIds.length) {
        const { data: rp } = await supabase.from('players').select('id,display_name').in('id', trIds).order('display_name')
        const list = (rp ?? []) as Player[]
        setRoster(list)
        setAddPid(prev => (list.some(p => p.id === prev) ? prev : ''))
      } else {
        setRoster([]); setAddPid('')
      }
    }

    // rounds for this event
    const { data: rd } = await supabase
      .from('rounds')
      .select('id,player_id,status,start_time')
      .eq('event_id', eventId)
      .order('start_time', { ascending: false })
    setRounds((rd ?? []) as Round[])
  }, [eventId])

  useEffect(() => { loadAll() }, [loadAll])

  const onChangeCourse = useCallback(async (cid: string) => {
    if (!evt) return
    setEvt({ ...evt, course_id: cid || null, course_tee_id: null })
    if (cid) {
      const { data: ts } = await supabase.from('course_tees').select('id,tee_name,color').eq('course_id', cid).order('tee_name')
      setTees((ts ?? []) as Tee[])
    } else {
      setTees([])
    }
  }, [evt])

  const saveEvent = useCallback(async () => {
    if (!evt) return
    setSaving(true); setErr(null); setInfo(null)
    try {
      const payload = {
        type: evt.type, status: evt.status,
        start_date: evt.start_date, end_date: evt.end_date,
        course_id: evt.course_id, course_tee_id: evt.course_tee_id
      }
      const { error } = await supabase.from('events').update(payload).eq('id', evt.id)
      if (error) throw error
      setInfo('Event saved.')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save event')
    } finally {
      setSaving(false)
    }
  }, [evt])

  const addEntry = useCallback(async () => {
    if (!evt || !addPid) return
    setSaving(true); setErr(null); setInfo(null)
    try {
      const { error } = await supabase.from('event_entries').insert({ event_id: evt.id, player_id: addPid })
      if (error && !String(error.message).toLowerCase().includes('duplicate')) throw error
      setAddPid('')
      await loadAll()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to add entry')
    } finally {
      setSaving(false)
    }
  }, [evt, addPid, loadAll])

  const removeEntry = useCallback(async (pid: string) => {
    if (!evt) return
    setSaving(true); setErr(null); setInfo(null)
    try {
      const { error } = await supabase.from('event_entries').delete().eq('event_id', evt.id).eq('player_id', pid)
      if (error) throw error
      await loadAll()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to remove entry')
    } finally {
      setSaving(false)
    }
  }, [evt, loadAll])

  const startRound = useCallback(async (pid: string) => {
    if (!evt) return
    setSaving(true); setErr(null)
    try {
      const nowIso = new Date().toISOString()
      const payload = {
        player_id: pid,
        team_id: evt.team_id,
        event_id: evt.id,
        course_id: evt.course_id,
        course_tee_id: evt.course_tee_id,
        status: 'in_progress' as const,
        start_time: nowIso,
        played_at: nowIso.slice(0, 10)
      }
      const { data, error } = await supabase
        .from('rounds')
        .insert(payload)
        .select('id')
        .single()
      if (error) throw error
      router.push(`/rounds/${(data as { id: string }).id}`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to start round')
    } finally {
      setSaving(false)
    }
  }, [evt, router])

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
          <button className="rounded border px-3 py-1.5" onClick={() => router.push(`/events/${eventId}`)}>Leaderboard</button>
          <Link className="rounded border px-3 py-1.5" href="/events">Events</Link>
        </div>
      </div>

      {err && <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{err}</div>}
      {info && <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">{info}</div>}

      {/* Event meta */}
      {evt && (
        <div className="rounded border bg-white p-3">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Type">
              <select className="w-full rounded border px-2 py-1" value={evt.type} onChange={e => setEvt({ ...evt, type: e.target.value as EventType })}>
                <option value="qualifying">Qualifying</option>
                <option value="tournament">Tournament</option>
                <option value="practice">Practice</option>
              </select>
            </Field>
            <Field label="Status">
              <select className="w-full rounded border px-2 py-1" value={evt.status} onChange={e => setEvt({ ...evt, status: e.target.value as EventStatus })}>
                <option value="draft">Draft</option>
                <option value="live">Live</option>
                <option value="final">Final</option>
              </select>
            </Field>
            <Field label="Start date">
              <input type="date" className="w-full rounded border px-2 py-1" value={evt.start_date ?? ''} onChange={e => setEvt({ ...evt, start_date: e.target.value || null })} />
            </Field>
            <Field label="End date">
              <input type="date" className="w-full rounded border px-2 py-1" value={evt.end_date ?? ''} onChange={e => setEvt({ ...evt, end_date: e.target.value || null })} />
            </Field>
            <Field label="Course">
              <select className="w-full rounded border px-2 py-1" value={evt.course_id ?? ''} onChange={e => onChangeCourse(e.target.value)}>
                <option value="">—</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.city || c.state ? ` • ${[c.city, c.state].filter(Boolean).join(', ')}` : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tee">
              <select
                className="w-full rounded border px-2 py-1"
                value={evt.course_tee_id ?? ''}
                onChange={e => setEvt({ ...evt, course_tee_id: e.target.value || null })}
                disabled={!evt.course_id}
              >
                <option value="">—</option>
                {tees.map(t => <option key={t.id} value={t.id}>{t.tee_name ?? 'Tee'}{t.color ? ` • ${t.color}` : ''}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-3">
            <button onClick={saveEvent} disabled={saving} className="rounded bg-[#0033A0] px-4 py-2 text-white disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Event'}
            </button>
          </div>
        </div>
      )}

      {/* Entries */}
      <div className="rounded border bg-white">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="font-semibold">Entries</div>
          <div className="text-sm text-gray-600">Team {evt?.team_id?.slice(0, 8) ?? '—'}</div>
        </div>
        <div className="p-3">
          {/* Add entry */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <select className="w-64 rounded border px-2 py-1" value={addPid} onChange={e => setAddPid(e.target.value)}>
              <option value="">Select player…</option>
              {roster
                .filter(r => !entries.some(en => en.player_id === r.id))
                .map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
            </select>
            <button onClick={addEntry} disabled={saving || !addPid} className="rounded border px-3 py-1.5">Add</button>
          </div>

          {/* List entries */}
          <div className="divide-y">
            {entries.length ? entries.map(e => {
              const p = players[e.player_id]
              const prounds = rounds.filter(r => r.player_id === e.player_id)
              const active = prounds.find(r => r.status === 'in_progress')
              return (
                <div key={e.player_id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                  <div className="font-medium">{p?.display_name ?? e.player_id}</div>
                  <div className="flex items-center gap-2 text-sm">
                    {active ? (
                      <>
                        <button
                          onClick={() => router.push(`/rounds/${active.id}`)}
                          className="underline text-[#0033A0]"
                        >
                          Open Round
                        </button>
                        <span className="text-gray-600">({prounds.length} total)</span>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startRound(e.player_id)} className="rounded bg-[#0B6B3A] px-3 py-1.5 text-white">Start Round</button>
                        <span className="text-gray-600">({prounds.length} total)</span>
                      </>
                    )}
                    <button onClick={() => removeEntry(e.player_id)} className="rounded border px-3 py-1.5">Remove</button>
                  </div>
                </div>
              )
            }) : (
              <div className="py-3 text-sm text-gray-600">No entries yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Rounds list */}
      <div className="rounded border bg-white">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="font-semibold">All Rounds</div>
          <button className="text-sm underline" onClick={() => router.push(`/events/${eventId}`)}>Leaderboard</button>
        </div>
        <div className="divide-y">
          {rounds.length ? rounds.map(r => (
            <div key={r.id} className="flex items-center justify-between px-3 py-2">
              <div className="text-sm">
                <span className="font-medium">{players[r.player_id ?? '']?.display_name ?? r.player_id ?? '—'}</span>
                <span className="ml-2 text-gray-600">{r.start_time?.slice(0, 19).replace('T', ' ') ?? '—'} • {r.status}</span>
              </div>
              <button onClick={() => router.push(`/rounds/${r.id}`)} className="text-sm underline text-[#0033A0]">Open</button>
            </div>
          )) : (
            <div className="px-3 py-4 text-sm text-gray-600">No rounds yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-gray-600">{label}</div>
      {children}
    </label>
  )
}
function fmtRange(a?: string | null, b?: string | null) {
  if (!a && !b) return '—'
  if (a && !b) return a
  if (!a && b) return b
  return a === b ? a : `${a} → ${b}`
}

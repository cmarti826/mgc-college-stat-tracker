'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Team = { id: string; name: string }
type EventType = 'qualifying' | 'tournament' | 'practice'
type EventStatus = 'draft' | 'live' | 'final'
type EventRow = {
  id: string
  team_id: string
  name: string
  type: EventType
  status: EventStatus
  start_date: string | null
  end_date: string | null
  course_id: string | null
  course_tee_id: string | null
}
type Course = { id: string; name: string; city: string | null; state: string | null }
type Tee = { id: string; tee_name: string | null; color: string | null; course_rating: number | null; slope_rating: number | null }

export default function EventsPage() {
  const router = useRouter()

  // teams
  const [teams, setTeams] = useState<Team[]>([])
  const [teamId, setTeamId] = useState<string>('')

  // events
  const [events, setEvents] = useState<EventRow[]>([])

  // create form
  const [name, setName] = useState('')
  const [type, setType] = useState<EventType>('qualifying')
  const [status, setStatus] = useState<EventStatus>('live')
  const [start, setStart] = useState<string>('')
  const [end, setEnd] = useState<string>('')

  // optional course/tee
  const [courses, setCourses] = useState<Course[]>([])
  const [courseId, setCourseId] = useState<string>('')
  const [tees, setTees] = useState<Tee[]>([])
  const [teeId, setTeeId] = useState<string>('')

  // ui
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const teamName = useMemo(() => teams.find(t => t.id === teamId)?.name ?? '—', [teams, teamId])

  const loadTeams = useCallback(async () => {
    setErr(null)
    const { data, error } = await supabase.from('teams').select('id,name').order('name')
    if (error) { setErr(error.message); return }
    const list = (data ?? []) as Team[]
    setTeams(list)
    setTeamId(prev => (list.some(t => t.id === prev) ? prev : (list[0]?.id ?? '')))
  }, [])

  const loadEvents = useCallback(async (tid: string) => {
    if (!tid) { setEvents([]); return }
    setErr(null)
    const { data, error } = await supabase
      .from('events')
      .select('id,team_id,name,type,status,start_date,end_date,course_id,course_tee_id')
      .eq('team_id', tid)
      .order('start_date', { ascending: false })
    if (error) { setErr(error.message); return }
    setEvents((data ?? []) as EventRow[])
  }, [])

  const loadCourses = useCallback(async () => {
    const { data } = await supabase.from('courses').select('id,name,city,state').order('name')
    setCourses((data ?? []) as Course[])
  }, [])

  const loadTeesFor = useCallback(async (cid: string) => {
    if (!cid) { setTees([]); setTeeId(''); return }
    const { data } = await supabase
      .from('course_tees')
      .select('id,tee_name,color,course_rating,slope_rating')
      .eq('course_id', cid)
      .order('tee_name')
    const list = (data ?? []) as Tee[]
    setTees(list)
    setTeeId(list[0]?.id ?? '')
  }, [])

  useEffect(() => { loadTeams(); loadCourses() }, [loadTeams, loadCourses])
  useEffect(() => { loadEvents(teamId) }, [teamId, loadEvents])
  useEffect(() => { loadTeesFor(courseId) }, [courseId, loadTeesFor])

  const createEvent = useCallback(async () => {
    if (!teamId || !name.trim()) return
    setSaving(true); setErr(null); setInfo(null)
    try {
      const payload = {
        team_id: teamId,
        name: name.trim(),
        type,
        status,
        start_date: start || null,
        end_date: end || start || null,
        course_id: courseId || null,
        course_tee_id: teeId || null
      }
      const { error } = await supabase.from('events').insert(payload)
      if (error) throw error
      setName(''); setStart(''); setEnd(''); setCourseId(''); setTeeId('')
      setInfo('Event created.')
      await loadEvents(teamId)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create event')
    } finally {
      setSaving(false)
    }
  }, [teamId, name, type, status, start, end, courseId, teeId, loadEvents])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Events</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Team:</span>
          <select className="rounded border px-2 py-1" value={teamId} onChange={e => setTeamId(e.target.value)}>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            {!teams.length && <option value="">No teams</option>}
          </select>
        </div>
      </div>

      {/* Notices */}
      {err && <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{err}</div>}
      {info && <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">{info}</div>}

      {/* Create */}
      <div className="rounded border bg-white p-3">
        <div className="mb-2 text-sm text-gray-600">Create Event for <b>{teamName}</b></div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Name">
            <input className="w-full rounded border px-2 py-1" value={name} onChange={e => setName(e.target.value)} />
          </Field>
          <Field label="Type">
            <select className="w-full rounded border px-2 py-1" value={type} onChange={e => setType(e.target.value as EventType)}>
              <option value="qualifying">Qualifying</option>
              <option value="tournament">Tournament</option>
              <option value="practice">Practice</option>
            </select>
          </Field>
          <Field label="Status">
            <select className="w-full rounded border px-2 py-1" value={status} onChange={e => setStatus(e.target.value as EventStatus)}>
              <option value="draft">Draft</option>
              <option value="live">Live</option>
              <option value="final">Final</option>
            </select>
          </Field>
          <Field label="Start date">
            <input type="date" className="w-full rounded border px-2 py-1" value={start} onChange={e => setStart(e.target.value)} />
          </Field>
          <Field label="End date">
            <input type="date" className="w-full rounded border px-2 py-1" value={end} onChange={e => setEnd(e.target.value)} />
          </Field>
          <Field label="Course (optional)">
            <select className="w-full rounded border px-2 py-1" value={courseId} onChange={e => setCourseId(e.target.value)}>
              <option value="">—</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.city || c.state ? ` • ${[c.city, c.state].filter(Boolean).join(', ')}` : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tee (optional)">
            <select
              className="w-full rounded border px-2 py-1"
              value={teeId}
              onChange={e => setTeeId(e.target.value)}
              disabled={!courseId}
            >
              <option value="">—</option>
              {tees.map(t => (
                <option key={t.id} value={t.id}>
                  {t.tee_name ?? 'Tee'}{t.color ? ` • ${t.color}` : ''}{t.course_rating && t.slope_rating ? ` • ${t.course_rating}/{t.slope_rating}` : ''}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            className="rounded bg-[#0B6B3A] px-4 py-2 text-white disabled:opacity-50"
            onClick={createEvent}
            disabled={saving || !teamId || !name.trim()}
          >
            {saving ? 'Creating…' : 'Create Event'}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="rounded border bg-white">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="font-semibold">Events for {teamName}</div>
          <Link className="text-sm underline" href="/reports/team">Team Reports</Link>
        </div>
        <div className="divide-y">
          {events.length ? events.map(e => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
              <div>
                <div className="font-medium">
                  <Link href={`/events/${e.id}`} className="text-[#0033A0] underline">
                    {e.name}
                  </Link>
                </div>
                <div className="text-xs text-gray-600">
                  {e.type} • {e.status} • {formatRange(e.start_date, e.end_date)}
                </div>
              </div>
              <div className="flex gap-3 text-sm">
                <button onClick={() => router.push(`/events/${e.id}`)} className="underline">Leaderboard</button>
                <button onClick={() => router.push(`/events/${e.id}/manage`)} className="underline">Manage</button>
              </div>
            </div>
          )) : (
            <div className="px-3 py-4 text-sm text-gray-600">No events yet.</div>
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

function formatRange(a: string | null, b: string | null) {
  if (!a && !b) return '—'
  if (a && !b) return a
  if (!a && b) return b
  return a === b ? a : `${a} → ${b}`
}

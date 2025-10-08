// app/events/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'

type EventRow = {
  id: string
  name: string
  event_type: 'TOURNAMENT' | 'QUALIFYING' | 'PRACTICE' | null
  start_date: string | null
  end_date: string | null
  team_id: string | null
  team_name: string | null
  course_id: string | null
  course_name: string | null
  created_at: string | null
}

type Team = { id: string; name: string }
type Course = { id: string; name: string }

export default function EventsPage() {
  const supabase = useMemo(() => supabaseBrowser(), [])
  const [events, setEvents] = useState<EventRow[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // form
  const [name, setName] = useState('')
  const [eventType, setEventType] = useState<'TOURNAMENT'|'QUALIFYING'|'PRACTICE'>('TOURNAMENT')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [teamId, setTeamId] = useState<string>('')
  const [courseId, setCourseId] = useState<string>('')

  async function load() {
    setLoading(true); setError(null)
    const { data: list } = await supabase
      .from('v_events_enriched')
      .select('*')
      .order('start_date', { ascending: false })
    setEvents((list ?? []) as EventRow[])

    const { data: t } = await supabase.from('teams').select('id,name').order('name')
    setTeams((t ?? []) as Team[])

    const { data: c } = await supabase.from('courses').select('id,name').order('name')
    setCourses((c ?? []) as Course[])

    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function createEvent(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      if (!name.trim()) throw new Error('Event name required')
      const payload: Record<string, any> = {
        name: name.trim(),
        event_type: eventType,
        start_date: startDate || null,
        end_date: endDate || null,
        team_id: teamId || null,
        course_id: courseId || null,
      }
      const { error: insErr } = await supabase.from('events').insert(payload)
      if (insErr) throw insErr
      setName(''); setStartDate(''); setEndDate(''); setTeamId(''); setCourseId('')
      await load()
    } catch (err: any) {
      setError(err.message ?? 'Failed to create event.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1>Events</h1>
        <div className="flex gap-2">
          <Link href="/leaderboard" className="btn-on-light-outline">Leaderboard</Link>
          <Link href="/rounds" className="btn-on-light-outline">Rounds</Link>
        </div>
      </div>

      {/* Create */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Create Event</div>
        </div>
        <form onSubmit={createEvent} className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label className="label">Name</label>
            <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="HCU Fall Invite" />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="select" value={eventType} onChange={e=>setEventType(e.target.value as any)}>
              <option>TOURNAMENT</option>
              <option>QUALIFYING</option>
              <option>PRACTICE</option>
            </select>
          </div>
          <div>
            <label className="label">Start</label>
            <input className="input" type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="label">End</label>
            <input className="input" type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Host Team (optional)</label>
            <select className="select" value={teamId} onChange={e=>setTeamId(e.target.value)}>
              <option value="">— none —</option>
              {teams.map(t=> <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Course (optional)</label>
            <select className="select" value={courseId} onChange={e=>setCourseId(e.target.value)}>
              <option value="">— none —</option>
              {courses.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-3 flex items-center justify-end">
            <button className="btn-on-light" type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create Event'}</button>
          </div>
        </form>
        {error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      </div>

      {/* List */}
      <div className="card">
        {loading ? 'Loading…' : events.length === 0 ? 'No events yet.' : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th><th>Type</th><th>Dates</th><th>Course</th><th>Team</th><th></th>
                </tr>
              </thead>
              <tbody>
                {events.map(e => (
                  <tr key={e.id}>
                    <td>{e.name}</td>
                    <td>{e.event_type ?? '—'}</td>
                    <td>
                      {(e.start_date ?? '—')} — {(e.end_date ?? '—')}
                    </td>
                    <td>{e.course_name ?? '—'}</td>
                    <td>{e.team_name ?? '—'}</td>
                    <td className="text-right">
                      <Link href={`/events/${e.id}`} className="btn-on-light-outline">Open</Link>
                    </td>
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

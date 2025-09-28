'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Team = { id: string; name: string }
type Course = { id: string; name: string; city: string | null; state: string | null }
type Tee = { id: string; tee_name: string }

export default function NewEventPage() {
  const router = useRouter()

  const [teams, setTeams] = useState<Team[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [tees, setTees] = useState<Tee[]>([])

  const [teamId, setTeamId] = useState<string>('')
  const [courseId, setCourseId] = useState<string>('')
  const [teeId, setTeeId] = useState<string>('')

  const [name, setName] = useState('')
  const [type, setType] = useState<'qualifying'|'tournament'|'practice'|'other'>('qualifying')
  const [status, setStatus] = useState<'draft'|'live'|'completed'>('live')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  const [err, setErr] = useState<string|null>(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setErr(null)
    // Teams current user can see (RLS will limit)
    const { data: t, error: et } = await supabase
      .from('teams').select('id,name').order('name')
    if (!et && t) {
      setTeams(t as Team[])
      if (t.length === 1) setTeamId((t[0] as any).id)
    } else if (et) setErr(et.message)

    // Courses (open list)
    const { data: c, error: ec } = await supabase
      .from('courses').select('id,name,city,state').order('name')
    if (!ec && c) setCourses(c as Course[])
    else if (ec) setErr(ec.message)
  }

  useEffect(() => { load() }, [])

  // Load tees when course changes
  useEffect(() => {
    (async () => {
      setTees([]); setTeeId('')
      if (!courseId) return
      const { data, error } = await supabase
        .from('course_tees')
        .select('id,tee_name')
        .eq('course_id', courseId)
        .order('tee_name')
      if (!error && data) setTees(data as Tee[])
    })()
  }, [courseId])

  const canSave = useMemo(() =>
    teamId && name.trim() && type && status && startDate && courseId, [teamId, name, type, status, startDate, courseId])

  const save = async () => {
    if (!canSave) return
    setSaving(true); setErr(null)
    try {
      const payload = {
        team_id: teamId,
        name: name.trim(),
        type,
        status,
        course_id: courseId,
        course_tee_id: teeId || null,
        start_date: startDate,
        end_date: endDate || startDate,
      }
      const { data, error } = await supabase
        .from('events')
        .insert(payload)
        .select('id')
        .single()
      if (error) throw error
      router.push(`/events/${(data as any).id}/manage`)
    } catch (e:any) {
      setErr(e.message ?? 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">New Event</h1>
      {err && <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{err}</div>}

      <div className="grid gap-3 rounded border bg-white p-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-gray-600">Team</label>
          <select className="w-full rounded border px-2 py-1" value={teamId} onChange={e=>setTeamId(e.target.value)}>
            <option value="">Select team…</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600">Name</label>
          <input className="w-full rounded border px-2 py-1" value={name} onChange={e=>setName(e.target.value)} placeholder="Team Qualifying #1"/>
        </div>

        <div>
          <label className="block text-xs text-gray-600">Type</label>
          <select className="w-full rounded border px-2 py-1" value={type} onChange={e=>setType(e.target.value as any)}>
            <option value="qualifying">Qualifying</option>
            <option value="tournament">Tournament</option>
            <option value="practice">Practice</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600">Status</label>
          <select className="w-full rounded border px-2 py-1" value={status} onChange={e=>setStatus(e.target.value as any)}>
            <option value="draft">Draft</option>
            <option value="live">Live</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-600">Start date</label>
          <input type="date" className="w-full rounded border px-2 py-1" value={startDate} onChange={e=>setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-600">End date</label>
          <input type="date" className="w-full rounded border px-2 py-1" value={endDate} onChange={e=>setEndDate(e.target.value)} />
        </div>

        <div>
          <label className="block text-xs text-gray-600">Course</label>
          <select className="w-full rounded border px-2 py-1" value={courseId} onChange={e=>setCourseId(e.target.value)}>
            <option value="">Select course…</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}{[c.city, c.state].filter(Boolean).length ? ` — ${[c.city, c.state].filter(Boolean).join(', ')}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600">Tee (optional)</label>
          <select className="w-full rounded border px-2 py-1" value={teeId} onChange={e=>setTeeId(e.target.value)}>
            <option value="">(none)</option>
            {tees.map(t => <option key={t.id} value={t.id}>{t.tee_name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={!canSave || saving}
          className="rounded bg-[#0033A0] px-4 py-2 text-white disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create Event'}
        </button>
      </div>
    </div>
  )
}

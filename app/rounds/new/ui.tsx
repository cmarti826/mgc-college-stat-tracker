'use client'
import { useState, useMemo } from 'react'
import { getSupabaseBrowser } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

type Option = { id: string; name: string; course_id?: string }

export default function NewRoundForm({ courses, tees, teams }: { courses: Option[]; tees: Option[]; teams: Option[] }) {
  const supabase = getSupabaseBrowser()
  const router = useRouter()
  const [teamId, setTeamId] = useState(teams[0]?.id ?? '')
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '')
  const teesForCourse = useMemo(() => tees.filter(t => t.course_id === courseId), [tees, courseId])
  const [teeId, setTeeId] = useState<string>('')
  const [type, setType] = useState<'tournament'|'qualifying'|'practice'>('practice')
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [status, setStatus] = useState<'scheduled'|'in_progress'|'final'>('scheduled')
  const [msg, setMsg] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const { data, error } = await supabase.from('rounds').insert({
      team_id: teamId, type, name: name || null,
      course_id: courseId, tee_set_id: teeId,
      date, start_time: time || null, status
    }).select('id').single()
    if (error) { setMsg(error.message); return }
    router.push(`/rounds/${data!.id}/score`)
  }

  return (
    <div className="card max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Create Round</h1>
      <form onSubmit={submit} className="space-y-3">
        <div><div className="label">Team</div>
          <select className="input" value={teamId} onChange={e=>setTeamId(e.target.value)}>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div><div className="label">Course</div>
          <select className="input" value={courseId} onChange={e=>setCourseId(e.target.value)}>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div><div className="label">Tee Set</div>
          <select className="input" value={teeId} onChange={e=>setTeeId(e.target.value)}>
            <option value="">Select tee</option>
            {teesForCourse.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><div className="label">Type</div>
            <select className="input" value={type} onChange={e=>setType(e.target.value as any)}>
              <option value="tournament">Tournament</option>
              <option value="qualifying">Qualifying</option>
              <option value="practice">Practice</option>
            </select>
          </div>
          <div><div className="label">Status</div>
            <select className="input" value={status} onChange={e=>setStatus(e.target.value as any)}>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="final">Final</option>
            </select>
          </div>
        </div>
        <div><div className="label">Name (optional)</div>
          <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Event name" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><div className="label">Date</div><input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} required /></div>
          <div><div className="label">Start Time</div><input className="input" type="time" value={time} onChange={e=>setTime(e.target.value)} /></div>
        </div>
        <button className="btn btn-primary" type="submit">Create</button>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
      </form>
      <p className="text-sm text-gray-600">Note: Only coaches/admins can create rounds (RLS enforced).</p>
    </div>
  )
}

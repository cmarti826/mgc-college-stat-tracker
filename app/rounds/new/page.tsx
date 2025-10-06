'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

type Course = { id: string; name: string }
type TeeSet = { id: string; name: string; course_id: string }

const ROUND_TYPES = ['PRACTICE', 'QUALIFYING', 'TOURNAMENT'] as const
type RoundType = typeof ROUND_TYPES[number]

export default function NewRoundPage() {
  const router = useRouter()
  const supabase = useMemo(() => supabaseBrowser(), [])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [courses, setCourses] = useState<Course[]>([])
  const [tees, setTees] = useState<TeeSet[]>([])

  const [courseId, setCourseId] = useState<string>('')
  const [teeSetId, setTeeSetId] = useState<string>('')
  const [roundDate, setRoundDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [roundType, setRoundType] = useState<RoundType>('PRACTICE')
  const [notes, setNotes] = useState<string>('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const [{ data: courseRows, error: cErr }, { data: teeRows, error: tErr }] = await Promise.all([
        supabase.from('courses').select('id,name').order('name', { ascending: true }),
        supabase.from('tee_sets').select('id,name,course_id').order('name', { ascending: true }),
      ])
      if (cErr) { alert(`Error loading courses: ${cErr.message}`); return }
      if (tErr) { alert(`Error loading tee sets: ${tErr.message}`); return }

      if (!alive) return
      setCourses(courseRows ?? [])
      setTees(teeRows ?? [])
      if ((courseRows?.length ?? 0) > 0) setCourseId(courseRows![0].id)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [router, supabase])

  const filteredTees = tees.filter(t => t.course_id === courseId)

  useEffect(() => {
    setTeeSetId(prev => (filteredTees.find(t => t.id === prev) ? prev : (filteredTees[0]?.id ?? '')))
  }, [filteredTees])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!courseId || !teeSetId) { alert('Select a course and tee set.'); return }
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('You must be signed in.')

      const { data, error } = await supabase
        .from('rounds')
        .insert({
          player_id: user.id,             // also auto-filled by DB trigger if omitted
          course_id: courseId,
          tee_set_id: teeSetId,
          round_date: roundDate,
          round_type: roundType,
          notes: notes || null,
        })
        .select('id')
        .single()

      if (error) throw error
      router.replace(`/rounds/${data.id}/edit`)
    } catch (err: any) {
      console.error(err); alert(err.message ?? 'Failed to create round.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-semibold mb-4">New Round</h1>
        <div className="animate-pulse h-24 rounded-xl bg-gray-200" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold mb-6">New Round</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">Course</label>
          <select className="w-full rounded-xl border p-2" value={courseId} onChange={e => setCourseId(e.target.value)}>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tee Set</label>
          <select className="w-full rounded-xl border p-2" value={teeSetId} onChange={e => setTeeSetId(e.target.value)}>
            {filteredTees.length === 0
              ? <option value="">No tees for this course</option>
              : filteredTees.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
            }
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input type="date" className="w-full rounded-xl border p-2" value={roundDate} onChange={e => setRoundDate(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select className="w-full rounded-xl border p-2" value={roundType} onChange={e => setRoundType(e.target.value as any)}>
              {ROUND_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea className="w-full rounded-xl border p-2" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
        </div>

        <button type="submit" disabled={submitting} className="rounded-2xl px-4 py-2 border shadow disabled:opacity-60">
          {submitting ? 'Creating…' : 'Create Round'}
        </button>
      </form>
    </div>
  )
}

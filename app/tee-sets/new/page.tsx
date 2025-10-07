'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

type Course = { id: string; name: string }
type HoleYard = { hole_number: number; yardage: number | '' }

export default function NewTeeSetPage() {
  const supabase = useMemo(() => supabaseBrowser(), [])
  const router = useRouter()

  const [courses, setCourses] = useState<Course[]>([])
  const [courseId, setCourseId] = useState<string>('')
  const [name, setName] = useState('Gold')

  const [yards, setYards] = useState<HoleYard[]>(
    Array.from({ length: 18 }, (_, i) => ({ hole_number: i + 1, yardage: '' }))
  )
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const [{ data, error }] = await Promise.all([
        supabase.from('courses').select('id,name').order('name', { ascending: true }),
      ])
      if (error) { alert(error.message); return }
      if (!alive) return
      setCourses(data ?? [])
      if ((data?.length ?? 0) > 0) setCourseId(data![0].id)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [supabase])

  function setYard(i: number, v: string) {
    setYards(prev => {
      const copy = [...prev]
      const n = v === '' ? '' : Math.max(0, Number(v) || 0)
      copy[i] = { ...copy[i], yardage: n as any }
      return copy
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!courseId) { alert('Select a course.'); return }
    if (!name.trim()) { alert('Tee set name is required.'); return }

    const missing = yards.some(y => y.yardage === '')
    if (missing) { if (!confirm('Some yardages are blank. Continue?')) return }

    setSubmitting(true)
    try {
      // 1) create tee set
      const { data: tee, error: tErr } = await supabase
        .from('tee_sets')
        .insert({ course_id: courseId, name: name.trim() })
        .select('id')
        .single()
      if (tErr) throw tErr

      // 2) insert 18 tee_set_holes
      const rows = yards.map(y => ({
        tee_set_id: tee!.id,
        hole_number: y.hole_number,
        yardage: y.yardage === '' ? null : Number(y.yardage),
      }))

      const { error: yErr } = await supabase.from('tee_set_holes').insert(rows)
      if (yErr) throw yErr

      alert('Tee set created!')
      router.push('/rounds/new')
    } catch (err: any) {
      console.error(err); alert(err.message ?? 'Failed to create tee set.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold mb-2">New Tee Set</h1>
        <div className="animate-pulse h-24 rounded-xl bg-gray-200" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">New Tee Set</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Course</label>
            <select className="w-full rounded-xl border p-2" value={courseId} onChange={e=>setCourseId(e.target.value)}>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tee Name</label>
            <input className="w-full rounded-xl border p-2" value={name} onChange={e=>setName(e.target.value)} placeholder="Gold, Blue, White…" />
          </div>
        </div>

        <div className="rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Hole</th>
                <th className="p-2">Yardage</th>
              </tr>
            </thead>
            <tbody>
              {yards.map((y, i) => (
                <tr key={y.hole_number} className="odd:bg-white even:bg-gray-50">
                  <td className="p-2">{y.hole_number}</td>
                  <td className="p-2">
                    <input
                      type="number" min={0}
                      className="w-28 rounded-lg border p-1 text-center"
                      value={y.yardage}
                      onChange={e => setYard(i, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button type="submit" disabled={submitting} className="rounded-2xl px-4 py-2 border shadow disabled:opacity-60">
          {submitting ? 'Saving…' : 'Create Tee Set'}
        </button>
      </form>
    </div>
  )
}

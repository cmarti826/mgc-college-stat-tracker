'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

type Hole = { number: number; par: number }

export default function NewCoursePage() {
  const supabase = useMemo(() => supabaseBrowser(), [])
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')

  const [holes, setHoles] = useState<Hole[]>(
    Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: 4 }))
  )

  function setPar(i: number, v: number) {
    setHoles(prev => {
      const copy = [...prev]
      copy[i] = { ...copy[i], par: Math.max(3, Math.min(5, Number(v) || 4)) }
      return copy
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { alert('Course name is required.'); return }
    setSubmitting(true)
    try {
      // 1) create course
      const { data: course, error: cErr } = await supabase
        .from('courses')
        .insert({
          name: name.trim(),
          city: city || null,
          state: state || null,
        })
        .select('id')
        .single()

      if (cErr) throw cErr

      // 2) insert 18 holes (number, par)
      const rows = holes.map(h => ({
        course_id: course!.id,
        number: h.number, // NOTE: this table uses `number`
        par: h.par,
      }))

      const { error: hErr } = await supabase.from('holes').insert(rows)
      if (hErr) throw hErr

      alert('Course created!')
      router.push('/tee-sets/new') // take user straight to tee set creation
    } catch (err: any) {
      console.error(err); alert(err.message ?? 'Failed to create course.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">New Course</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input className="w-full rounded-xl border p-2" value={name} onChange={e=>setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">City</label>
            <input className="w-full rounded-xl border p-2" value={city} onChange={e=>setCity(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">State</label>
            <input className="w-full rounded-xl border p-2" value={state} onChange={e=>setState(e.target.value)} />
          </div>
        </div>

        <div className="rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Hole</th>
                <th className="p-2">Par</th>
              </tr>
            </thead>
            <tbody>
              {holes.map((h, i) => (
                <tr key={h.number} className="odd:bg-white even:bg-gray-50">
                  <td className="p-2">{h.number}</td>
                  <td className="p-2">
                    <input
                      type="number" min={3} max={5}
                      className="w-20 rounded-lg border p-1 text-center"
                      value={h.par}
                      onChange={e => setPar(i, Number(e.target.value))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button type="submit" disabled={submitting} className="rounded-2xl px-4 py-2 border shadow disabled:opacity-60">
          {submitting ? 'Saving…' : 'Create Course'}
        </button>
      </form>
    </div>
  )
}

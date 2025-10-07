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
  const [name, setName] = useState('Blue')

  const [yards, setYards] = useState<HoleYard[]>(
    Array.from({ length: 18 }, (_, i) => ({ hole_number: i + 1, yardage: '' }))
  )

  const [coursePar, setCoursePar] = useState<number>(72)
  const [rating, setRating] = useState<string>('') // string for input control
  const [slope, setSlope]   = useState<string>('')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [existingTeeSetId, setExistingTeeSetId] = useState<string | null>(null)

  // Load courses
  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('courses')
        .select('id,name')
        .order('name', { ascending: true })
      if (error) { alert(error.message); return }
      if (!alive) return
      setCourses(data ?? [])
      if ((data?.length ?? 0) > 0) setCourseId(data![0].id)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [supabase])

  // Compute course par whenever courseId changes
  useEffect(() => {
    if (!courseId) return
    let alive = true
    ;(async () => {
      const { data, error } = await supabase
        .from('holes')
        .select('par')
        .eq('course_id', courseId)
      if (error) { alert(`Could not load course holes: ${error.message}`); return }
      if (!alive) return
      const totalPar = (data ?? []).reduce((sum, r) => sum + Number(r.par || 0), 0)
      setCoursePar(totalPar || 72)
    })()
    return () => { alive = false }
  }, [courseId, supabase])

  // When course or name changes, check if tee set exists; load par/rating/slope + yardages
  useEffect(() => {
    if (!courseId || !name.trim()) return
    let alive = true
    ;(async () => {
      const { data: tee, error: tErr } = await supabase
        .from('tee_sets')
        .select('id, par, rating, slope')
        .eq('course_id', courseId)
        .eq('name', name.trim())
        .maybeSingle()
      if (tErr) { console.warn(tErr.message) }
      if (!alive) return

      if (tee?.id) {
        setExistingTeeSetId(tee.id)
        if (tee.par) setCoursePar(tee.par)
        setRating(tee.rating == null ? '' : String(tee.rating))
        setSlope( tee.slope  == null ? '' : String(tee.slope))

        const { data: ys, error: yErr } = await supabase
          .from('tee_set_holes')
          .select('hole_number, yardage')
          .eq('tee_set_id', tee.id)
          .order('hole_number', { ascending: true })
        if (yErr) { console.warn(yErr.message) }
        if (!alive) return
        if (ys && ys.length) {
          setYards(
            Array.from({ length: 18 }, (_, i) => {
              const hole = i + 1
              const found = ys.find(row => row.hole_number === hole)
              return { hole_number: hole, yardage: (found?.yardage ?? '') as any }
            })
          )
        }
      } else {
        setExistingTeeSetId(null)
        setRating('')
        setSlope('')
        setYards(Array.from({ length: 18 }, (_, i) => ({ hole_number: i + 1, yardage: '' })))
      }
    })()
    return () => { alive = false }
  }, [courseId, name, supabase])

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

    // Validate rating/slope softly (DB has constraints if you added them)
    const ratingNum = rating === '' ? null : Number(rating)
    const slopeNum  = slope  === '' ? null : Number(slope)
    if (ratingNum != null && (ratingNum < 55 || ratingNum > 80)) { alert('Rating should be between 55.0 and 80.0'); return }
    if (slopeNum  != null && (slopeNum  < 55 || slopeNum  > 155)) { alert('Slope should be between 55 and 155'); return }

    const missing = yards.some(y => y.yardage === '')
    if (missing && !confirm('Some yardages are blank. Continue?')) return

    setSubmitting(true)
    try {
      // Create or reuse existing tee set
      let teeSetId = existingTeeSetId
      if (!teeSetId) {
        const { data: tee, error: tErr } = await supabase
          .from('tee_sets')
          .insert({ course_id: courseId, name: name.trim(), par: coursePar, rating: ratingNum, slope: slopeNum })
          .select('id')
          .single()
        if (tErr) {
          if ((tErr as any).code === '23505') {
            const { data: found } = await supabase
              .from('tee_sets')
              .select('id')
              .eq('course_id', courseId)
              .eq('name', name.trim())
              .single()
            teeSetId = found?.id ?? null
          } else {
            throw tErr
          }
        } else {
          teeSetId = tee?.id ?? null
        }
      } else {
        await supabase
          .from('tee_sets')
          .update({ par: coursePar, rating: ratingNum, slope: slopeNum })
          .eq('id', teeSetId)
      }

      if (!teeSetId) throw new Error('Could not determine tee set ID.')

      // Upsert 18 yardages
      const rows = yards.map(y => ({
        tee_set_id: teeSetId!,
        hole_number: y.hole_number,
        yardage: y.yardage === '' ? null : Number(y.yardage),
      }))

      const { error: yErr } = await supabase
        .from('tee_set_holes')
        .upsert(rows, { onConflict: 'tee_set_id,hole_number' })
      if (yErr) throw yErr

      alert(existingTeeSetId ? 'Tee set updated!' : 'Tee set created!')
      router.push('/rounds/new')
    } catch (err: any) {
      console.error(err); alert(err.message ?? 'Failed to save tee set.')
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
        <div className="grid md:grid-cols-5 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Course</label>
            <select className="w-full rounded-xl border p-2" value={courseId} onChange={e=>setCourseId(e.target.value)}>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium mb-1">Tee Name</label>
            <input className="w-full rounded-xl border p-2" value={name} onChange={e=>setName(e.target.value)} placeholder="Gold, Blue, White…" />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium mb-1">Par (auto)</label>
            <input className="w-full rounded-xl border p-2 bg-gray-50" value={coursePar} readOnly />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium mb-1">Rating</label>
            <input className="w-full rounded-xl border p-2" type="number" step="0.1" min="55" max="80" value={rating} onChange={e=>setRating(e.target.value)} />
          </div>
        </div>

        <div className="grid md:grid-cols-5 gap-3">
          <div className="md:col-span-1 md:col-start-5">
            <label className="block text-sm font-medium mb-1">Slope</label>
            <input className="w-full rounded-xl border p-2" type="number" step="1" min="55" max="155" value={slope} onChange={e=>setSlope(e.target.value)} />
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
          {submitting ? (existingTeeSetId ? 'Updating…' : 'Saving…') : (existingTeeSetId ? 'Update Tee Set' : 'Create Tee Set')}
        </button>
      </form>
    </div>
  )
}

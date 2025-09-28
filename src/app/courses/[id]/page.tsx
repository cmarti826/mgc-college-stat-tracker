'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Tee = {
  id: string
  tee_name: string | null
  color: string | null
  course_rating: number | null
  slope_rating: number | null
  total_yardage: number | null
}

export default function CourseEditorPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const courseId = id

  // course info
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [stateCode, setStateCode] = useState('')
  const [deletedAt, setDeletedAt] = useState<string | null>(null)

  // holes (par per hole)
  const [pars, setPars] = useState<Record<number, string>>({})

  // tees
  const [tees, setTees] = useState<Tee[]>([])
  const [teeId, setTeeId] = useState<string>('')
  const [teeBasics, setTeeBasics] = useState<Partial<Tee>>({})
  const [teeYards, setTeeYards] = useState<Record<number, string>>({})

  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  // Load
  useEffect(() => {
    ;(async () => {
      setErr(null); setInfo(null)

      // course
      const { data: c, error: ec } = await supabase
        .from('courses')
        .select('id,name,city,state,deleted_at')
        .eq('id', courseId)
        .single()
      if (ec) { setErr(ec.message); return }
      setName(c.name ?? '')
      setCity(c.city ?? '')
      setStateCode(c.state ?? '')
      setDeletedAt(c.deleted_at ?? null)

      // holes
      const { data: ch } = await supabase
        .from('course_holes')
        .select('hole_number, par')
        .eq('course_id', courseId)
        .order('hole_number')
      const pmap: Record<number, string> = {}
      if (ch?.length) {
        for (const row of ch) pmap[(row as any).hole_number] = String((row as any).par ?? '')
      } else {
        for (let n = 1; n <= 18; n++) pmap[n] = ''
      }
      setPars(pmap)

      // tees
      const { data: t } = await supabase
        .from('course_tees')
        .select('id, tee_name, color, course_rating, slope_rating, total_yardage')
        .eq('course_id', courseId)
        .order('tee_name', { ascending: true })
      const list = (t ?? []) as Tee[]
      setTees(list)
      const first = list[0]?.id ?? ''
      setTeeId(first)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  // Load selected tee basics + yards
  useEffect(() => {
    ;(async () => {
      setErr(null); setInfo(null)
      if (!teeId) { setTeeBasics({}); setTeeYards({}); return }

      const { data: tb } = await supabase
        .from('course_tees')
        .select('id, tee_name, color, course_rating, slope_rating, total_yardage')
        .eq('id', teeId)
        .maybeSingle()
      if (tb) setTeeBasics(tb as any)

      const { data: th } = await supabase
        .from('course_tee_holes')
        .select('hole_number, yardage')
        .eq('course_tee_id', teeId)
        .order('hole_number')
      const ymap: Record<number, string> = {}
      if (th?.length) {
        for (const row of th) ymap[(row as any).hole_number] = String((row as any).yardage ?? '')
      } else {
        for (let n = 1; n <= 18; n++) ymap[n] = ''
      }
      setTeeYards(ymap)
    })()
  }, [teeId])

  // Computed tee total yardage
  const teeTotal = useMemo(() => {
    const vals = Object.values(teeYards)
      .map(v => Number(v))
      .filter(v => Number.isFinite(v)) as number[]
    if (!vals.length) return null
    return vals.reduce((a, b) => a + b, 0)
  }, [teeYards])

  // ---- Handlers ----
  const archiveCourse = async () => {
    if (!confirm('Archive this course? It will be hidden from lists but not removed.')) return
    setSaving(true); setErr(null); setInfo(null)
    const { error } = await supabase.rpc('archive_course', { p_course: courseId })
    if (error) { setErr(error.message); setSaving(false); return }
    setInfo('Course archived.')
    router.push('/courses')
  }

  const savePars = async () => {
    setSaving(true); setErr(null); setInfo(null)
    try {
      const rows = Array.from({ length: 18 }, (_, i) => i + 1).map(n => ({
        course_id: courseId,
        hole_number: n,
        par: Number(pars[n] ?? 4) || 4, // default to 4 to satisfy NOT NULL
      }))
      const { error } = await supabase
        .from('course_holes')
        .upsert(rows, { onConflict: 'course_id,hole_number' })
      if (error) throw error
      setInfo('Hole pars saved.')
    } catch (e: any) {
      setErr(e.message ?? 'Failed to save pars')
    } finally {
      setSaving(false)
    }
  }

  const addTee = async () => {
    setSaving(true); setErr(null); setInfo(null)
    try {
      const { data, error } = await supabase
        .from('course_tees')
        .insert({ course_id: courseId, tee_name: 'Blue', color: 'blue' })
        .select('id')
        .single()
      if (error) throw error
      setTees(prev => [...prev, { id: data!.id, tee_name: 'Blue', color: 'blue', course_rating: null, slope_rating: null, total_yardage: null }])
      setTeeId(data!.id)
      // clear yards
      const blank: Record<number, string> = {}; for (let n=1;n<=18;n++) blank[n]=''
      setTeeYards(blank)
      setInfo('Tee created.')
    } catch (e: any) {
      setErr(e.message ?? 'Failed to add tee')
    } finally {
      setSaving(false)
    }
  }

  const saveTeeBasics = async () => {
    if (!teeId) return
    setSaving(true); setErr(null); setInfo(null)
    try {
      const payload: Partial<Tee> = {
        tee_name: (teeBasics.tee_name ?? '') as any,
        color: (teeBasics.color ?? '') as any,
        course_rating: teeBasics.course_rating ?? null,
        slope_rating: teeBasics.slope_rating ?? null,
        total_yardage: teeTotal ?? teeBasics.total_yardage ?? null,
      }
      const { error } = await supabase.from('course_tees').update(payload).eq('id', teeId)
      if (error) throw error
      setTees(prev => prev.map(t => t.id === teeId ? { ...t, ...payload } as Tee : t))
      setInfo('Tee details saved.')
    } catch (e: any) {
      setErr(e.message ?? 'Failed to save tee')
    } finally {
      setSaving(false)
    }
  }

  const saveTeeYards = async () => {
    if (!teeId) return
    setSaving(true); setErr(null); setInfo(null)
    try {
      // Build rows only for numeric entries (skip blanks)
      const rows = Array.from({ length: 18 }, (_, i) => i + 1)
        .filter(n => teeYards[n] !== '' && Number.isFinite(Number(teeYards[n])))
        .map(n => ({
          course_tee_id: teeId,
          hole_number: n,
          yardage: Number(teeYards[n]),
        }))

      // Replace all existing tee holes for this tee: delete then insert
      const { error: ed } = await supabase
        .from('course_tee_holes')
        .delete()
        .eq('course_tee_id', teeId)
      if (ed) throw ed

      if (rows.length) {
        const { error: ei } = await supabase.from('course_tee_holes').insert(rows)
        if (ei) throw ei
      }

      // Update tee total
      const { error: eu } = await supabase
        .from('course_tees')
        .update({ total_yardage: teeTotal })
        .eq('id', teeId)
      if (eu) throw eu

      setInfo('Tee yardages saved.')
    } catch (e: any) {
      setErr(e.message ?? 'Failed to save tee yardages')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{name || 'Course'}</h1>
          <div className="text-sm text-gray-600">{[city, stateCode].filter(Boolean).join(', ')}</div>
          {deletedAt && <div className="mt-1 text-xs text-red-600">Archived on {new Date(deletedAt).toLocaleString()}</div>}
        </div>
        <div className="flex gap-2">
          <button onClick={archiveCourse} className="rounded bg-red-600 px-3 py-1.5 text-white">Archive Course</button>
        </div>
      </div>

      {/* Notices */}
      {err && <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{err}</div>}
      {info && <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">{info}</div>}

      {/* Hole PAR editor */}
      <div className="rounded border bg-white">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <h2 className="font-semibold">Hole Pars</h2>
          <button onClick={savePars} disabled={saving} className="rounded border px-3 py-1.5">Save Pars</button>
        </div>
        <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 md:grid-cols-6">
          {Array.from({ length: 18 }, (_, i) => i + 1).map(n => (
            <div key={n} className="rounded border p-2">
              <div className="text-xs text-gray-600">Hole {n}</div>
              <input
                type="number" min={3} max={5}
                className="mt-1 w-full rounded border px-2 py-1"
                value={pars[n] ?? ''}
                onChange={e => setPars(prev => ({ ...prev, [n]: e.target.value.replace(/[^0-9]/g, '') }))}
                placeholder="Par"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Tee selector & basics */}
      <div className="rounded border bg-white">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Tees</h2>
            <select
              className="rounded border px-2 py-1"
              value={teeId}
              onChange={e => setTeeId(e.target.value)}
            >
              {tees.map(t => (
                <option key={t.id} value={t.id}>{t.tee_name || 'Tee'}</option>
              ))}
              {!tees.length && <option value="">No tees yet</option>}
            </select>
          </div>
          <button onClick={addTee} disabled={saving} className="rounded border px-3 py-1.5">+ Add Tee</button>
        </div>

        {teeId ? (
          <div className="space-y-3 p-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Tee Name">
                <input
                  className="w-full rounded border px-2 py-1"
                  value={teeBasics.tee_name ?? ''}
                  onChange={e => setTeeBasics(p => ({ ...p, tee_name: e.target.value }))}
                />
              </Field>
              <Field label="Color (name or hex)">
                <input
                  className="w-full rounded border px-2 py-1"
                  placeholder="blue or #3366ff"
                  value={teeBasics.color ?? ''}
                  onChange={e => setTeeBasics(p => ({ ...p, color: e.target.value }))}
                />
              </Field>
              <Field label="Course Rating">
                <input
                  type="number" step="0.1"
                  className="w-full rounded border px-2 py-1"
                  value={teeBasics.course_rating ?? ''}
                  onChange={e => setTeeBasics(p => ({ ...p, course_rating: e.target.value === '' ? null : Number(e.target.value) }))}
                />
              </Field>
              <Field label="Slope Rating">
                <input
                  type="number" step="1"
                  className="w-full rounded border px-2 py-1"
                  value={teeBasics.slope_rating ?? ''}
                  onChange={e => setTeeBasics(p => ({ ...p, slope_rating: e.target.value === '' ? null : Number(e.target.value) }))}
                />
              </Field>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                <span className="font-medium">Computed Yardage:</span>{' '}
                {teeTotal ? `${teeTotal.toLocaleString()} yds` : '—'}
              </div>
              <button onClick={saveTeeBasics} disabled={saving} className="rounded border px-3 py-1.5">Save Tee</button>
            </div>
          </div>
        ) : (
          <div className="p-3 text-sm text-gray-600">Add a tee to edit details and yardages.</div>
        )}
      </div>

      {/* Tee yardages */}
      <div className="rounded border bg-white">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <h2 className="font-semibold">Tee Yardages</h2>
          <button onClick={saveTeeYards} disabled={saving || !teeId} className="rounded border px-3 py-1.5">
            Save Yardages
          </button>
        </div>
        {teeId ? (
          <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 md:grid-cols-6">
            {Array.from({ length: 18 }, (_, i) => i + 1).map(n => (
              <div key={n} className="rounded border p-2">
                <div className="text-xs text-gray-600">Hole {n}</div>
                <input
                  type="number" min={0}
                  className="mt-1 w-full rounded border px-2 py-1"
                  value={teeYards[n] ?? ''}
                  onChange={e => setTeeYards(prev => ({ ...prev, [n]: e.target.value.replace(/[^0-9]/g, '') }))}
                  placeholder="Yards"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 text-sm text-gray-600">Select a tee to edit yardages.</div>
        )}
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

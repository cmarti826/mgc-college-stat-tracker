'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'

type HoleRow = {
  round_id: string
  hole_number: number
  strokes: number | null
  putts: number | null
  notes: string | null
}

export default function HoleScoringPage() {
  const { id, hole } = useParams<{ id: string; hole: string }>()
  const holeNo = useMemo(() => Number(hole ?? 1), [hole])
  const supabase = createClient()
  const router = useRouter()

  const [par, setPar] = useState<number | null>(null)
  const [row, setRow] = useState<HoleRow>({ round_id: id, hole_number: holeNo, strokes: null, putts: null, notes: null })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Load par and any existing hole row
  useEffect(() => {
    let isActive = true
    ;(async () => {
      setErr(null)

      // 1) load round -> event_id -> course_id
      const { data: r, error: rErr } = await supabase
        .from('rounds')
        .select('id, event_id')
        .eq('id', id)
        .maybeSingle()
      if (rErr) return setErr(rErr.message)
      if (!r) return setErr('Round not found.')

      const { data: e, error: eErr } = await supabase
        .from('events')
        .select('id, course_id, name')
        .eq('id', r.event_id)
        .maybeSingle()
      if (eErr) return setErr(eErr.message)

      // 2) par for this hole (if course layout present)
      if (e?.course_id) {
        const { data: ch, error: chErr } = await supabase
          .from('course_holes')
          .select('par')
          .eq('course_id', e.course_id)
          .eq('hole_number', holeNo)
          .maybeSingle()
        if (chErr) setErr(chErr.message)
        if (ch?.par != null) setPar(ch.par)
      }

      // 3) current hole row
      const { data: rh, error: rhErr } = await supabase
        .from('round_holes')
        .select('round_id, hole_number, strokes, putts, notes')
        .eq('round_id', id)
        .eq('hole_number', holeNo)
        .maybeSingle()
      if (rhErr) setErr(rhErr.message)
      if (isActive && rh) setRow(rh)
      if (isActive && !rh) setRow({ round_id: id, hole_number: holeNo, strokes: null, putts: null, notes: null })
    })()
    return () => { isActive = false }
  }, [id, holeNo, supabase])

  const save = async () => {
    setSaving(true); setErr(null)
    const { error } = await supabase
      .from('round_holes')
      .upsert(
        { round_id: id, hole_number: holeNo, strokes: row.strokes, putts: row.putts, notes: row.notes },
        { onConflict: 'round_id,hole_number' }
      )
    if (error) setErr(error.message)
    setSaving(false)
  }

  const go = (n: number) => router.push(`/rounds/${id}/holes/${n}`)

  return (
    <div className="mx-auto max-w-xl p-4 space-y-4">
      <h1 className="text-xl font-semibold">
        Hole {holeNo} {par != null && <span className="text-gray-500 text-base">• Par {par}</span>}
      </h1>

      {err && <div className="rounded border border-red-300 bg-red-50 p-2 text-red-700 text-sm">Error: {err}</div>}

      <div className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-sm">Strokes</span>
          <input
            type="number"
            className="w-32 rounded border p-2"
            value={row.strokes ?? ''}
            onChange={(e) => setRow(r => ({ ...r, strokes: e.target.value === '' ? null : Number(e.target.value) }))}
            min={1}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm">Putts</span>
          <input
            type="number"
            className="w-32 rounded border p-2"
            value={row.putts ?? ''}
            onChange={(e) => setRow(r => ({ ...r, putts: e.target.value === '' ? null : Number(e.target.value) }))}
            min={0}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm">Notes</span>
          <textarea
            className="rounded border p-2"
            rows={3}
            value={row.notes ?? ''}
            onChange={(e) => setRow(r => ({ ...r, notes: e.target.value }))}
          />
        </label>

        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className="rounded border px-3 py-1">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <Link href={`/rounds/${id}`} className="rounded border px-3 py-1">Back to round</Link>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <button onClick={() => go(Math.max(1, holeNo - 1))} className="underline">← Prev hole</button>
        <button onClick={() => go(holeNo + 1)} className="underline">Next hole →</button>
      </div>
    </div>
  )
}

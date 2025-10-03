'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'

type RoundRow = { id: string; course_id: string | null; course_tee_id: string | null }

type HolePar = { hole_number: number; par: number }
type HoleYdg = { hole_number: number; yardage: number | null }

type HoleStat = {
  round_id: string
  hole_number: number
  strokes: number | null
  putts: number | null
  penalties: number | null
  fairway_hit: boolean | null
  gir: boolean | null
}

export default function HoleEntryPage({ params }: { params: { id: string, hole: string } }) {
  const supabase = createClient()
  const holeNo = Number(params.hole)

  const [round, setRound] = useState<RoundRow | null>(null)
  const [parRow, setParRow] = useState<HolePar | null>(null)
  const [ydgRow, setYdgRow] = useState<HoleYdg | null>(null)
  const [stat, setStat] = useState<HoleStat | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true); setErr(null)

      // Round
      const { data: r, error: re } = await supabase
        .from('rounds')
        .select('id, course_id, course_tee_id')
        .eq('id', params.id)
        .single()
      if (re || !r) { setErr(re?.message || 'Round not found'); setLoading(false); return }
      setRound(r)

      // Existing stats
      const { data: s, error: se } = await supabase
        .from('round_holes')
        .select('round_id, hole_number, strokes, putts, penalties, fairway_hit, gir')
        .eq('round_id', r.id)
        .eq('hole_number', holeNo)
        .maybeSingle()
      if (se) console.error(se)
      if (s) setStat(s as HoleStat)
      else setStat({ round_id: r.id, hole_number: holeNo, strokes: null, putts: null, penalties: null, fairway_hit: null, gir: null })

      // Par & yardage context
      if (r.course_id) {
        const { data: ph } = await supabase
          .from('course_holes')
          .select('hole_number, par')
          .eq('course_id', r.course_id)
          .eq('hole_number', holeNo)
          .single()
        if (ph) setParRow(ph)
      }
      if (r.course_tee_id) {
        const { data: yh } = await supabase
          .from('course_tee_holes')
          .select('hole_number, yardage')
          .eq('course_tee_id', r.course_tee_id)
          .eq('hole_number', holeNo)
          .single()
        if (yh) setYdgRow(yh)
      }

      setLoading(false)
    }
    load()
  }, [params.id, holeNo, supabase])

  const title = useMemo(() => `Hole ${holeNo}${parRow ? ` • Par ${parRow.par}` : ''}${ydgRow?.yardage ? ` • ${ydgRow.yardage} yds` : ''}`, [holeNo, parRow, ydgRow])

  const save = async () => {
    if (!stat) return
    setSaving(true); setErr(null)
    const { error } = await supabase
      .from('round_holes')
      .upsert({
        round_id: stat.round_id,
        hole_number: stat.hole_number,
        strokes: stat.strokes,
        putts: stat.putts,
        penalties: stat.penalties,
        fairway_hit: stat.fairway_hit,
        gir: stat.gir,
      }, { onConflict: 'round_id,hole_number' })
    if (error) { console.error(error); setErr(error.message || 'Save failed') }
    setSaving(false)
  }

  if (loading) return <div className="p-4">Loading…</div>
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>
  if (!round || !stat) return <div className="p-4">Not found.</div>

  return (
    <div className="mx-auto max-w-3xl p-4 space-y-4">
      <h1 className="text-xl font-semibold">{title}</h1>

      <div className="rounded border bg-white p-3 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            Strokes
            <input type="number" className="mt-1 w-full rounded border p-2"
              value={stat.strokes ?? ''} onChange={e => setStat({ ...stat, strokes: numOrNull(e.target.value) })} />
          </label>
          <label className="text-sm">
            Putts
            <input type="number" className="mt-1 w-full rounded border p-2"
              value={stat.putts ?? ''} onChange={e => setStat({ ...stat, putts: numOrNull(e.target.value) })} />
          </label>
          <label className="text-sm">
            Penalties
            <input type="number" className="mt-1 w-full rounded border p-2"
              value={stat.penalties ?? ''} onChange={e => setStat({ ...stat, penalties: numOrNull(e.target.value) })} />
          </label>
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox"
              checked={!!stat.fairway_hit}
              onChange={e => setStat({ ...stat, fairway_hit: e.target.checked })} />
            Fairway hit
          </label>
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox"
              checked={!!stat.gir}
              onChange={e => setStat({ ...stat, gir: e.target.checked })} />
            GIR
          </label>
        </div>

        <div className="flex gap-2">
          <button onClick={save} disabled={saving}
            className="rounded bg-[#0033A0] px-3 py-2 text-white disabled:opacity-60">
            {saving ? 'Saving…' : 'Save hole'}
          </button>
        </div>
      </div>
    </div>
  )
}

function numOrNull(v: string) {
  if (v === '' || v === undefined || v === null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

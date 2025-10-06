'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

type Totals = {
  round_id: string
  player_id: string | null
  course_id: string | null
  tee_set_id: string | null
  round_date: string
  round_type: 'PRACTICE' | 'QUALIFYING' | 'TOURNAMENT'
  holes_entered: number
  strokes_total: number
  putts_total: number
  fir_hits: number
  fir_opps: number
  gir_hits: number
  gir_opps: number
  updown_opps: number
  updowns_made: number
  sandsave_opps: number
  sandsaves_made: number
  penalties_total: number
  fir_pct: number
  gir_pct: number
  updown_pct: number
  sandsave_pct: number
}

type Hole = {
  hole_number: number
  par: number
  yardage: number | null
  strokes: number
  putts: number
  fairway_hit: boolean | null
  gir: boolean | null
  up_down_attempt: boolean
  up_down_made: boolean
  sand_save_attempt: boolean
  sand_save_made: boolean
  penalty_strokes: number
}

export default function RoundDetailPage() {
  const params = useParams<{ id: string }>()
  const roundId = params.id
  const router = useRouter()
  const supabase = useMemo(() => supabaseBrowser(), [])

  const [loading, setLoading] = useState(true)
  const [totals, setTotals] = useState<Totals | null>(null)
  const [holes, setHoles] = useState<Hole[]>([])
  const [courseName, setCourseName] = useState<string>('')
  const [teeName, setTeeName] = useState<string>('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const [{ data: t, error: tErr }, { data: hs, error: hErr }, { data: r, error: rErr }] = await Promise.all([
        supabase.from('v_round_percentages').select('*').eq('round_id', roundId).single(),
        supabase.from('round_holes').select('*').eq('round_id', roundId).order('hole_number', { ascending: true }),
        supabase.from('rounds').select('course:courses(name), tee:tee_sets(name)').eq('id', roundId).single(),
      ])
      if (tErr) { alert(`Totals error: ${tErr.message}`); return }
      if (hErr) { alert(`Holes error: ${hErr.message}`); return }
      if (rErr) { /* ok */ }

      if (!alive) return
      setTotals(t as any)
      setHoles((hs ?? []) as any)
      setCourseName(r?.course?.name ?? '')
      setTeeName(r?.tee?.name ?? '')
      setLoading(false)
    })()
    return () => { alive = false }
  }, [roundId, router, supabase])

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-3">Round</h1>
        <div className="animate-pulse h-24 rounded-xl bg-gray-200" />
      </div>
    )
  }

  if (!totals) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-3">Round</h1>
        <p className="text-sm">No data yet. Add holes:</p>
        <button onClick={() => router.push(`/rounds/${roundId}/edit`)} className="mt-2 rounded-2xl px-4 py-2 border">
          Edit Round
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Round • {totals.round_date}</h1>
        <div className="text-sm opacity-75">
          {totals.round_type}{courseName ? ` • ${courseName}` : ''}{teeName ? ` • ${teeName}` : ''}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border p-4 shadow-sm">
          <h2 className="font-semibold mb-2">Totals</h2>
          <ul className="text-sm space-y-1">
            <li>Holes: {totals.holes_entered}</li>
            <li>Strokes: {totals.strokes_total}</li>
            <li>Putts: {totals.putts_total}</li>
            <li>Penalties: {totals.penalties_total}</li>
          </ul>
        </div>

        <div className="rounded-2xl border p-4 shadow-sm">
          <h2 className="font-semibold mb-2">Percentages</h2>
          <ul className="text-sm space-y-1">
            <li>FIR: {totals.fir_hits}/{totals.fir_opps} ({totals.fir_pct}%)</li>
            <li>GIR: {totals.gir_hits}/{totals.gir_opps} ({totals.gir_pct}%)</li>
            <li>Up & Down: {totals.updowns_made}/{totals.updown_opps} ({totals.updown_pct}%)</li>
            <li>Sand Save: {totals.sandsaves_made}/{totals.sandsave_opps} ({totals.sandsave_pct}%)</li>
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Holes</h2>
          <button onClick={() => router.push(`/rounds/${roundId}/edit`)} className="rounded-2xl px-3 py-1.5 border">
            Edit
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Hole</th>
                <th className="p-2">Par</th>
                <th className="p-2">Yards</th>
                <th className="p-2">Strokes</th>
                <th className="p-2">Putts</th>
                <th className="p-2">FIR</th>
                <th className="p-2">GIR</th>
                <th className="p-2">U/D A</th>
                <th className="p-2">U/D M</th>
                <th className="p-2">Sand A</th>
                <th className="p-2">Sand M</th>
                <th className="p-2">Penalty</th>
              </tr>
            </thead>
            <tbody>
              {holes.map(h => (
                <tr key={h.hole_number} className="odd:bg-white even:bg-gray-50">
                  <td className="p-2">{h.hole_number}</td>
                  <td className="p-2 text-center">{h.par}</td>
                  <td className="p-2 text-center">{h.yardage ?? ''}</td>
                  <td className="p-2 text-center">{h.strokes}</td>
                  <td className="p-2 text-center">{h.putts}</td>
                  <td className="p-2 text-center">{h.par === 3 ? '-' : (h.fairway_hit ? '✓' : '')}</td>
                  <td className="p-2 text-center">{h.gir ? '✓' : ''}</td>
                  <td className="p-2 text-center">{h.up_down_attempt ? '✓' : ''}</td>
                  <td className="p-2 text-center">{h.up_down_made ? '✓' : ''}</td>
                  <td className="p-2 text-center">{h.sand_save_attempt ? '✓' : ''}</td>
                  <td className="p-2 text-center">{h.sand_save_made ? '✓' : ''}</td>
                  <td className="p-2 text-center">{h.penalty_strokes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

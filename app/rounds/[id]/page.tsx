'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

type HoleRow = {
  hole_number: number
  par: number
  yardage: number | null
  strokes: number | null
  putts: number | null
  fairway_hit: boolean | null
  gir: boolean | null
  penalty_strokes: number
}

type SGBucket = 'OTT' | 'APP' | 'ARG' | 'PUTT'
type SGAgg = Record<SGBucket, number>

export default function RoundSummaryPage() {
  const params = useParams<{ id: string }>()
  const roundId = params.id
  const router = useRouter()
  const supabase = useMemo(() => supabaseBrowser(), [])

  const [loading, setLoading] = useState(true)
  const [round, setRound] = useState<any>(null)
  const [holes, setHoles] = useState<HoleRow[]>([])
  const [sgByBucket, setSgByBucket] = useState<SGAgg>({ OTT: 0, APP: 0, ARG: 0, PUTT: 0 })
  const [sgTotal, setSgTotal] = useState<number>(0)
  const [sgByHole, setSgByHole] = useState<Record<number, number>>({})
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      // Select ONLY columns guaranteed to exist
      const { data: r, error: rErr } = await supabase
        .from('rounds')
        .select(`
          id,
          created_at,
          round_type,
          course_id,
          tee_set_id,
          course:courses ( name ),
          tee:tee_sets ( name )
        `)
        .eq('id', roundId)
        .single()
      if (rErr) { alert(`Could not load round: ${rErr.message}`); return }
      if (!alive) return
      setRound(r)

      const { data: rh, error: hErr } = await supabase
        .from('round_holes')
        .select('*')
        .eq('round_id', roundId)
        .order('hole_number', { ascending: true })
      if (hErr) { alert(`Could not load hole stats: ${hErr.message}`); return }
      setHoles((rh ?? []).map(row => ({
        hole_number: row.hole_number,
        par: row.par,
        yardage: row.yardage,
        strokes: row.strokes,
        putts: row.putts,
        fairway_hit: row.fairway_hit,
        gir: row.gir,
        penalty_strokes: row.penalty_strokes ?? 0,
      })))

      const { data: sgRows, error: sgErr } = await supabase
        .from('v_shots_with_sg')
        .select('hole_number, sg_bucket, sg_value')
        .eq('round_id', roundId)
      if (sgErr) { console.warn('SG view error:', sgErr.message) }

      const agg: SGAgg = { OTT: 0, APP: 0, ARG: 0, PUTT: 0 }
      const byHole: Record<number, number> = {}
      ;(sgRows ?? []).forEach((row: any) => {
        const b = row.sg_bucket as SGBucket
        const v = Number(row.sg_value ?? 0)
        if (b in agg) agg[b] += v
        byHole[row.hole_number] = (byHole[row.hole_number] ?? 0) + v
      })
      setSgByBucket({
        OTT: round1(agg.OTT),
        APP: round1(agg.APP),
        ARG: round1(agg.ARG),
        PUTT: round1(agg.PUTT),
      })
      setSgTotal(round1(agg.OTT + agg.APP + agg.ARG + agg.PUTT))
      Object.keys(byHole).forEach(k => { byHole[Number(k)] = round2(byHole[Number(k)]) })
      setSgByHole(byHole)

      setLoading(false)
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId])

  function round1(n: number) { return Math.round(n * 10) / 10 }
  function round2(n: number) { return Math.round(n * 100) / 100 }

  const courseName = Array.isArray(round?.course) ? round.course[0]?.name : round?.course?.name
  const teeName = Array.isArray(round?.tee) ? round.tee[0]?.name : round?.tee?.name

  // Use created_at for the date display (safe column)
  const prettyDate = round?.created_at ? new Date(round.created_at).toLocaleDateString() : ''

  const totalPar = holes.reduce((s, h) => s + (Number(h.par) || 0), 0)
  const totalStrokes = holes.reduce((s, h) => s + (Number(h.strokes) || 0), 0)
  const totalPutts = holes.reduce((s, h) => s + (Number(h.putts) || 0), 0)
  const totalPens = holes.reduce((s, h) => s + (Number(h.penalty_strokes) || 0), 0)

  const scoreRel = totalStrokes && totalPar ? totalStrokes - totalPar : 0
  const scoreBadge = scoreRel === 0 ? 'E' : scoreRel > 0 ? `+${scoreRel}` : `${scoreRel}`

  const firAttempts = holes.filter(h => h.par !== 3).length
  const firHits = holes.filter(h => h.par !== 3 && h.fairway_hit === true).length
  const firPct = firAttempts ? Math.round((firHits / firAttempts) * 100) : 0

  const girHits = holes.filter(h => h.gir === true).length
  const girPct = holes.length ? Math.round((girHits / holes.length) * 100) : 0

  async function deleteRound() {
    if (!confirm('Delete this round? This cannot be undone.')) return
    try {
      setDeleting(true)
      await supabase.from('shots').delete().eq('round_id', roundId)
      await supabase.from('round_holes').delete().eq('round_id', roundId)
      const { error } = await supabase.from('rounds').delete().eq('id', roundId)
      if (error) throw error
      router.replace('/rounds')
    } catch (e: any) {
      alert(e.message ?? 'Failed to delete round')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="animate-pulse h-10 w-64 rounded bg-gray-200 mb-4" />
        <div className="animate-pulse h-24 rounded-2xl bg-gray-200 mb-4" />
        <div className="animate-pulse h-64 rounded-2xl bg-gray-200" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">
            {courseName || 'Round'} {teeName ? <span className="text-gray-500">• {teeName}</span> : null}
          </h1>
          <div className="text-sm text-gray-600">
            {prettyDate} {round?.round_type ? `• ${round.round_type}` : ''}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-xl border px-3 py-1.5"
            onClick={() => router.push(`/rounds/${roundId}/edit`)}
          >
            Edit Round
          </button>
          <button
            className="rounded-xl border px-3 py-1.5 text-red-600"
            onClick={deleteRound}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard label="Score" value={`${totalStrokes || 0} (${scoreBadge})`} />
        <StatCard label="Par" value={String(totalPar)} />
        <StatCard label="Putts" value={String(totalPutts || 0)} />
        <StatCard label="Penalties" value={String(totalPens || 0)} />
        <StatCard label="FIR" value={`${firHits}/${firAttempts} (${firPct}%)`} />
        <StatCard label="GIR" value={`${girHits}/18 (${girPct}%)`} />
      </div>

      {/* SG buckets */}
      <div className="rounded-2xl border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Strokes Gained</h2>
          <div className="text-sm">Total: <b>{sgTotal >= 0 ? `+${sgTotal.toFixed(1)}` : sgTotal.toFixed(1)}</b></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SGCard label="Off the Tee" value={sgByBucket.OTT} />
          <SGCard label="Approach" value={sgByBucket.APP} />
          <SGCard label="Around Green" value={sgByBucket.ARG} />
          <SGCard label="Putting" value={sgByBucket.PUTT} />
        </div>
      </div>

      {/* Per-hole table */}
      <div className="rounded-2xl border p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Hole</th>
              <th className="p-2">Par</th>
              <th className="p-2">Yds</th>
              <th className="p-2">Strokes</th>
              <th className="p-2">Putts</th>
              <th className="p-2">FIR</th>
              <th className="p-2">GIR</th>
              <th className="p-2">Pen</th>
              <th className="p-2">SG (hole)</th>
            </tr>
          </thead>
          <tbody>
            {holes.map(h => (
              <tr key={h.hole_number} className="odd:bg-white even:bg-gray-50">
                <td className="p-2 text-left">{h.hole_number}</td>
                <td className="p-2">{h.par}</td>
                <td className="p-2">{h.yardage ?? '—'}</td>
                <td className="p-2">{h.strokes ?? '—'}</td>
                <td className="p-2">{h.putts ?? '—'}</td>
                <td className="p-2">{h.par === 3 ? '—' : (h.fairway_hit == null ? '—' : h.fairway_hit ? '✓' : '✗')}</td>
                <td className="p-2">{h.gir == null ? '—' : h.gir ? '✓' : '✗'}</td>
                <td className="p-2">{h.penalty_strokes || 0}</td>
                <td className="p-2">{fmtPlus(sgByHole[h.hole_number] ?? 0)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td className="p-2 text-left font-semibold">Totals</td>
              <td className="p-2 font-semibold">{totalPar}</td>
              <td className="p-2">—</td>
              <td className="p-2 font-semibold">{totalStrokes || 0}</td>
              <td className="p-2 font-semibold">{totalPutts || 0}</td>
              <td className="p-2 font-semibold">{firHits}/{firAttempts}</td>
              <td className="p-2 font-semibold">{girHits}/18</td>
              <td className="p-2 font-semibold">{totalPens || 0}</td>
              <td className="p-2 font-semibold">{fmtPlus(sgTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  )
}

function SGCard({ label, value }: { label: string; value: number }) {
  const v = Number.isFinite(value) ? value : 0
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-lg font-semibold ${v > 0 ? 'text-emerald-600' : v < 0 ? 'text-red-600' : ''}`}>
        {fmtPlus(v)}
      </div>
    </div>
  )
}

function fmtPlus(n: number) {
  const v = Math.round(n * 10) / 10
  if (v > 0) return `+${v.toFixed(1)}`
  if (v < 0) return v.toFixed(1)
  return '0.0'
}

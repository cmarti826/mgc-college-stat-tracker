'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Hole = { hole_number: number; par: number | null }
type RHole = {
  hole_number: number
  strokes: number | null
  putts: number | null
  penalties: number | null
  fairway_hit: boolean | null
  gir: boolean | null
  sg_ott: number | null
  sg_app: number | null
  sg_arg: number | null
  sg_putt: number | null
}

export default function RoundEntryPage() {
  const router = useRouter()
  const { roundId } = useParams<{ roundId: string }>()

  // round meta
  const [status, setStatus] = useState<string>('')
  const [teamId, setTeamId] = useState<string>('')
  const [courseId, setCourseId] = useState<string>('')
  const [teeId, setTeeId] = useState<string>('')

  // SG model badge
  const [teamModel, setTeamModel] = useState<string>('default')
  const [roundModel, setRoundModel] = useState<string | null>(null)
  const activeModel = roundModel ?? teamModel ?? 'default'

  // Course/Tee summary
  const [courseName, setCourseName] = useState<string>('')
  const [courseLoc, setCourseLoc] = useState<string>('') // "City, ST"
  const [teeName, setTeeName] = useState<string>('')
  const [teeColor, setTeeColor] = useState<string | null>(null)
  const [courseRating, setCourseRating] = useState<number | null>(null)
  const [slopeRating, setSlopeRating] = useState<number | null>(null)
  const [totalYardage, setTotalYardage] = useState<number | null>(null)

  // data for table
  const [holes, setHoles] = useState<Hole[]>([])
  const [teeYardages, setTeeYardages] = useState<Record<number, number | null>>({})
  const [entries, setEntries] = useState<Record<number, RHole>>({})
  const [holesWithShots, setHolesWithShots] = useState<Set<number>>(new Set())

  // totals + ui
  const [totals, setTotals] = useState<{ strokes: number; to_par: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // load everything
  useEffect(() => {
    ;(async () => {
      setError(null)

      // 1) Round
      const { data: r, error: er } = await supabase
        .from('rounds')
        .select('id, team_id, course_id, course_tee_id, status, sg_model')
        .eq('id', roundId)
        .single()
      if (er) { setError(er.message); return }

      setTeamId(r.team_id ?? '')
      setCourseId(r.course_id)
      setTeeId(r.course_tee_id ?? '')
      setStatus(r.status)
      setRoundModel(r.sg_model ?? null)

      // 2) Team default model
      if (r.team_id) {
        const { data: t } = await supabase
          .from('teams')
          .select('sg_model')
          .eq('id', r.team_id)
          .maybeSingle()
        if (t) setTeamModel((t as any).sg_model ?? 'default')
      }

      // 3) Course details
      {
        const { data: c } = await supabase
          .from('courses')
          .select('name, city, state')
          .eq('id', r.course_id)
          .maybeSingle()
        if (c) {
          setCourseName((c as any).name ?? '')
          const loc = [ (c as any).city, (c as any).state ].filter(Boolean).join(', ')
          setCourseLoc(loc)
        }
      }

      // 4) Course holes (pars)
      const { data: ch, error: ech } = await supabase
        .from('course_holes')
        .select('hole_number, par')
        .eq('course_id', r.course_id)
        .order('hole_number')
      if (ech) { setError(ech.message); return }

      const normalized: Hole[] =
        (ch?.length ?? 0) > 0
          ? (ch as any[]).map(h => ({ hole_number: h.hole_number, par: h.par }))
          : Array.from({ length: 18 }, (_, i) => ({ hole_number: i + 1, par: null }))
      setHoles(normalized)

      // 5) Tee info + yardages
      if (r.course_tee_id) {
        const { data: tee } = await supabase
          .from('course_tees')
          .select('id, tee_name, color, course_rating, slope_rating, total_yardage')
          .eq('id', r.course_tee_id)
          .maybeSingle()
        if (tee) {
          setTeeName((tee as any).tee_name ?? '')
          setTeeColor((tee as any).color ?? null)
          setCourseRating((tee as any).course_rating ?? null)
          setSlopeRating((tee as any).slope_rating ?? null)
          setTotalYardage((tee as any).total_yardage ?? null)
        }

        const { data: th, error: eth } = await supabase
          .from('course_tee_holes')
          .select('hole_number, yardage')
          .eq('course_tee_id', r.course_tee_id)
          .order('hole_number')
        if (eth) { setError(eth.message); return }
        const ymap: Record<number, number | null> = {}
        for (const row of th ?? []) ymap[(row as any).hole_number] = (row as any).yardage
        setTeeYardages(ymap)
      } else {
        setTeeYardages({})
        setTeeName('')
        setTeeColor(null)
        setCourseRating(null)
        setSlopeRating(null)
        setTotalYardage(null)
      }

      // 6) round_holes
      const { data: rh, error: erh } = await supabase
        .from('round_holes')
        .select('hole_number, strokes, putts, penalties, fairway_hit, gir, sg_ott, sg_app, sg_arg, sg_putt')
        .eq('round_id', roundId)
        .order('hole_number')
      if (erh) { setError(erh.message); return }
      const map: Record<number, RHole> = {}
      for (const row of rh ?? []) map[(row as any).hole_number] = { ...(row as RHole) }
      setEntries(map)

      // 7) holes with shots
      const { data: shotRows, error: es } = await supabase
        .from('round_shots')
        .select('hole_number')
        .eq('round_id', roundId)
      if (es) { setError(es.message); return }
      const s = new Set<number>()
      for (const r of shotRows ?? []) s.add((r as any).hole_number as number)
      setHolesWithShots(s)

      // 8) totals
      await refreshTotals()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId])

  const refreshTotals = async () => {
    const { data, error } = await supabase
      .from('v_round_totals')
      .select('strokes,to_par')
      .eq('round_id', roundId)
      .maybeSingle()
    if (error) { setError(error.message); return }
    if (data) setTotals({ strokes: (data as any).strokes ?? 0, to_par: (data as any).to_par ?? 0 })
    else setTotals(null)
  }

  const parFor = (n: number) => holes.find(h => h.hole_number === n)?.par ?? null
  const yardFor = (n: number) => teeYardages[n] ?? null
  const isPar3 = (n: number) => parFor(n) === 3
  const readOnly = status === 'submitted'

  const handleChange = (n: number, k: keyof RHole, v: any) => {
    if (readOnly || holesWithShots.has(n)) return
    setEntries(prev => ({
      ...prev,
      [n]: { ...(prev[n] || ({ hole_number: n } as RHole)), [k]: v },
    }))
  }

  const computedTotalYards = useMemo(() => {
    const vals = Object.values(teeYardages).filter(v => typeof v === 'number') as number[]
    if (vals.length >= 9) return vals.reduce((a, b) => a + (b ?? 0), 0)
    return totalYardage
  }, [teeYardages, totalYardage])

  const saveAll = async () => {
    if (readOnly) return
    setSaving(true); setError(null)
    try {
      const rows = Array.from({ length: 18 }, (_, i) => i + 1)
        .filter(n => entries[n] && !holesWithShots.has(n))
        .map(n => {
          const e = entries[n]!
          return {
            round_id: roundId,
            hole_number: n,
            strokes: e.strokes,
            putts: e.putts,
            penalties: e.penalties ?? 0,
            fairway_hit: isPar3(n) ? null : !!e.fairway_hit,
            gir: e.gir ?? null,
          }
        })

      if (rows.length) {
        const { error } = await supabase
          .from('round_holes')
          .upsert(rows, { onConflict: 'round_id,hole_number' })
        if (error) throw error
      }

      await refreshTotals()
    } catch (e: any) {
      setError(e?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const finalizeRound = async () => {
    if (readOnly) return
    setSaving(true); setError(null)
    try {
      const { error } = await supabase
        .from('rounds')
        .update({ status: 'submitted', end_time: new Date().toISOString() })
        .eq('id', roundId)
      if (error) throw error
      setStatus('submitted')
      await refreshTotals()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to submit')
    } finally {
      setSaving(false)
    }
  }

  const deleteRound = async () => {
    if (!confirm('Delete this round? This cannot be undone.')) return
    setSaving(true); setError(null)
    const { error } = await supabase.rpc('delete_round', { p_round: roundId })
    if (error) {
      setError(error.message); setSaving(false)
      return
    }
    router.push('/stats')
  }

  const rows = useMemo(() => Array.from({ length: 18 }, (_, i) => i + 1), [])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-bold">Round Entry</h1>
        <div className="text-sm text-gray-700 flex items-center gap-2">
          <span>Status: <span className="font-medium">{status}</span></span>
          <span className="rounded bg-gray-100 px-2 py-0.5">SG: {activeModel}</span>
        </div>
      </div>

      {/* Course/Tee Summary */}
      <div className="rounded border bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold">
              {courseName || 'Course'}
              {courseLoc ? <span className="ml-1 text-sm text-gray-600">• {courseLoc}</span> : null}
            </div>
            <div className="mt-0.5 text-sm text-gray-700 flex items-center gap-2">
              {teeName ? (
                <>
                  <span className="font-medium">Tee:</span>
                  {teeColor ? <span className="inline-block h-3 w-3 rounded-full border" style={{ backgroundColor: teeColor }} /> : null}
                  <span>{teeName}</span>
                </>
              ) : <span className="text-gray-500">No tee selected</span>}
            </div>
          </div>
          <div className="text-sm text-gray-700">
            <div>
              <span className="font-medium">Rating/Slope:</span>{' '}
              {courseRating ?? '—'}/{slopeRating ?? '—'}
            </div>
            <div>
              <span className="font-medium">Yardage:</span>{' '}
              {computedTotalYards ? `${computedTotalYards.toLocaleString()} yds` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Totals */}
      {totals && (
        <div className="rounded border bg-white p-3">
          <div className="text-sm">Total strokes: <b>{totals.strokes}</b></div>
          <div className="text-sm">
            To par: <b>{totals.to_par > 0 ? `+${totals.to_par}` : totals.to_par}</b>
          </div>
        </div>
      )}

      {/* Error */}
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      {/* Table */}
      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left">Hole</th>
              <th className="px-2 py-2">Strokes</th>
              <th className="px-2 py-2">Putts</th>
              <th className="px-2 py-2">Pen</th>
              <th className="px-2 py-2">Fw</th>
              <th className="px-2 py-2">GIR</th>
              <th className="px-2 py-2">SG OTT</th>
              <th className="px-2 py-2">SG APP</th>
              <th className="px-2 py-2">SG ARG</th>
              <th className="px-2 py-2">SG PUTT</th>
              <th className="px-2 py-2">Shots</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(n => {
              const e = entries[n] || ({ hole_number: n } as RHole)
              const par = parFor(n)
              const yds = yardFor(n)
              const par3 = par === 3
              const managed = holesWithShots.has(n)

              return (
                <tr key={n} className="border-t align-top">
                  <td className="px-2 py-1">
                    <div className="font-medium">Hole {n}</div>
                    <div className="text-xs text-gray-600">
                      {par ? `Par ${par}` : 'Par —'}
                      {yds != null ? ` • ${yds} yds` : ''}
                    </div>
                    {managed && (
                      <div className="mt-1 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                        Managed by shots
                      </div>
                    )}
                  </td>

                  <td className="px-2 py-1">
                    <input
                      type="number" min={1}
                      disabled={readOnly || managed}
                      value={e.strokes ?? ''}
                      onChange={ev => handleChange(n, 'strokes', ev.target.value === '' ? null : Number(ev.target.value))}
                      className="w-16 rounded border px-2 py-1"
                    />
                  </td>

                  <td className="px-2 py-1">
                    <input
                      type="number" min={0}
                      disabled={readOnly || managed}
                      value={e.putts ?? ''}
                      onChange={ev => handleChange(n, 'putts', ev.target.value === '' ? null : Number(ev.target.value))}
                      className="w-16 rounded border px-2 py-1"
                    />
                  </td>

                  <td className="px-2 py-1">
                    <input
                      type="number" min={0}
                      disabled={readOnly || managed}
                      value={e.penalties ?? ''}
                      onChange={ev => handleChange(n, 'penalties', ev.target.value === '' ? null : Number(ev.target.value))}
                      className="w-14 rounded border px-2 py-1"
                    />
                  </td>

                  <td className="px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      disabled={readOnly || managed || par3}
                      checked={!!e.fairway_hit && !par3}
                      onChange={ev => handleChange(n, 'fairway_hit', ev.target.checked)}
                    />
                  </td>

                  <td className="px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      disabled={readOnly || managed}
                      checked={!!e.gir}
                      onChange={ev => handleChange(n, 'gir', ev.target.checked)}
                    />
                  </td>

                  {/* SG readonly (from shots) */}
                  <td className="px-2 py-1 text-right">{e.sg_ott ?? ''}</td>
                  <td className="px-2 py-1 text-right">{e.sg_app ?? ''}</td>
                  <td className="px-2 py-1 text-right">{e.sg_arg ?? ''}</td>
                  <td className="px-2 py-1 text-right">{e.sg_putt ?? ''}</td>

                  <td className="px-2 py-1 text-center">
                    <Link className="text-[#0033A0] underline" href={`/rounds/${roundId}/holes/${n}`}>Shots</Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={saveAll}
          disabled={saving || readOnly}
          className="rounded bg-[#0B6B3A] px-4 py-2 text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={finalizeRound}
          disabled={saving || readOnly}
          className="rounded bg-[#0033A0] px-4 py-2 text-white disabled:opacity-50"
        >
          {readOnly ? 'Submitted' : 'Submit Round'}
        </button>
        <button
          onClick={deleteRound}
          disabled={saving}
          className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50"
        >
          Delete Round
        </button>
      </div>
    </div>
  )
}

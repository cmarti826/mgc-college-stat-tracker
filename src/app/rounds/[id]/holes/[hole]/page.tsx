'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Lie = 'tee' | 'fairway' | 'rough' | 'sand' | 'recovery' | 'green'
const LIES_OFF: Lie[] = ['tee','fairway','rough','sand','recovery']
const LIES_ALL: Lie[] = ['tee','fairway','rough','sand','recovery','green']

type Shot = {
  seq: number
  start_lie: Lie
  start_distance: number | null  // yards for off-green, feet for green
  end_lie: Lie | null
  end_distance: number | null
  holed: boolean
  penalties: number
}

export default function HoleShotsPage() {
  const router = useRouter()
  const { roundId, hole } = useParams<{ roundId: string; hole: string }>()
  const holeNumber = Number(hole)

  // round + course/tee meta
  const [status, setStatus] = useState<string>('in_progress')
  const [courseId, setCourseId] = useState<string>('')
  const [teamId, setTeamId] = useState<string>('')
  const [teeId, setTeeId] = useState<string>('')

  const [courseName, setCourseName] = useState('')
  const [courseLoc, setCourseLoc] = useState('')
  const [teeName, setTeeName] = useState('')
  const [teeColor, setTeeColor] = useState<string | null>(null)
  const [courseRating, setCourseRating] = useState<number | null>(null)
  const [slopeRating, setSlopeRating] = useState<number | null>(null)
  const [totalYardage, setTotalYardage] = useState<number | null>(null)

  // per-hole reference
  const [par, setPar] = useState<number | null>(null)
  const [yardage, setYardage] = useState<number | null>(null)

  // shots state
  const [shots, setShots] = useState<Shot[]>([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const readOnly = status === 'submitted'

  // Load everything
  useEffect(() => {
    ;(async () => {
      setErr(null)

      // Round meta
      const { data: r, error: er } = await supabase
        .from('rounds')
        .select('team_id, course_id, course_tee_id, status')
        .eq('id', roundId)
        .single()
      if (er) { setErr(er.message); return }
      setStatus(r.status)
      setTeamId(r.team_id ?? '')
      setCourseId(r.course_id)
      setTeeId(r.course_tee_id ?? '')

      // Course + tee summary
      const [{ data: c }, { data: t }] = await Promise.all([
        supabase.from('courses').select('name, city, state').eq('id', r.course_id).maybeSingle(),
        r.course_tee_id
          ? supabase.from('course_tees')
              .select('id, tee_name, color, course_rating, slope_rating, total_yardage')
              .eq('id', r.course_tee_id).maybeSingle()
          : Promise.resolve({ data: null as any }),
      ])
      if (c) {
        setCourseName((c as any).name ?? '')
        setCourseLoc([ (c as any).city, (c as any).state ].filter(Boolean).join(', '))
      }
      if (t) {
        setTeeName((t as any).tee_name ?? '')
        setTeeColor((t as any).color ?? null)
        setCourseRating((t as any).course_rating ?? null)
        setSlopeRating((t as any).slope_rating ?? null)
        setTotalYardage((t as any).total_yardage ?? null)
      } else {
        setTeeName(''); setTeeColor(null); setCourseRating(null); setSlopeRating(null); setTotalYardage(null)
      }

      // Par for this hole
      const { data: ch } = await supabase
        .from('course_holes')
        .select('par')
        .eq('course_id', r.course_id)
        .eq('hole_number', holeNumber)
        .maybeSingle()
      setPar(ch ? (ch as any).par : null)

      // Tee yardage for this hole (if tee selected)
      if (r.course_tee_id) {
        const { data: th } = await supabase
          .from('course_tee_holes')
          .select('yardage')
          .eq('course_tee_id', r.course_tee_id)
          .eq('hole_number', holeNumber)
          .maybeSingle()
        setYardage(th ? (th as any).yardage : null)
      } else {
        setYardage(null)
      }

      // Existing shots
      const { data: s, error: es } = await supabase
        .from('round_shots')
        .select('seq, start_lie, start_distance, end_lie, end_distance, holed, penalties')
        .eq('round_id', roundId)
        .eq('hole_number', holeNumber)
        .order('seq')
      if (es) { setErr(es.message); return }

      if ((s?.length ?? 0) > 0) {
        setShots((s as any[]).map(row => ({
          seq: row.seq,
          start_lie: row.start_lie,
          start_distance: row.start_distance,
          end_lie: row.end_lie,
          end_distance: row.end_distance,
          holed: row.holed ?? false,
          penalties: row.penalties ?? 0
        })))
      } else {
        // Seed first shot from tee with hole yardage (if known)
        setShots([{
          seq: 1,
          start_lie: 'tee',
          start_distance: yardage ?? null,
          end_lie: null,
          end_distance: null,
          holed: false,
          penalties: 0
        }])
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId, holeNumber])

  const computedTotalYards = useMemo(() => totalYardage ?? null, [totalYardage])

  // ----- UI helpers -----
  const addShot = () => {
    if (readOnly) return
    setShots(prev => {
      const last = prev[prev.length - 1]
      const next: Shot = {
        seq: prev.length + 1,
        start_lie: (last?.end_lie ?? last?.start_lie ?? 'fairway'),
        start_distance: (last?.end_distance ?? 100),
        end_lie: null,
        end_distance: null,
        holed: false,
        penalties: 0
      }
      return [...prev, next]
    })
  }

  const removeShot = (idx: number) => {
    if (readOnly) return
    setShots(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, seq: i + 1 })))
  }

  const updateShot = (idx: number, patch: Partial<Shot>) => {
    if (readOnly) return
    setShots(prev => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], ...patch }

      // If this shot's end changes, auto-propagate next shot's start
      if ('end_lie' in patch || 'end_distance' in patch) {
        const cur = copy[idx]
        const next = copy[idx + 1]
        if (next) {
          next.start_lie = (cur.end_lie ?? next.start_lie)
          next.start_distance = (cur.end_distance ?? next.start_distance)
        }
      }

      // If holed = true, force end on green @ 0ft and clear following shots
      if ('holed' in patch) {
        const cur = copy[idx]
        if (cur.holed) {
          cur.end_lie = 'green'
          cur.end_distance = 0
          // trim any extra shots after this one
          copy.splice(idx + 1)
        }
      }
      // re-number seq
      return copy.map((s, i) => ({ ...s, seq: i + 1 }))
    })
  }

  const save = async () => {
    if (readOnly) return
    setSaving(true); setErr(null)
    try {
      // Normalize payload
      const payload = shots.map(s => ({
        round_id: roundId,
        hole_number: holeNumber,
        seq: s.seq,
        start_lie: s.start_lie,
        start_distance: s.start_lie === 'green' ? asNumber(s.start_distance) : asNumber(s.start_distance), // keep native units: ft for green, yd for others
        end_lie: s.holed ? 'green' : (s.end_lie ?? null),
        end_distance: s.holed ? 0 : (s.end_distance ?? null),
        holed: !!s.holed,
        penalties: s.penalties ?? 0
      }))

      // Replace shots for this hole (delete then insert)
      const { error: ed } = await supabase
        .from('round_shots')
        .delete()
        .eq('round_id', roundId)
        .eq('hole_number', holeNumber)
      if (ed) throw ed

      if (payload.length) {
        const { error: ei } = await supabase.from('round_shots').insert(payload)
        if (ei) throw ei
      }

      // Trigger will recompute round_holes; navigate back to round page
      router.push(`/rounds/${roundId}`)
    } catch (e: any) {
      setErr(e?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const prevHole = () => router.push(`/rounds/${roundId}/holes/${Math.max(1, holeNumber - 1)}`)
  const nextHole = () => router.push(`/rounds/${roundId}/holes/${Math.min(18, holeNumber + 1)}`)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-bold">Hole {holeNumber} — Shots</h1>
        <div className="text-sm text-gray-700">Status: <b>{status}</b></div>
      </div>

      {/* Course/Tee Summary (same look as round page) */}
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

      {/* Hole info */}
      <div className="rounded border bg-white p-3 text-sm text-gray-700">
        <div className="flex flex-wrap items-center gap-3">
          <div><span className="font-medium">Hole:</span> {holeNumber}</div>
          <div><span className="font-medium">Par:</span> {par ?? '—'}</div>
          <div><span className="font-medium">Yardage:</span> {yardage ?? '—'} yds</div>
        </div>
      </div>

      {/* Error */}
      {err && <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{err}</div>}

      {/* Shots table */}
      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left">#</th>
              <th className="px-2 py-2">Start Lie</th>
              <th className="px-2 py-2">Start Dist</th>
              <th className="px-2 py-2">End Lie</th>
              <th className="px-2 py-2">End Dist</th>
              <th className="px-2 py-2">Pen</th>
              <th className="px-2 py-2">Holed</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {shots.map((s, idx) => {
              const isGreenStart = s.start_lie === 'green'
              const isGreenEnd = s.end_lie === 'green' || s.holed
              return (
                <tr key={idx} className="border-t">
                  <td className="px-2 py-1">{idx + 1}</td>

                  <td className="px-2 py-1">
                    <select
                      className="w-28 rounded border px-2 py-1"
                      disabled={readOnly}
                      value={s.start_lie}
                      onChange={e => updateShot(idx, { start_lie: e.target.value as Lie })}
                    >
                      {LIES_ALL.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </td>

                  <td className="px-2 py-1">
                    <input
                      type="number"
                      className="w-24 rounded border px-2 py-1"
                      placeholder={isGreenStart ? 'ft' : 'yd'}
                      disabled={readOnly}
                      value={s.start_distance ?? ''}
                      onChange={e => updateShot(idx, { start_distance: emptyToNull(e.target.value) })}
                    />
                  </td>

                  <td className="px-2 py-1">
                    <select
                      className="w-28 rounded border px-2 py-1"
                      disabled={readOnly || s.holed}
                      value={s.holed ? 'green' : (s.end_lie ?? '')}
                      onChange={e => updateShot(idx, { end_lie: (e.target.value || null) as Lie })}
                    >
                      <option value=""></option>
                      {LIES_ALL.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </td>

                  <td className="px-2 py-1">
                    <input
                      type="number"
                      className="w-24 rounded border px-2 py-1"
                      placeholder={isGreenEnd ? 'ft' : 'yd'}
                      disabled={readOnly || s.holed || !s.end_lie}
                      value={s.holed ? 0 : (s.end_distance ?? '')}
                      onChange={e => updateShot(idx, { end_distance: emptyToNull(e.target.value) })}
                    />
                  </td>

                  <td className="px-2 py-1">
                    <input
                      type="number"
                      min={0}
                      className="w-16 rounded border px-2 py-1"
                      disabled={readOnly}
                      value={s.penalties ?? 0}
                      onChange={e => updateShot(idx, { penalties: Number(e.target.value || 0) })}
                    />
                  </td>

                  <td className="px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      checked={!!s.holed}
                      onChange={e => updateShot(idx, { holed: e.target.checked })}
                    />
                  </td>

                  <td className="px-2 py-1 text-right">
                    <button
                      className="rounded border px-2 py-1 text-xs"
                      disabled={readOnly}
                      onClick={() => removeShot(idx)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              )
            })}
            {!shots.length && (
              <tr><td className="px-3 py-4 text-gray-600" colSpan={8}>No shots yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="rounded border px-3 py-1.5"
          onClick={() => router.push(`/rounds/${roundId}`)}
        >
          ← Back to Round
        </button>
        <div className="flex-1" />
        <button
          className="rounded border px-3 py-1.5"
          disabled={readOnly}
          onClick={addShot}
        >
          + Add Shot
        </button>
        <button
          className="rounded bg-[#0B6B3A] px-4 py-2 text-white disabled:opacity-50"
          disabled={readOnly || saving}
          onClick={save}
        >
          {saving ? 'Saving…' : 'Save Hole'}
        </button>
        <button
          className="rounded bg-[#0033A0] px-4 py-2 text-white disabled:opacity-50"
          disabled={readOnly}
          onClick={() => nextHole()}
        >
          Next Hole →
        </button>
      </div>

      {/* Prev/Next quick nav */}
      <div className="text-sm text-gray-600">
        <button onClick={prevHole} className="underline">Prev</button>
        <span className="mx-2">•</span>
        <button onClick={nextHole} className="underline">Next</button>
      </div>
    </div>
  )
}

function emptyToNull(v: string) {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
function asNumber(n: any) { return n == null ? null : Number(n) }

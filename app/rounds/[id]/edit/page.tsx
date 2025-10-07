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
  up_down_attempt: boolean
  up_down_made: boolean
  sand_save_attempt: boolean
  sand_save_made: boolean
  penalty_strokes: number
}

function getName(rel: any): string {
  if (!rel) return ''
  if (Array.isArray(rel)) return rel[0]?.name ?? ''
  return rel.name ?? ''
}

export default function EditRoundPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const roundId = params.id
  const supabase = useMemo(() => supabaseBrowser(), [])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [courseName, setCourseName] = useState<string>('')
  const [teeName, setTeeName] = useState<string>('')

  const [holes, setHoles] = useState<HoleRow[]>(
    Array.from({ length: 18 }, (_, i) => ({
      hole_number: i + 1,
      par: 4,
      yardage: null,
      strokes: null,
      putts: null,
      fairway_hit: null,
      gir: null,
      up_down_attempt: false,
      up_down_made: false,
      sand_save_attempt: false,
      sand_save_made: false,
      penalty_strokes: 0,
    }))
  )

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      // Load round context (need course_id & tee_set_id)
      const { data: round, error: rErr } = await supabase
        .from('rounds')
        .select('id, course_id, tee_set_id, course:courses(name), tee:tee_sets(name)')
        .eq('id', roundId)
        .single()

      if (rErr) { alert(`Could not load round: ${rErr.message}`); return }
      if (!alive) return

      setCourseName(getName(round?.course))
      setTeeName(getName(round?.tee))

      // Existing per-hole stats?
      const { data: existing, error: hErr } = await supabase
        .from('round_holes')
        .select('*')
        .eq('round_id', roundId)
        .order('hole_number', { ascending: true })

      if (hErr) { alert(`Could not load holes: ${hErr.message}`); return }
      if (!alive) return

      if (existing && existing.length > 0) {
        const merged = holes.map(h => {
          const found = (existing as any[]).find(e => e.hole_number === h.hole_number)
          if (!found) return h
          return {
            hole_number: found.hole_number,
            par: found.par,
            yardage: found.yardage,
            strokes: found.strokes,
            putts: found.putts,
            fairway_hit: found.fairway_hit,
            gir: found.gir,
            up_down_attempt: !!found.up_down_attempt,
            up_down_made: !!found.up_down_made,
            sand_save_attempt: !!found.sand_save_attempt,
            sand_save_made: !!found.sand_save_made,
            penalty_strokes: found.penalty_strokes ?? 0,
          } as HoleRow
        })
        setHoles(merged)
      } else {
        // No rows yet — seed from course holes + tee yardages
        // NOTE: holes table uses `number` (not hole_number)
        const [parRes, yardRes] = await Promise.all([
          supabase.from('holes')
            .select('number, par')                         // <-- fixed
            .eq('course_id', round!.course_id)
            .order('number', { ascending: true }),        // <-- fixed
          supabase.from('tee_set_holes')
            .select('hole_number, yardage')
            .eq('tee_set_id', round!.tee_set_id)
            .order('hole_number', { ascending: true }),
        ])

        if (parRes.error) { alert(`Could not load course holes: ${parRes.error.message}`); return }
        if (yardRes.error) { alert(`Could not load tee yardages: ${yardRes.error.message}`); return }

        const parByHole = new Map<number, number>()
        ;(parRes.data ?? []).forEach(row => parByHole.set(row.number, row.par))      // <-- fixed

        const yardByHole = new Map<number, number>()
        ;(yardRes.data ?? []).forEach(row => yardByHole.set(row.hole_number, row.yardage))

        const seeded = holes.map(h => ({
          ...h,
          par: parByHole.get(h.hole_number) ?? h.par,
          yardage: yardByHole.get(h.hole_number) ?? h.yardage,
        }))

        setHoles(seeded)

        // (Nice UX) persist the seed immediately so it's available on refresh/other devices
        const seedRows = seeded.map(h => ({
          round_id: roundId,
          hole_number: h.hole_number,
          par: h.par,
          yardage: h.yardage,
          strokes: null,
          putts: null,
          fairway_hit: h.par === 3 ? null : false,
          gir: false,
          up_down_attempt: false,
          up_down_made: false,
          sand_save_attempt: false,
          sand_save_made: false,
          penalty_strokes: 0,
        }))
        const { error: seedErr } = await supabase
          .from('round_holes')
          .upsert(seedRows, { onConflict: 'round_id,hole_number' })
        if (seedErr) { console.warn('Seed upsert warning:', seedErr.message) }
      }

      setLoading(false)
    })()
    return () => { alive = false }
  }, [roundId, router, supabase])

  function setField(idx: number, key: keyof HoleRow, value: any) {
    setHoles(prev => {
      const copy = [...prev]
      if (key === 'par') {
        const p = Number(value) || 3
        copy[idx] = { ...copy[idx], par: p, fairway_hit: p === 3 ? null : copy[idx].fairway_hit }
        return copy
      }
      copy[idx] = { ...copy[idx], [key]: value }
      return copy
    })
  }

  async function saveAll() {
    setSaving(true)
    try {
      const rows = holes.map(h => ({
        round_id: roundId,
        hole_number: h.hole_number,
        par: Number(h.par) || 3,
        yardage: h.yardage === null || h.yardage === undefined || (h.yardage as any) === '' ? null : Number(h.yardage),
        strokes: h.strokes === null || h.strokes === undefined || (h.strokes as any) === '' ? null : Number(h.strokes),
        putts: h.putts === null || h.putts === undefined || (h.putts as any) === '' ? null : Number(h.putts),
        fairway_hit: (Number(h.par) === 3) ? null : (h.fairway_hit === null ? false : !!h.fairway_hit),
        gir: h.gir === null ? false : !!h.gir,
        up_down_attempt: !!h.up_down_attempt,
        up_down_made: !!h.up_down_made,
        sand_save_attempt: !!h.sand_save_attempt,
        sand_save_made: !!h.sand_save_made,
        penalty_strokes: Number(h.penalty_strokes) || 0,
      }))

      const invalid = rows.find(r => r.strokes !== null && r.strokes <= 0)
      if (invalid) { alert('Strokes must be > 0 when provided.'); setSaving(false); return }

      const { error } = await supabase
        .from('round_holes')
        .upsert(rows, { onConflict: 'round_id,hole_number' })

      if (error) throw error
      router.replace(`/rounds/${roundId}`)
    } catch (err: any) {
      console.error(err); alert(err.message ?? 'Failed to save holes.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold mb-2">Edit Round</h1>
        <div className="animate-pulse h-24 rounded-xl bg-gray-200" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Edit Round</h1>
        <div className="text-sm opacity-75">{courseName}{teeName ? ` • ${teeName}` : ''}</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border rounded-xl overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Hole</th>
              <th className="p-2">Par</th>
              <th className="p-2">Yards</th>
              <th className="p-2">Strokes</th>
              <th className="p-2">Putts</th>
              <th className="p-2">FIR</th>
              <th className="p-2">GIR</th>
              <th className="p-2">Up&Down A</th>
              <th className="p-2">Up&Down M</th>
              <th className="p-2">Sand A</th>
              <th className="p-2">Sand M</th>
              <th className="p-2">Penalty</th>
            </tr>
          </thead>
          <tbody>
            {holes.map((h, idx) => {
              const par3 = Number(h.par) === 3
              return (
                <tr key={h.hole_number} className="odd:bg-white even:bg-gray-50">
                  <td className="p-2 font-medium">{h.hole_number}</td>
                  <td className="p-2">
                    <input type="number" min={3} max={5} className="w-16 rounded-lg border p-1 text-center"
                      value={h.par} onChange={e => setField(idx, 'par', Number(e.target.value))} />
                  </td>
                  <td className="p-2">
                    <input type="number" min={0} className="w-20 rounded-lg border p-1 text-center"
                      value={h.yardage ?? ''} onChange={e => setField(idx, 'yardage', e.target.value === '' ? null : Number(e.target.value))} />
                  </td>
                  <td className="p-2">
                    <input type="number" min={1} className="w-20 rounded-lg border p-1 text-center"
                      value={h.strokes ?? ''} onChange={e => setField(idx, 'strokes', e.target.value === '' ? null : Number(e.target.value))} />
                  </td>
                  <td className="p-2">
                    <input type="number" min={0} className="w-20 rounded-lg border p-1 text-center"
                      value={h.putts ?? ''} onChange={e => setField(idx, 'putts', e.target.value === '' ? null : Number(e.target.value))} />
                  </td>
                  <td className="p-2">
                    <input type="checkbox" disabled={par3}
                      checked={!!h.fairway_hit}
                      onChange={e => setField(idx, 'fairway_hit', e.target.checked)} />
                  </td>
                  <td className="p-2">
                    <input type="checkbox"
                      checked={!!h.gir}
                      onChange={e => setField(idx, 'gir', e.target.checked)} />
                  </td>
                  <td className="p-2">
                    <input type="checkbox"
                      checked={h.up_down_attempt}
                      onChange={e => setField(idx, 'up_down_attempt', e.target.checked)} />
                  </td>
                  <td className="p-2">
                    <input type="checkbox"
                      checked={h.up_down_made}
                      onChange={e => setField(idx, 'up_down_made', e.target.checked)} />
                  </td>
                  <td className="p-2">
                    <input type="checkbox"
                      checked={h.sand_save_attempt}
                      onChange={e => setField(idx, 'sand_save_attempt', e.target.checked)} />
                  </td>
                  <td className="p-2">
                    <input type="checkbox"
                      checked={h.sand_save_made}
                      onChange={e => setField(idx, 'sand_save_made', e.target.checked)} />
                  </td>
                  <td className="p-2">
                    <input type="number" min={0} className="w-20 rounded-lg border p-1 text-center"
                      value={h.penalty_strokes}
                      onChange={e => setField(idx, 'penalty_strokes', Number(e.target.value) || 0)} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex gap-3">
        <button onClick={saveAll} disabled={saving} className="rounded-2xl px-4 py-2 border shadow disabled:opacity-60">
          {saving ? 'Saving…' : 'Save & View Round'}
        </button>
        <button onClick={() => router.replace(`/rounds/${roundId}`)} className="rounded-2xl px-4 py-2 border">
          Cancel
        </button>
      </div>
    </div>
  )
}

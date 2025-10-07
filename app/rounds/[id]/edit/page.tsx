'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

type Lie = 'TEE' | 'FAIRWAY' | 'ROUGH' | 'SAND' | 'RECOVERY' | 'GREEN'
const LIES: Lie[] = ['TEE', 'FAIRWAY', 'ROUGH', 'SAND', 'RECOVERY', 'GREEN']

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

type Shot = {
  shot_number: number
  start_lie: Lie
  start_dist_yards: number
  end_lie: Lie
  end_dist_yards: number
  penalty: boolean
  sg?: number
}

function relName(rel: any): string {
  if (!rel) return ''
  if (Array.isArray(rel)) return rel[0]?.name ?? ''
  return rel.name ?? ''
}

export default function EditRoundPage() {
  const params = useParams<{ id: string }>()
  const roundId = params.id
  const router = useRouter()
  const supabase = useMemo(() => supabaseBrowser(), [])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [courseName, setCourseName] = useState('')
  const [teeName, setTeeName] = useState('')

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
  const [activeHole, setActiveHole] = useState(1)
  const [shotsByHole, setShotsByHole] = useState<Record<number, Shot[]>>({})

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: round, error: rErr } = await supabase
        .from('rounds')
        .select('id, course_id, tee_set_id, course:courses(name), tee:tee_sets(name)')
        .eq('id', roundId)
        .single()
      if (rErr) { alert(`Could not load round: ${rErr.message}`); return }
      if (!alive) return
      setCourseName(relName(round?.course))
      setTeeName(relName(round?.tee))

      const { data: existing, error: hErr } = await supabase
        .from('round_holes')
        .select('*')
        .eq('round_id', roundId)
        .order('hole_number', { ascending: true })
      if (hErr) { alert(`Could not load holes: ${hErr.message}`); return }

      if (existing && existing.length > 0) {
        const merged = holes.map(h => {
          const f = (existing as any[]).find(e => e.hole_number === h.hole_number)
          if (!f) return h
          return {
            hole_number: f.hole_number,
            par: f.par,
            yardage: f.yardage,
            strokes: f.strokes,
            putts: f.putts,
            fairway_hit: f.par === 3 ? null : f.fairway_hit,
            gir: f.gir,
            up_down_attempt: !!f.up_down_attempt,
            up_down_made: !!f.up_down_made,
            sand_save_attempt: !!f.sand_save_attempt,
            sand_save_made: !!f.sand_save_made,
            penalty_strokes: f.penalty_strokes ?? 0,
          } as HoleRow
        })
        setHoles(merged)
      } else {
        const [parRes, yardRes] = await Promise.all([
          supabase
            .from('holes')
            .select('number, par')
            .eq('course_id', round!.course_id)
            .order('number', { ascending: true }),
          supabase
            .from('tee_set_holes')
            .select('hole_number, yardage')
            .eq('tee_set_id', round!.tee_set_id)
            .order('hole_number', { ascending: true }),
        ])
        if (parRes.error) { alert(`Could not load course holes: ${parRes.error.message}`); return }
        if (yardRes.error) { alert(`Could not load tee yardages: ${yardRes.error.message}`); return }

        const parBy = new Map<number, number>()
        ;(parRes.data ?? []).forEach((row: any) => parBy.set(row.number, row.par))
        const yBy = new Map<number, number>()
        ;(yardRes.data ?? []).forEach((row: any) => yBy.set(row.hole_number, row.yardage))

        const seeded = holes.map(h => ({
          ...h,
          par: parBy.get(h.hole_number) ?? h.par,
          yardage: yBy.get(h.hole_number) ?? h.yardage,
          fairway_hit: (parBy.get(h.hole_number) ?? h.par) === 3 ? null : false,
          gir: false,
        }))
        setHoles(seeded)

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
        await supabase.from('round_holes').upsert(seedRows, { onConflict: 'round_id,hole_number' })
      }

      const { data: shots, error: sErr } = await supabase
        .from('shots')
        .select('hole_number, shot_number, start_lie, start_dist_yards, end_lie, end_dist_yards, penalty')
        .eq('round_id', roundId)
        .order('hole_number', { ascending: true })
        .order('shot_number', { ascending: true })
      if (sErr) { console.warn('shots:', sErr.message) }

      const grouped: Record<number, Shot[]> = {}
      ;(shots ?? []).forEach((row: any) => {
        const list = grouped[row.hole_number] ?? []
        list.push({
          shot_number: row.shot_number,
          start_lie: row.start_lie,
          start_dist_yards: Number(row.start_dist_yards ?? 0),
          end_lie: row.end_lie ?? row.start_lie,
          end_dist_yards: Number(row.end_dist_yards ?? 0),
          penalty: !!row.penalty,
        })
        grouped[row.hole_number] = list
      })
      setShotsByHole(grouped)

      setLoading(false)
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId])

  function setField(index: number, key: keyof HoleRow, value: any) {
    setHoles(prev => {
      const copy = [...prev]
      if (key === 'par') {
        const p = Number(value) || 3
        copy[index] = { ...copy[index], par: p, fairway_hit: p === 3 ? null : copy[index].fairway_hit }
        return copy
      }
      copy[index] = { ...copy[index], [key]: value }
      return copy
    })
  }

  async function saveAll() {
    setSaving(true)
    try {
      // ✅ only check for null (state never stores '')
      const rhRows = holes.map(h => ({
        round_id: roundId,
        hole_number: h.hole_number,
        par: Number(h.par) || 3,
        yardage: h.yardage == null ? null : Number(h.yardage),
        strokes: h.strokes == null ? null : Number(h.strokes),
        putts: h.putts == null ? null : Number(h.putts),
        fairway_hit: h.par === 3 ? null : !!h.fairway_hit,
        gir: !!h.gir,
        up_down_attempt: !!h.up_down_attempt,
        up_down_made: !!h.up_down_made,
        sand_save_attempt: !!h.sand_save_attempt,
        sand_save_made: !!h.sand_save_made,
        penalty_strokes: Number(h.penalty_strokes) || 0,
      }))
      const { error: rhErr } = await supabase.from('round_holes').upsert(rhRows, { onConflict: 'round_id,hole_number' })
      if (rhErr) throw rhErr

      for (const key of Object.keys(shotsByHole)) {
        const hn = Number(key)
        await supabase.from('shots').delete().eq('round_id', roundId).eq('hole_number', hn)
        const rows = (shotsByHole[hn] ?? []).map((s, idx) => ({
          round_id: roundId,
          hole_number: hn,
          shot_number: idx + 1,
          start_lie: s.start_lie,
          start_dist_yards: Number(s.start_dist_yards) || 0,
          end_lie: s.end_lie,
          end_dist_yards: Number(s.end_dist_yards) || 0,
          penalty: !!s.penalty,
        }))
        if (rows.length) {
          const { error } = await supabase.from('shots').insert(rows)
          if (error) throw error
        }
      }

      router.replace(`/rounds/${roundId}`)
    } catch (err: any) {
      console.error(err)
      alert(err.message ?? 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  function addShot(holeNo: number) {
    const list = shotsByHole[holeNo] ?? []
    const last = list[list.length - 1]
    const baseYards = holes.find(h => h.hole_number === holeNo)?.yardage ?? 400
    const next: Shot = last
      ? {
          shot_number: list.length + 1,
          start_lie: last.end_lie,
          start_dist_yards: Math.max(0, last.end_dist_yards),
          end_lie: last.end_lie,
          end_dist_yards: Math.max(0, last.end_dist_yards - 30),
          penalty: false,
        }
      : {
          shot_number: 1,
          start_lie: 'TEE',
          start_dist_yards: Math.max(1, Number(baseYards)),
          end_lie: 'FAIRWAY',
          end_dist_yards: 150,
          penalty: false,
        }
    setShotsByHole(prev => ({ ...prev, [holeNo]: [...(prev[holeNo] ?? []), next] }))
  }

  function updateShot(holeNo: number, idx: number, patch: Partial<Shot>) {
    setShotsByHole(prev => {
      const list = [...(prev[holeNo] ?? [])]
      list[idx] = { ...list[idx], ...patch }
      return { ...prev, [holeNo]: list }
    })
  }

  function removeShot(holeNo: number, idx: number) {
    setShotsByHole(prev => {
      const list = [...(prev[holeNo] ?? [])]
      list.splice(idx, 1)
      const renum = list.map((s, i) => ({ ...s, shot_number: i + 1 }))
      return { ...prev, [holeNo]: renum }
    })
  }

  async function refreshSGForHole(holeNo: number) {
    const list = shotsByHole[holeNo] ?? []
    const updated: Shot[] = []
    for (const s of list) {
      const { data, error } = await supabase.rpc('sg_for_shot', {
        p_start_lie: s.start_lie,
        p_start_dist: s.start_dist_yards,
        p_end_lie: s.end_lie,
        p_end_dist: s.end_dist_yards,
      })
      updated.push({ ...s, sg: error ? undefined : Number(data) })
    }
    setShotsByHole(prev => ({ ...prev, [holeNo]: updated }))
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold mb-2">Edit Round</h1>
        <div className="animate-pulse h-24 rounded-xl bg-gray-200" />
      </div>
    )
  }

  const hole = holes.find(h => h.hole_number === activeHole)!

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit Round</h1>
        <div className="text-sm opacity-75">
          {courseName}
          {teeName ? ` • ${teeName}` : ''}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {holes.map(h => (
          <button
            key={h.hole_number}
            onClick={() => setActiveHole(h.hole_number)}
            className={`px-3 py-1.5 rounded-xl border ${activeHole === h.hole_number ? 'bg-gray-900 text-white' : 'bg-white'}`}
          >
            H{h.hole_number}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border p-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
          <div>
            <label className="block text-xs mb-1">Par</label>
            <input
              type="number"
              min={3}
              max={5}
              className="w-full rounded-lg border p-2 text-center"
              value={hole.par}
              onChange={e => setField(activeHole - 1, 'par', Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Yards</label>
            <input
              type="number"
              min={0}
              className="w-full rounded-lg border p-2 text-center"
              value={hole.yardage ?? ''}
              onChange={e => setField(activeHole - 1, 'yardage', e.target.value === '' ? null : Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Strokes</label>
            <input
              type="number"
              min={1}
              className="w-full rounded-lg border p-2 text-center"
              value={hole.strokes ?? ''}
              onChange={e => setField(activeHole - 1, 'strokes', e.target.value === '' ? null : Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Putts</label>
            <input
              type="number"
              min={0}
              className="w-full rounded-lg border p-2 text-center"
              value={hole.putts ?? ''}
              onChange={e => setField(activeHole - 1, 'putts', e.target.value === '' ? null : Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs mb-1">FIR</label>
            <input
              type="checkbox"
              disabled={hole.par === 3}
              checked={!!hole.fairway_hit}
              onChange={e => setField(activeHole - 1, 'fairway_hit', e.target.checked)}
            />
          </div>
          <div>
            <label className="block text-xs mb-1">GIR</label>
            <input
              type="checkbox"
              checked={!!hole.gir}
              onChange={e => setField(activeHole - 1, 'gir', e.target.checked)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Shots – Hole {activeHole}</h2>
          <div className="flex gap-2">
            <button onClick={() => addShot(activeHole)} className="rounded-xl border px-3 py-1.5">Add Shot</button>
            <button onClick={() => refreshSGForHole(activeHole)} className="rounded-xl border px-3 py-1.5">Recalc SG</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">#</th>
                <th className="p-2">Start Lie</th>
                <th className="p-2">Start Dist (yd)</th>
                <th className="p-2">End Lie</th>
                <th className="p-2">End Dist (yd)</th>
                <th className="p-2">Penalty</th>
                <th className="p-2">SG</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {(shotsByHole[activeHole] ?? []).map((s, i) => (
                <tr key={i} className="odd:bg-white even:bg-gray-50">
                  <td className="p-2">{i + 1}</td>
                  <td className="p-2">
                    <select
                      className="rounded border p-1"
                      value={s.start_lie}
                      onChange={e => updateShot(activeHole, i, { start_lie: e.target.value as Lie })}
                    >
                      {LIES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      min={0}
                      className="w-24 rounded border p-1 text-center"
                      value={s.start_dist_yards}
                      onChange={e => updateShot(activeHole, i, { start_dist_yards: Math.max(0, Number(e.target.value) || 0) })}
                    />
                  </td>
                  <td className="p-2">
                    <select
                      className="rounded border p-1"
                      value={s.end_lie}
                      onChange={e => updateShot(activeHole, i, { end_lie: e.target.value as Lie })}
                    >
                      {LIES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      min={0}
                      className="w-24 rounded border p-1 text-center"
                      value={s.end_dist_yards}
                      onChange={e => updateShot(activeHole, i, { end_dist_yards: Math.max(0, Number(e.target.value) || 0) })}
                    />
                  </td>
                  <td className="p-2 text-center">
                    <input
                      type="checkbox"
                      checked={!!s.penalty}
                      onChange={e => updateShot(activeHole, i, { penalty: e.target.checked })}
                    />
                  </td>
                  <td className="p-2 text-center">{s.sg == null ? '—' : s.sg.toFixed(2)}</td>
                  <td className="p-2">
                    <button onClick={() => removeShot(activeHole, i)} className="rounded border px-2 py-1">Remove</button>
                  </td>
                </tr>
              ))}
              {(shotsByHole[activeHole] ?? []).length === 0 && (
                <tr>
                  <td colSpan={8} className="p-3 text-center text-gray-500">No shots yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={saveAll}
          disabled={saving}
          className="rounded-2xl px-4 py-2 border shadow disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save & View Round'}
        </button>
        <button
          onClick={() => router.replace(`/rounds/${roundId}`)}
          className="rounded-2xl px-4 py-2 border"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type ShotRow = {
  id: string
  round_id: string
  player_id: string
  hole: number
  shot_no: number
  start_lie: string
  start_distance: number
  end_lie: string
  end_distance: number
  penalty: boolean
  holed: boolean
  e_start?: number
  e_end?: number
  sg?: number
}

type HoleSG = { round_id: string; player_id: string; hole: number; sg_hole: number }

type Course = { id: string; name: string }
type TeeSet = {
  id: string
  course_id: string
  tee_name?: string | null
  name?: string | null
  rating?: number | null
  slope?: number | null
}
type ParRow = { hole_number: number; par: number | null }
type YdgRow = { hole_number: number; yardage: number | null }

const LIES = ['tee', 'fairway', 'rough', 'sand', 'recovery', 'green', 'penalty', 'hole'] as const

export default function ScoreForm({ round }: { round: any }) {
  const searchParams = useSearchParams()
  // optional coach/admin override -> score for a specific user
  const overridePlayer = searchParams.get('player') || undefined

  // identity (current scorer)
  const [me, setMe] = useState<{ id: string | null; name: string | null }>({ id: null, name: null })

  // course / tee / holes
  const [course, setCourse] = useState<Course | null>(null)
  const [tee, setTee] = useState<TeeSet | null>(null)
  const [pars, setPars] = useState<ParRow[]>([])
  const [ydgs, setYdgs] = useState<YdgRow[]>([])

  // sg data – only for current scorer
  const [shots, setShots] = useState<ShotRow[]>([])
  const [holeSG, setHoleSG] = useState<HoleSG[]>([])
  const [msg, setMsg] = useState('')

  // shot entry form
  const [form, setForm] = useState<{
    hole: number | ''
    start_lie: string
    start_distance: number | ''
    end_lie: string
    end_distance: number | ''
    penalty: boolean
    holed: boolean
    snapFromPrev: boolean
  }>({
    hole: '',
    start_lie: 'tee',
    start_distance: '',
    end_lie: 'green',
    end_distance: '',
    penalty: false,
    holed: false,
    snapFromPrev: true,
  })

  // ---- identity
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      setMe({
        id: overridePlayer ?? data?.user?.id ?? null,
        name: data?.user?.email ?? null,
      })
    })()
  }, [overridePlayer])

  // ---- course + holes
  useEffect(() => {
    if (!round?.tee_set_id) return
    ;(async () => {
      const { data: t } = await supabase
        .from('tee_sets')
        .select('id, course_id, tee_name, name, rating, slope')
        .eq('id', round.tee_set_id)
        .maybeSingle()
      setTee(t as any)

      const courseId = (t as any)?.course_id
      if (courseId) {
        const { data: c } = await supabase
          .from('courses')
          .select('id, name')
          .eq('id', courseId)
          .maybeSingle()
        setCourse(c as any)

        const { data: ch } = await supabase
          .from('course_holes')
          .select('hole_number, par')
          .eq('course_id', courseId)
          .order('hole_number')
        setPars((ch as ParRow[]) || [])
      }

      const { data: th } = await supabase
        .from('tee_set_holes')
        .select('hole_number, yardage')
        .eq('tee_set_id', round.tee_set_id)
        .order('hole_number')
      setYdgs((th as YdgRow[]) || [])
    })()
  }, [round?.tee_set_id])

  // ---- load views (only for current player)
  async function loadViews(playerId?: string | null) {
    if (!round?.id || !playerId) return
    const { data: s, error: e1 } = await supabase
      .from('v_shots_sg')
      .select('*')
      .eq('round_id', round.id)
      .eq('player_id', playerId)
      .order('hole')
      .order('shot_no')
    if (e1) { setMsg(e1.message); return }
    setShots((s as ShotRow[]) || [])

    const { data: h, error: e2 } = await supabase
      .from('v_hole_sg')
      .select('*')
      .eq('round_id', round.id)
      .eq('player_id', playerId)
      .order('hole')
    if (e2) { setMsg(e2.message); return }
    setHoleSG((h as HoleSG[]) || [])
    setMsg('')
  }

  useEffect(() => { loadViews(me.id) }, [round?.id, me.id])

  // ---- helpers
  const parByHole = useMemo(() => {
    const m = new Map<number, number | null>()
    pars.forEach(r => m.set(r.hole_number, r.par))
    return m
  }, [pars])

  const ydgByHole = useMemo(() => {
    const m = new Map<number, number | null>()
    ydgs.forEach(r => m.set(r.hole_number, r.yardage))
    return m
  }, [ydgs])

  // ✅ FALLBACK: if no rows in course_holes/tee_set_holes, still show 1..18
  const holesList = useMemo(() => {
    const s = new Set<number>()
    pars.forEach(h => s.add(h.hole_number))
    ydgs.forEach(h => s.add(h.hole_number))
    const list = Array.from(s).sort((a, b) => a - b)
    return list.length ? list : Array.from({ length: 18 }, (_, i) => i + 1)
  }, [pars, ydgs])

  const sgByHole = useMemo(() => {
    const m = new Map<number, number>()
    holeSG.forEach(h => m.set(h.hole, h.sg_hole))
    return m
  }, [holeSG])

  const sgTotal = useMemo(() => holeSG.reduce((acc, h) => acc + (h.sg_hole ?? 0), 0), [holeSG])

  function lastShotFor(hole: number) {
    const list = shots.filter(s => s.hole === hole)
    if (!list.length) return null
    return list.reduce((a, b) => (a.shot_no > b.shot_no ? a : b))
  }

  // ---- shot add / undo
  async function addShot() {
    try {
      if (!me.id) throw new Error('Please sign in to record shots.')
      if (!round?.id) throw new Error('Missing round')
      if (!form.hole) throw new Error('Pick a hole')

      let start_lie = form.start_lie
      let start_distance = Number(form.start_distance)
      let end_lie = form.end_lie
      let end_distance = Number(form.end_distance)
      let penalty = !!form.penalty
      let holed = !!form.holed

      // snap from previous end
      if (form.snapFromPrev) {
        const last = lastShotFor(Number(form.hole))
        if (last) {
          start_lie = last.end_lie
          start_distance = last.end_distance
        } else if (ydgByHole.get(Number(form.hole)) != null) {
          start_lie = 'tee'
          start_distance = Number(ydgByHole.get(Number(form.hole))) || 0
        }
      }

      if (holed) {
        end_lie = 'hole'
        end_distance = 0
      }

      const last = lastShotFor(Number(form.hole))
      const nextNo = last ? last.shot_no + 1 : 1

      const { error } = await supabase.from('shots').insert({
        round_id: round.id,
        player_id: me.id,
        hole: Number(form.hole),
        shot_no: nextNo,
        start_lie,
        start_distance,
        end_lie,
        end_distance,
        penalty,
        holed,
      })
      if (error) throw error

      await loadViews(me.id)

      // prep for next shot
      setForm(f => ({
        ...f,
        start_lie: end_lie,
        start_distance: end_distance,
        end_lie: 'green',
        end_distance: '',
        penalty: false,
        holed: false,
      }))
    } catch (e: any) {
      setMsg(e.message || 'Failed to add shot')
    }
  }

  async function undoLast() {
    try {
      if (!me.id) throw new Error('Please sign in')
      if (!round?.id) throw new Error('Missing round')
      if (!form.hole) throw new Error('Pick a hole')

      const last = lastShotFor(Number(form.hole))
      if (!last) return

      const { error } = await supabase.from('shots').delete().eq('id', last.id)
      if (error) throw error

      await loadViews(me.id)
    } catch (e: any) {
      setMsg(e.message || 'Failed to undo')
    }
  }

  // ---- header strings
  const courseLine = (() => {
    const teeLabel = tee?.tee_name || tee?.name
    const rs = (tee?.rating ? `${tee.rating}` : '') + (tee?.slope ? `/${tee.slope}` : '')
    return [course?.name || 'Course', teeLabel ? `• ${teeLabel}` : '', rs ? `(${rs})` : ''].filter(Boolean).join(' ')
  })()

  if (!me.id) {
    return (
      <div style={{ padding: 16 }}>
        <h2>{round?.name || 'Round'}</h2>
        <p>Please sign in to enter your shots.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 16, display: 'grid', gap: 18 }}>
      {/* Header */}
      <div>
        <h2 style={{ margin: 0 }}>{round?.name || 'Round'}</h2>
        <div style={{ color: '#555' }}>
          {courseLine} • SG Model: <b>{round?.sg_model || 'pga_tour'}</b>
        </div>
        <div style={{ color: '#777', marginTop: 2 }}>
          {new Date(round?.round_date || Date.now()).toLocaleDateString()}
        </div>
      </div>

      {/* Shot Entry – for YOU only */}
      <div>
        <h3 style={{ margin: '8px 0' }}>Enter Shot (You)</h3>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(6, minmax(140px, 1fr))', alignItems: 'end' }}>
          <label>Hole
            <select
              value={form.hole}
              onChange={e => {
                const h = Number(e.target.value)
                const y = ydgByHole.get(h)
                setForm(f => ({
                  ...f,
                  hole: h || '',
                  start_lie: f.snapFromPrev ? f.start_lie : 'tee',
                  start_distance: f.snapFromPrev ? f.start_distance : (y ?? ''),
                }))
              }}
              style={input}
            >
              <option value="">-</option>
              {holesList.map(h => (
                <option key={h} value={h}>
                  {`H${h}${ydgByHole.get(h) ? ` • ${ydgByHole.get(h)}y` : ''}${parByHole.get(h) ? ` • Par ${parByHole.get(h)}` : ''}`}
                </option>
              ))}
            </select>
          </label>

          <label>Start lie
            <select value={form.start_lie} onChange={e => setForm(f => ({ ...f, start_lie: e.target.value }))} style={input}>
              {LIES.filter(l => l !== 'hole').map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>

          <label>Start dist (y/ft)
            <input type="number" value={form.start_distance as any} onChange={e => setForm(f => ({ ...f, start_distance: e.target.value === '' ? '' : Number(e.target.value) }))} style={input} />
          </label>

          <label>End lie
            <select value={form.end_lie} onChange={e => setForm(f => ({ ...f, end_lie: e.target.value }))} style={input}>
              {LIES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>

          <label>End dist (y/ft)
            <input type="number" value={form.end_distance as any} onChange={e => setForm(f => ({ ...f, end_distance: e.target.value === '' ? '' : Number(e.target.value) }))} style={input} />
          </label>

          <div />
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 8 }}>
          <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={form.penalty} onChange={e => setForm(f => ({ ...f, penalty: e.target.checked }))} /> Penalty
          </label>
          <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={form.holed} onChange={e => setForm(f => ({ ...f, holed: e.target.checked }))} /> Holed
          </label>
          <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={form.snapFromPrev} onChange={e => setForm(f => ({ ...f, snapFromPrev: e.target.checked }))} /> Use previous end as next start
          </label>

          <button onClick={addShot}>Add shot</button>
          <button onClick={undoLast}>Undo last</button>
        </div>
      </div>

      {/* SG (You) */}
      <div style={{ overflowX: 'auto', marginTop: 4 }}>
        <h3 style={{ margin: '8px 0' }}>Your Strokes Gained</h3>
        <table style={{ borderCollapse: 'collapse', minWidth: 640 }}>
          <thead>
            <tr>
              {holesList.map(h => <th key={h} style={th}>H{h}</th>)}
              <th style={th}>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {holesList.map(h => <td key={h} style={tdRight}>{sgByHole.get(h)?.toFixed(2) ?? '-'}</td>)}
              <td style={tdRight}><b>{sgTotal.toFixed(2)}</b></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Shot detail (you) */}
      <details>
        <summary>Shot detail (you)</summary>
        <div style={{ overflowX: 'auto', marginTop: 8 }}>
          <table style={{ borderCollapse: 'collapse', minWidth: 920 }}>
            <thead>
              <tr>
                <th style={th}>Hole</th>
                <th style={th}>#</th>
                <th style={th}>Start</th>
                <th style={thRight}>Dist</th>
                <th style={th}>End</th>
                <th style={thRight}>Dist</th>
                <th style={th}>Penalty</th>
                <th style={th}>Holed</th>
                <th style={thRight}>E(start)</th>
                <th style={thRight}>E(end)</th>
                <th style={thRight}>SG</th>
              </tr>
            </thead>
            <tbody>
              {shots.map(s => (
                <tr key={s.id}>
                  <td style={tdCenter}>{s.hole}</td>
                  <td style={tdCenter}>{s.shot_no}</td>
                  <td style={td}>{s.start_lie}</td>
                  <td style={tdRight}>{s.start_distance}</td>
                  <td style={td}>{s.end_lie}</td>
                  <td style={tdRight}>{s.end_distance}</td>
                  <td style={tdCenter}>{s.penalty ? 'Y' : ''}</td>
                  <td style={tdCenter}>{s.holed ? 'Y' : ''}</td>
                  <td style={tdRight}>{s.e_start?.toFixed(2)}</td>
                  <td style={tdRight}>{s.e_end?.toFixed(2)}</td>
                  <td style={tdRight}><b>{s.sg?.toFixed(3)}</b></td>
                </tr>
              ))}
              {shots.length === 0 && <tr><td style={td} colSpan={11}>No shots yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </details>

      {msg && <div style={{ color: '#c00' }}>{msg}</div>}
    </div>
  )
}

/* styles */
const th: React.CSSProperties = {
  textAlign: 'left',
  padding: 6,
  borderBottom: '1px solid #eee',
  background: '#fafafa',
  whiteSpace: 'nowrap',
}
const thRight: React.CSSProperties = { ...th, textAlign: 'right' }

const td: React.CSSProperties = { padding: 6, borderBottom: '1px solid #f2f2f2' }
const tdRight: React.CSSProperties = { ...td, textAlign: 'right' }
const tdCenter: React.CSSProperties = { ...td, textAlign: 'center' }
const input: React.CSSProperties = { width: '100%', padding: 6, border: '1px solid #ddd', borderRadius: 6 }

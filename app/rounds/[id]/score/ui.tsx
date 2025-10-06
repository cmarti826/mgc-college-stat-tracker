'use client'

import { useEffect, useMemo, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabaseClient'

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
type TeeSet = { id: string; course_id: string; tee_name?: string | null; name?: string | null; rating?: number | null; slope?: number | null }
type ParRow = { hole_number: number; par: number | null }
type YdgRow = { hole_number: number; yardage: number | null }
type LineupPlayer = { user_id: string; full_name: string | null }

const LIES = ['tee', 'fairway', 'rough', 'sand', 'recovery', 'green', 'penalty', 'hole'] as const

export default function ScoreForm({ round }: { round: any }) {
  const supabase = getSupabaseBrowser()

  // identity
  const [me, setMe] = useState<{ id: string | null; name: string | null }>({ id: null, name: null })

  // lineup
  const [lineup, setLineup] = useState<LineupPlayer[]>([])
  const inLineup = useMemo(() => (me.id ? lineup.some(p => p.user_id === me.id) : false), [lineup, me.id])

  // course / tee / holes
  const [course, setCourse] = useState<Course | null>(null)
  const [tee, setTee] = useState<TeeSet | null>(null)
  const [pars, setPars] = useState<ParRow[]>([])
  const [ydgs, setYdgs] = useState<YdgRow[]>([])

  // sg data
  const [shots, setShots] = useState<ShotRow[]>([])
  const [holeSG, setHoleSG] = useState<HoleSG[]>([])
  const [msg, setMsg] = useState('')

  // --- shot entry form state
  const [form, setForm] = useState<{
    playerId: string | ''
    hole: number | ''
    start_lie: string
    start_distance: number | ''
    end_lie: string
    end_distance: number | ''
    penalty: boolean
    holed: boolean
    snapFromPrev: boolean
  }>({
    playerId: '',
    hole: '',
    start_lie: 'tee',
    start_distance: '',
    end_lie: 'green',
    end_distance: '',
    penalty: false,
    holed: false,
    snapFromPrev: true,
  })

  // helpers
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

  const holesList = useMemo(() => {
    const s = new Set<number>()
    pars.forEach(h => s.add(h.hole_number))
    ydgs.forEach(h => s.add(h.hole_number))
    return Array.from(s).sort((a, b) => a - b)
  }, [pars, ydgs])

  const playersById = useMemo(() => {
    const m = new Map<string, LineupPlayer>()
    lineup.forEach(p => m.set(p.user_id, p))
    return m
  }, [lineup])

  const holeSgMap = useMemo(() => {
    const m = new Map<string, number>()
    holeSG.forEach(h => m.set(`${h.player_id}-${h.hole}`, h.sg_hole))
    return m
  }, [holeSG])

  const totalsSG = useMemo(() => {
    const m = new Map<string, number>()
    holeSG.forEach(h => m.set(h.player_id, (m.get(h.player_id) || 0) + h.sg_hole))
    return m
  }, [holeSG])

  // --- load me
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      setMe({ id: data?.user?.id ?? null, name: data?.user?.email ?? null })
    })()
  }, [supabase])

  // --- load lineup
  useEffect(() => {
    if (!round?.id) return
    ;(async () => {
      const { data } = await supabase
        .from('round_players')
        .select('user_id, profiles(full_name)')
        .eq('round_id', round.id)
        .order('user_id', { ascending: true })
      const rows: LineupPlayer[] = ((data as any[]) || []).map(r => ({
        user_id: r.user_id,
        full_name: r.profiles?.full_name ?? null,
      }))
      setLineup(rows)

      // default the shot-entry player to me if I'm in lineup
      if (rows.length && me.id && rows.some(r => r.user_id === me.id)) {
        setForm(f => ({ ...f, playerId: me.id! }))
      }
    })()
  }, [round?.id, me.id, supabase])

  // --- load course + holes (par/ydg)
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
        const { data: c } = await supabase.from('courses').select('id, name').eq('id', courseId).maybeSingle()
        setCourse(c as any)
        const { data: ch } = await supabase
          .from('course_holes')
          .select('hole_number, par')
          .eq('course_id', courseId)
          .order('hole_number', { ascending: true })
        setPars((ch as ParRow[]) || [])
      }
      const { data: th } = await supabase
        .from('tee_set_holes')
        .select('hole_number, yardage')
        .eq('tee_set_id', round.tee_set_id)
        .order('hole_number', { ascending: true })
      setYdgs((th as YdgRow[]) || [])
    })()
  }, [round?.tee_set_id, supabase])

  // --- load SG views
  async function loadViews() {
    if (!round?.id) return
    const { data: s, error: e1 } = await supabase
      .from('v_shots_sg')
      .select('*')
      .eq('round_id', round.id)
      .order('player_id', { ascending: true })
      .order('hole', { ascending: true })
      .order('shot_no', { ascending: true })
    if (e1) { setMsg(e1.message); return }
    setShots((s as ShotRow[]) || [])

    const { data: h, error: e2 } = await supabase
      .from('v_hole_sg')
      .select('*')
      .eq('round_id', round.id)
      .order('player_id', { ascending: true })
      .order('hole', { ascending: true })
    if (e2) { setMsg(e2.message); return }
    setHoleSG((h as HoleSG[]) || [])
    setMsg('')
  }

  useEffect(() => { loadViews() }, [round?.id]) // initial

  // ----- lineup actions
  async function toggleMe() {
    if (!me.id || !round?.id) return
    if (inLineup) {
      await supabase.from('round_players').delete().eq('round_id', round.id).eq('user_id', me.id)
    } else {
      await supabase.from('round_players').insert({ round_id: round.id, user_id: me.id })
      setForm(f => ({ ...f, playerId: me.id! }))
    }
    // refresh
    const { data } = await supabase
      .from('round_players')
      .select('user_id, profiles(full_name)')
      .eq('round_id', round.id)
      .order('user_id', { ascending: true })
    const rows: LineupPlayer[] = ((data as any[]) || []).map(r => ({
      user_id: r.user_id,
      full_name: r.profiles?.full_name ?? null,
    }))
    setLineup(rows)
  }

  // ----- shot utils
  function lastShotFor(playerId: string, hole: number) {
    const list = shots.filter(s => s.player_id === playerId && s.hole === hole)
    if (!list.length) return null
    return list.reduce((a, b) => (a.shot_no > b.shot_no ? a : b))
  }

  async function addShot() {
    try {
      if (!round?.id) throw new Error('Missing round')
      if (!form.playerId) throw new Error('Pick a player')
      if (!form.hole) throw new Error('Pick a hole')

      let start_lie = form.start_lie
      let start_distance = Number(form.start_distance)
      let end_lie = form.end_lie
      let end_distance = Number(form.end_distance)
      let penalty = !!form.penalty
      let holed = !!form.holed

      // snap from previous
      if (form.snapFromPrev) {
        const last = lastShotFor(form.playerId, Number(form.hole))
        if (last) {
          start_lie = last.end_lie
          start_distance = last.end_distance
        } else if (ydgByHole.get(Number(form.hole)) != null) {
          start_lie = 'tee'
          start_distance = Number(ydgByHole.get(Number(form.hole))) || 0
        }
      }

      // if holed, enforce end_lie / end_distance
      if (holed) {
        end_lie = 'hole'
        end_distance = 0
      }

      // determine next shot_no
      const last = lastShotFor(form.playerId, Number(form.hole))
      const nextNo = last ? last.shot_no + 1 : 1

      const { error } = await supabase.from('shots').insert({
        round_id: round.id,
        player_id: form.playerId,
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

      await loadViews()

      // Prepare form for next shot on same hole
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
      if (!round?.id) throw new Error('Missing round')
      if (!form.playerId) throw new Error('Pick a player')
      if (!form.hole) throw new Error('Pick a hole')

      const last = lastShotFor(form.playerId, Number(form.hole))
      if (!last) return
      const { error } = await supabase.from('shots').delete().eq('id', last.id)
      if (error) throw error
      await loadViews()
    } catch (e: any) {
      setMsg(e.message || 'Failed to undo')
    }
  }

  const courseLine = (() => {
    const teeLabel = tee?.tee_name || tee?.name
    const rs = (tee?.rating ? `${tee.rating}` : '') + (tee?.slope ? `/${tee.slope}` : '')
    return [course?.name || 'Course', teeLabel ? `• ${teeLabel}` : '', rs ? `(${rs})` : ''].filter(Boolean).join(' ')
  })()

  return (
    <div style={{ padding: 16, display: 'grid', gap: 18 }}>
      <div>
        <h2 style={{ margin: 0 }}>{round?.name || 'Round'}</h2>
        <div style={{ color: '#555' }}>
          {courseLine} • SG Model: <b>{round?.sg_model || 'pga_tour'}</b>
        </div>
        <div style={{ color: '#777', marginTop: 2 }}>
          {new Date(round?.round_date || Date.now()).toLocaleDateString()}
        </div>
      </div>

      {/* Lineup */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h3 style={{ margin: '8px 0' }}>Lineup</h3>
        {me.id && (
          <button onClick={toggleMe}>
            {inLineup ? 'Leave lineup' : 'Add me to lineup'}
          </button>
        )}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: 420 }}>
          <thead><tr><th style={th}>Player</th></tr></thead>
          <tbody>
            {lineup.length === 0 ? (
              <tr><td style={td}>No players yet.</td></tr>
            ) : (
              lineup.map(p => (
                <tr key={p.user_id}>
                  <td style={td}>{p.full_name || p.user_id.slice(0, 8)}{me.id === p.user_id ? ' (you)' : ''}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Shot Entry */}
      <div>
        <h3 style={{ margin: '8px 0' }}>Shot Entry</h3>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(6, minmax(140px, 1fr))', alignItems: 'end' }}>
          <label>Player
            <select
              value={form.playerId}
              onChange={e => setForm(f => ({ ...f, playerId: e.target.value }))}
              style={input}
            >
              <option value="">Pick player</option>
              {lineup.map(p => <option key={p.user_id} value={p.user_id}>{p.full_name || p.user_id.slice(0, 8)}</option>)}
            </select>
          </label>

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

      {/* Computed SG */}
      <div style={{ overflowX: 'auto', marginTop: 4 }}>
        <h3 style={{ margin: '8px 0' }}>Computed Strokes Gained</h3>
        <table style={{ borderCollapse: 'collapse', minWidth: 760 }}>
          <thead>
            <tr>
              <th style={th}>Player</th>
              {holesList.map(h => <th key={h} style={th}>H{h}</th>)}
              <th style={th}>Total</th>
            </tr>
          </thead>
          <tbody>
            {lineup.map(p => {
              const pid = p.user_id
              return (
                <tr key={pid}>
                  <td style={td}>{p.full_name || pid.slice(0, 8)}{me.id === pid ? ' (you)' : ''}</td>
                  {holesList.map(h => {
                    const val = holeSgMap.get(`${pid}-${h}`)
                    return <td key={h} style={tdRight}>{val?.toFixed(2) ?? '-'}</td>
                  })}
                  <td style={tdRight}><b>{(totalsSG.get(pid) ?? 0).toFixed(2)}</b></td>
                </tr>
              )
            })}
            {lineup.length === 0 && (
              <tr><td style={td} colSpan={holesList.length + 2}>No players yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Shot detail */}
      <details>
        <summary>Shot detail</summary>
        <div style={{ overflowX: 'auto', marginTop: 8 }}>
          <table style={{ borderCollapse: 'collapse', minWidth: 920 }}>
            <thead>
              <tr>
                <th style={th}>Player</th>
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
              {shots.map(s => {
                const pp = playersById.get(s.player_id)
                return (
                  <tr key={s.id}>
                    <td style={td}>{pp?.full_name || s.player_id.slice(0, 8)}</td>
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
                )
              })}
              {shots.length === 0 && <tr><td style={td} colSpan={12}>No shots yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </details>

      {msg && <div style={{ color: '#c00' }}>{msg}</div>}
    </div>
  )
}

/* ======= little styles ======= */
const th: React.CSSProperties = { textAlign: 'left', padding: 6, borderBottom: '1px solid #eee', background: '#fafafa', whiteSpace: 'nowrap' }
const thRight: React.CSSProperties = { ...th, textAlign: 'right' }
const td: React.CSSProperties = { padding: 6, borderBottom: '1px solid #f2f2f2' }
const tdRight: React.CSSProperties = { ...td, textAlign: 'right' }
const tdCenter: React.CSSProperties = { ...td, textAlign: 'center' }
const input: React.CSSProperties = { width: '100%', padding: 6, border: '1px solid #ddd', borderRadius: 6 }

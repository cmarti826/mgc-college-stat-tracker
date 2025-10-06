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
  sg_model: 'pga_tour' | 'ncaa_d1'
  e_start: number
  e_end: number
  sg: number
}

type HoleSG = {
  round_id: string
  player_id: string
  hole: number
  sg_hole: number
}

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

export default function ScoreForm({ round, players }: { round: any; players: any[] }) {
  const supabase = getSupabaseBrowser()

  // --- SG data
  const [shots, setShots] = useState<ShotRow[]>([])
  const [holeSG, setHoleSG] = useState<HoleSG[]>([])
  const [msg, setMsg] = useState('')

  // --- Course/Tee/Holes data
  const [course, setCourse] = useState<Course | null>(null)
  const [tee, setTee] = useState<TeeSet | null>(null)
  const [parRows, setParRows] = useState<ParRow[]>([])
  const [ydgRows, setYdgRows] = useState<YdgRow[]>([])

  // ---------- Load SG view data ----------
  useEffect(() => {
    if (!round?.id) return
    ;(async () => {
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
    })()
  }, [round?.id, supabase])

  // ---------- Load Course/Tee/Hole info ----------
  useEffect(() => {
    if (!round?.tee_set_id) return
    ;(async () => {
      setMsg((m) => m) // keep any SG error visible

      // tee set (gives us course_id)
      const { data: t, error: eTee } = await supabase
        .from('tee_sets')
        .select('id, course_id, tee_name, name, rating, slope')
        .eq('id', round.tee_set_id)
        .maybeSingle()
      if (eTee) { setMsg(eTee.message); return }
      setTee(t as any)

      const courseId = (t as any)?.course_id
      if (!courseId) return

      // course
      const { data: c, error: eCourse } = await supabase
        .from('courses')
        .select('id, name')
        .eq('id', courseId)
        .maybeSingle()
      if (eCourse) { setMsg(eCourse.message); return }
      setCourse(c as any)

      // pars (course_holes)
      const { data: pars, error: ePar } = await supabase
        .from('course_holes')
        .select('hole_number, par')
        .eq('course_id', courseId)
        .order('hole_number', { ascending: true })
      if (ePar) { setMsg(ePar.message); return }
      setParRows((pars as ParRow[]) || [])

      // yardages (tee_set_holes)
      const { data: ydgs, error: eYdg } = await supabase
        .from('tee_set_holes')
        .select('hole_number, yardage')
        .eq('tee_set_id', round.tee_set_id)
        .order('hole_number', { ascending: true })
      if (eYdg) { setMsg(eYdg.message); return }
      setYdgRows((ydgs as YdgRow[]) || [])
    })()
  }, [round?.tee_set_id, supabase])

  // ---------- Memos ----------
  const playersById = useMemo(() => {
    const m = new Map<string, any>()
    ;(players || []).forEach(p => m.set(p.user_id || p.id, p))
    return m
  }, [players])

  const holesList = useMemo(() => {
    // Prefer hole numbers from parRows, then yardage rows, then SG data
    const s = new Set<number>()
    parRows.forEach(h => s.add(h.hole_number))
    ydgRows.forEach(h => s.add(h.hole_number))
    if (s.size === 0) {
      holeSG.forEach(h => s.add(h.hole))
    }
    return Array.from(s).sort((a, b) => a - b)
  }, [parRows, ydgRows, holeSG])

  const holeSgMap = useMemo(() => {
    const m = new Map<string, number>() // key: playerId-hole
    holeSG.forEach(h => m.set(`${h.player_id}-${h.hole}`, h.sg_hole))
    return m
  }, [holeSG])

  const totalsSG = useMemo(() => {
    const m = new Map<string, number>()
    holeSG.forEach(h => {
      m.set(h.player_id, (m.get(h.player_id) || 0) + h.sg_hole)
    })
    return m
  }, [holeSG])

  // Helpers for par/yardage grids
  const parByHole = useMemo(() => {
    const m = new Map<number, number | null>()
    parRows.forEach(r => m.set(r.hole_number, r.par))
    return m
  }, [parRows])

  const ydgByHole = useMemo(() => {
    const m = new Map<number, number | null>()
    ydgRows.forEach(r => m.set(r.hole_number, r.yardage))
    return m
  }, [ydgRows])

  const sumRange = (map: Map<number, number | null>, start: number, end: number) => {
    let s = 0
    for (let h = start; h <= end; h++) {
      const v = map.get(h)
      if (typeof v === 'number') s += v
    }
    return s || null
  }

  const courseLine = (() => {
    const teeLabel = tee?.tee_name || tee?.name
    const rs =
      (tee?.rating ? `${tee.rating}` : '') +
      (tee?.slope ? `/${tee.slope}` : '')
    return [course?.name || 'Course', teeLabel ? `• ${teeLabel}` : '', rs ? `(${rs})` : '']
      .filter(Boolean)
      .join(' ')
  })()

  // ---------- Render ----------
  return (
    <div style={{ padding: 12, display: 'grid', gap: 14 }}>
      {/* Header */}
      <div>
        <h2 style={{ margin: 0 }}>{round?.name || 'Round'}</h2>
        <div style={{ color: '#555' }}>
          {courseLine} • SG Model: <b>{shots[0]?.sg_model || round?.sg_model || 'pga_tour'}</b>
        </div>
        <div style={{ color: '#777', marginTop: 2 }}>
          {new Date(round?.round_date || Date.now()).toLocaleDateString()}
        </div>
      </div>

      {/* Par & Yardage grid */}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gap: 10 }}>
          {/* PAR ROWS */}
          <div style={{ display: 'grid', gridAutoFlow: 'column', gap: 6, alignItems: 'center', minWidth: 880 }}>
            <CellH>Par</CellH>
            {/* 1–9 */}
            {Array.from({ length: 9 }, (_, i) => i + 1).map(h => (
              <Cell key={`p-${h}`} center>{parByHole.get(h) ?? '-'}</Cell>
            ))}
            <CellH center>Out</CellH>
            {/* 10–18 */}
            {Array.from({ length: 9 }, (_, i) => i + 10).map(h => (
              <Cell key={`p-${h}`} center>{parByHole.get(h) ?? '-'}</Cell>
            ))}
            <CellH center>In</CellH>
            <CellH center>Total</CellH>
          </div>
          <div style={{ display: 'grid', gridAutoFlow: 'column', gap: 6, alignItems: 'center', minWidth: 880 }}>
            <Cell muted>#</Cell>
            {Array.from({ length: 9 }, (_, i) => i + 1).map(h => (
              <Cell key={`hn-${h}`} center muted>{h}</Cell>
            ))}
            <Cell muted />
            {Array.from({ length: 9 }, (_, i) => i + 10).map(h => (
              <Cell key={`hn-${h}`} center muted>{h}</Cell>
            ))}
            <Cell muted />
            <Cell muted />
          </div>
          {/* Totals for Par */}
          <div style={{ display: 'grid', gridAutoFlow: 'column', gap: 6, alignItems: 'center', minWidth: 880 }}>
            <Cell muted>Total Par</Cell>
            {/* 1–9 cells blank to align */}
            {Array.from({ length: 9 }, (_, i) => <Cell key={`pb-${i}`} muted />)}
            <Cell center bold>{sumRange(parByHole, 1, 9) ?? '-'}</Cell>
            {Array.from({ length: 9 }, (_, i) => <Cell key={`pa-${i}`} muted />)}
            <Cell center bold>{sumRange(parByHole, 10, 18) ?? '-'}</Cell>
            <Cell center bold>
              {(() => {
                const o = sumRange(parByHole, 1, 9)
                const n = sumRange(parByHole, 10, 18)
                return (o && n)
                  ? (o + n)
                  : (holesList.length
                      ? sumRange(parByHole, Math.min(...holesList), Math.max(...holesList))
                      : '-')
              })()}
            </Cell>
          </div>

          <div style={{ height: 6 }} />

          {/* YARDAGE ROWS */}
          <div style={{ display: 'grid', gridAutoFlow: 'column', gap: 6, alignItems: 'center', minWidth: 880 }}>
            <CellH>Yardage</CellH>
            {Array.from({ length: 9 }, (_, i) => i + 1).map(h => (
              <Cell key={`y-${h}`} center>{ydgByHole.get(h) ?? '-'}</Cell>
            ))}
            <CellH center>Out</CellH>
            {Array.from({ length: 9 }, (_, i) => i + 10).map(h => (
              <Cell key={`y-${h}`} center>{ydgByHole.get(h) ?? '-'}</Cell>
            ))}
            <CellH center>In</CellH>
            <CellH center>Total</CellH>
          </div>
          {/* Yardage totals */}
          <div style={{ display: 'grid', gridAutoFlow: 'column', gap: 6, alignItems: 'center', minWidth: 880 }}>
            <Cell muted>Total Yds</Cell>
            {Array.from({ length: 9 }, (_, i) => <Cell key={`yb-${i}`} muted />)}
            <Cell center bold>{sumRange(ydgByHole, 1, 9) ?? '-'}</Cell>
            {Array.from({ length: 9 }, (_, i) => <Cell key={`ya-${i}`} muted />)}
            <Cell center bold>{sumRange(ydgByHole, 10, 18) ?? '-'}</Cell>
            <Cell center bold>
              {(() => {
                const o = sumRange(ydgByHole, 1, 9)
                const n = sumRange(ydgByHole, 10, 18)
                return (o && n)
                  ? (o + n)
                  : (holesList.length
                      ? sumRange(ydgByHole, Math.min(...holesList), Math.max(...holesList))
                      : '-')
              })()}
            </Cell>
          </div>
        </div>
      </div>

      {/* Computed SG table */}
      <div style={{ overflowX: 'auto', marginTop: 4 }}>
        <h3 style={{ margin: '8px 0' }}>Computed Strokes Gained</h3>
        <table style={{ borderCollapse: 'collapse', minWidth: 720 }}>
          <thead>
            <tr>
              <th style={th}>Player</th>
              {holesList.map(h => (
                <th key={h} style={th}>H{h}</th>
              ))}
              <th style={th}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(players || []).map((p) => {
              const pid = p.user_id || p.id
              return (
                <tr key={pid}>
                  <td style={td}>{p.full_name || p.name || pid.slice(0, 8)}</td>
                  {holesList.map(h => {
                    const val = holeSgMap.get(`${pid}-${h}`)
                    return <td key={h} style={tdRight}>{val?.toFixed(2) ?? '-'}</td>
                  })}
                  <td style={tdRight}><b>{(totalsSG.get(pid) ?? 0).toFixed(2)}</b></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Optional shot detail for debugging */}
      <details>
        <summary>Shot detail</summary>
        <div style={{ overflowX: 'auto', marginTop: 8 }}>
          <table style={{ borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr>
                <th style={th}>Player</th>
                <th style={th}>Hole</th>
                <th style={th}>#</th>
                <th style={th}>Start</th>
                <th style={th}>Dist</th>
                <th style={th}>End</th>
                <th style={th}>Dist</th>
                <th style={th}>Penalty</th>
                <th style={th}>Holed</th>
                <th style={th}>E(start)</th>
                <th style={th}>E(end)</th>
                <th style={th}>SG</th>
              </tr>
            </thead>
            <tbody>
              {shots.map(s => {
                const pp = playersById.get(s.player_id)
                return (
                  <tr key={s.id}>
                    <td style={td}>{pp?.full_name || pp?.name || s.player_id.slice(0,8)}</td>
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
            </tbody>
          </table>
        </div>
      </details>

      {msg && <div style={{ color: '#c00' }}>{msg}</div>}
    </div>
  )
}

/* ---------- Tiny presentational helpers ---------- */
function CellH({ children, center }: { children: any; center?: boolean }) {
  return (
    <div
      style={{
        padding: '6px 8px',
        fontWeight: 600,
        background: '#fafafa',
        border: '1px solid #eee',
        textAlign: center ? 'center' as const : 'left',
      }}
    >
      {children}
    </div>
  )
}

function Cell({
  children,
  center,
  muted,
  bold,
}: {
  children?: any // <-- make optional to allow <Cell muted />
  center?: boolean
  muted?: boolean
  bold?: boolean
}) {
  return (
    <div
      style={{
        padding: '6px 8px',
        border: '1px solid #f2f2f2',
        textAlign: center ? 'center' as const : 'left',
        color: muted ? '#777' : undefined,
        fontWeight: bold ? 700 : 400,
        whiteSpace: 'nowrap',
      }}
    >
      {children ?? null}
    </div>
  )
}

const th: React.CSSProperties = { textAlign: 'left', padding: 6, borderBottom: '1px solid #eee', background: '#fafafa', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: 6, borderBottom: '1px solid #f2f2f2' }
const tdRight: React.CSSProperties = { ...td, textAlign: 'right' }
const tdCenter: React.CSSProperties = { ...td, textAlign: 'center' }

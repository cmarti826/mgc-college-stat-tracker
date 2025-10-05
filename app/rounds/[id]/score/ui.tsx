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

export default function ScoreForm({ round, players }: { round: any; players: any[] }) {
  const supabase = getSupabaseBrowser()
  const [shots, setShots] = useState<ShotRow[]>([])
  const [holeSG, setHoleSG] = useState<HoleSG[]>([])
  const [msg, setMsg] = useState('')

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

  const playersById = useMemo(() => {
    const m = new Map<string, any>()
    ;(players || []).forEach(p => m.set(p.user_id || p.id, p))
    return m
  }, [players])

  const holes = useMemo(() => {
    const set = new Set<number>()
    holeSG.forEach(h => set.add(h.hole))
    return Array.from(set).sort((a, b) => a - b)
  }, [holeSG])

  const holeSgMap = useMemo(() => {
    const m = new Map<string, number>() // key: playerId-hole
    holeSG.forEach(h => m.set(`${h.player_id}-${h.hole}`, h.sg_hole))
    return m
  }, [holeSG])

  const totals = useMemo(() => {
    const m = new Map<string, number>()
    holeSG.forEach(h => {
      m.set(h.player_id, (m.get(h.player_id) || 0) + h.sg_hole)
    })
    return m
  }, [holeSG])

  return (
    <div style={{ padding: 12 }}>
      <h2>Computed Strokes Gained ({shots[0]?.sg_model || round?.sg_model || 'pga_tour'})</h2>

      {msg && <div style={{ color: '#c00', marginBottom: 8 }}>{msg}</div>}

      {/* Per-hole SG table */}
      <div style={{ overflowX: 'auto', marginBottom: 16 }}>
        <table style={{ borderCollapse: 'collapse', minWidth: 720 }}>
          <thead>
            <tr>
              <th style={th}>Player</th>
              {holes.map(h => (
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
                  {holes.map(h => {
                    const val = holeSgMap.get(`${pid}-${h}`)
                    return <td key={h} style={tdRight}>{val?.toFixed(2) ?? '-'}</td>
                  })}
                  <td style={tdRight}><b>{(totals.get(pid) ?? 0).toFixed(2)}</b></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Shot detail (optional) */}
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
    </div>
  )
}

const th: React.CSSProperties = { textAlign: 'left', padding: 6, borderBottom: '1px solid #eee', background: '#fafafa', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: 6, borderBottom: '1px solid #f2f2f2' }
const tdRight: React.CSSProperties = { ...td, textAlign: 'right' }
const tdCenter: React.CSSProperties = { ...td, textAlign: 'center' }

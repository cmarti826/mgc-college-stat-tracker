'use client'

import { supabase } from '@/lib/supabaseClient'
import { useEffect, useMemo, useState } from 'react'

type RoundRow = {
  id: string
  name: string | null
  round_date: string
  course_id: string
  status: 'scheduled' | 'open' | 'closed'
  type: 'tournament' | 'qualifying' | 'practice'
}

type Player = { id: string; full_name: string | null }

type HoleRow = {
  hole: number
  strokes: number
  putts: number
  fir: boolean | null
  gir: boolean | null
  up_down: boolean | null
  sand_save: boolean | null
  penalties: number
  sg_ott: number
  sg_app: number
  sg_arg: number
  sg_putt: number
  notes: string
}

export default function ScoringPage() {
  const [rounds, setRounds] = useState<RoundRow[]>([])
  const [courseNames, setCourseNames] = useState<Record<string, string>>({})
  const [roundId, setRoundId] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [userId, setUserId] = useState('')

  const [rows, setRows] = useState<HoleRow[]>(
    Array.from({ length: 18 }, (_, i) => ({
      hole: i + 1,
      strokes: 4,
      putts: 2,
      fir: null,
      gir: null,
      up_down: null,
      sand_save: null,
      penalties: 0,
      sg_ott: 0,
      sg_app: 0,
      sg_arg: 0,
      sg_putt: 0,
      notes: '',
    }))
  )

  // Totals / quick summary
  const totals = useMemo(() => {
    const s = rows.reduce(
      (a, r) => {
        a.strokes += Number(r.strokes || 0)
        a.putts += Number(r.putts || 0)
        a.pen += Number(r.penalties || 0)
        a.sg_ott += Number(r.sg_ott || 0)
        a.sg_app += Number(r.sg_app || 0)
        a.sg_arg += Number(r.sg_arg || 0)
        a.sg_putt += Number(r.sg_putt || 0)
        a.fir += r.fir ? 1 : 0
        a.gir += r.gir ? 1 : 0
        a.up_down += r.up_down ? 1 : 0
        a.sand += r.sand_save ? 1 : 0
        return a
      },
      {
        strokes: 0,
        putts: 0,
        pen: 0,
        sg_ott: 0,
        sg_app: 0,
        sg_arg: 0,
        sg_putt: 0,
        fir: 0,
        gir: 0,
        up_down: 0,
        sand: 0,
      }
    )
    const pct = (num: number) => `${Math.round((num / 18) * 100)}%`
    return {
      ...s,
      sg_total: Number((s.sg_ott + s.sg_app + s.sg_arg + s.sg_putt).toFixed(2)),
      fir_pct: pct(s.fir),
      gir_pct: pct(s.gir),
    }
  }, [rows])

  // Load OPEN rounds and their course names
  useEffect(() => {
    ;(async () => {
      const { data: rds, error } = await supabase
        .from('rounds')
        .select('id,name,round_date,course_id,status,type')
        .eq('status', 'open')
        .order('round_date', { ascending: false })

      if (error) {
        alert(error.message)
        return
      }

      const roundsList = (rds || []) as RoundRow[]
      setRounds(roundsList)

      // fetch course names for distinct course_ids
      const ids = Array.from(new Set(roundsList.map((r) => r.course_id))).filter(Boolean)
      if (ids.length) {
        const { data: cs, error: e2 } = await supabase
          .from('courses')
          .select('id,name')
          .in('id', ids)

        if (!e2 && cs) {
          const map: Record<string, string> = {}
          cs.forEach((c: any) => (map[c.id] = c.name))
          setCourseNames(map)
        }
      }
    })()
  }, [])

  // When a round is chosen, load its players (from round_players -> profiles)
  useEffect(() => {
    if (!roundId) {
      setPlayers([])
      setUserId('')
      return
    }
    ;(async () => {
      const { data: rp, error } = await supabase
        .from('round_players')
        .select('user_id')
        .eq('round_id', roundId)

      if (error) {
        alert(error.message)
        return
      }

      const ids = (rp || []).map((x: any) => x.user_id)
      if (!ids.length) {
        setPlayers([])
        setUserId('')
        return
      }

      const { data: profs, error: e2 } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', ids)

      if (e2) {
        alert(e2.message)
        return
      }

      const mapped = (profs || []).map((p: any) => ({
        id: p.id as string,
        full_name: p.full_name ?? null,
      }))
      setPlayers(mapped)
      // keep previously selected user if still present, else clear
      if (!mapped.find((m) => m.id === userId)) setUserId('')
    })()
  }, [roundId])

  // Save all 18 holes for the selected player
  const saveAll = async () => {
    if (!roundId || !userId) return alert('Select a round and player first.')

    for (const r of rows) {
      const { error } = await supabase.rpc('upsert_score', {
        p_round: roundId,
        p_user: userId,
        p_hole: r.hole,
        p_strokes: Number(r.strokes || 0),
        p_putts: Number(r.putts || 0),
        p_fir: r.fir,
        p_gir: r.gir,
        p_up_down: r.up_down,
        p_sand_save: r.sand_save,
        p_penalties: Number(r.penalties || 0),
        p_sg_ott: Number(r.sg_ott || 0),
        p_sg_app: Number(r.sg_app || 0),
        p_sg_arg: Number(r.sg_arg || 0),
        p_sg_putt: Number(r.sg_putt || 0),
        p_notes: r.notes,
      })
      if (error) return alert(`Hole ${r.hole}: ${error.message}`)
    }
    alert('Saved!')
  }

  const onNum = (v: string) => (v === '' ? 0 : Number(v))

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h2>Open Scoring</h2>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        <label>
          Round{' '}
          <select
            value={roundId}
            onChange={(e) => {
              setRoundId(e.target.value)
              setUserId('')
            }}
          >
            <option value="">Select</option>
            {rounds.map((r) => (
              <option key={r.id} value={r.id}>
                {new Date(r.round_date).toLocaleDateString()} — {courseNames[r.course_id] || 'Course'}{' '}
                {r.name ? `(${r.name})` : ''}
              </option>
            ))}
          </select>
        </label>

        <label>
          Player{' '}
          <select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Select</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name || p.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>

        <button onClick={saveAll} disabled={!roundId || !userId}>
          Save All 18
        </button>
      </div>

      {/* Quick totals */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12, color: '#333' }}>
        <span><strong>Strokes:</strong> {totals.strokes}</span>
        <span><strong>Putts:</strong> {totals.putts}</span>
        <span><strong>Pen:</strong> {totals.pen}</span>
        <span><strong>FIR:</strong> {totals.fir} ({totals.fir_pct})</span>
        <span><strong>GIR:</strong> {totals.gir} ({totals.gir_pct})</span>
        <span><strong>SG:</strong> {totals.sg_total.toFixed(2)} [OTT {totals.sg_ott.toFixed(2)} / APP {totals.sg_app.toFixed(2)} / ARG {totals.sg_arg.toFixed(2)} / PUTT {totals.sg_putt.toFixed(2)}]</span>
      </div>

      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>Hole</th>
            <th>Strokes</th>
            <th>Putts</th>
            <th>FIR</th>
            <th>GIR</th>
            <th>Up&Down</th>
            <th>Sand</th>
            <th>Pen</th>
            <th>SG OTT</th>
            <th>SG APP</th>
            <th>SG ARG</th>
            <th>SG PUTT</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.hole}>
              <td>{r.hole}</td>
              <td>
                <input
                  type="number"
                  value={r.strokes}
                  onChange={(e) => {
                    const v = [...rows]
                    v[idx].strokes = onNum(e.target.value)
                    setRows(v)
                  }}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={r.putts}
                  onChange={(e) => {
                    const v = [...rows]
                    v[idx].putts = onNum(e.target.value)
                    setRows(v)
                  }}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={!!r.fir}
                  onChange={(e) => {
                    const v = [...rows]
                    v[idx].fir = e.target.checked
                    setRows(v)
                  }}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={!!r.gir}
                  onChange={(e) => {
                    const v = [...rows]
                    v[idx].gir = e.target.checked
                    setRows(v)
                  }}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={!!r.up_down}
                  onChange={(e) => {
                    const v = [...rows]
                    v[idx].up_down = e.target.checked
                    setRows(v)
                  }}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={!!r.sand_save}
                  onChange={(e) => {
                    const v = [...rows]
                    v[idx].sand_save = e.target.checked
                    setRows(v)
                  }}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={r.penalties}
                  onChange={(e) => {
                    const v = [...rows]
                    v[idx].penalties = onNum(e.target.value)
                    setRows(v)
                  }}
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.01"
                  value={r.sg_ott}
                  onChange={(e) => {
                    const v = [...rows]
                    v[idx].sg_ott = Number(e.target.value || 0)
                    setRows(v)
                  }}
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.01"
                  value={r.sg_app}
                  onChange={(e) => {
                    const v = [...rows]
                    v[idx].sg_app = Number(e.target.value || 0)
                    setRows(v)
                  }}
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.01"
                  value={r.sg_arg}
                  onChange={(e) => {
                    const v = [...rows]
                    v[idx].sg_arg = Number(e.target.value || 0)
                    setRows(v)
                  }}
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.01"
                  value={r.sg_putt}
                  onChange={(e) => {
                    const v = [...rows]
                    v[idx].sg_putt = Number(e.target.value || 0)
                    setRows(v)
                  }}
                />
              </td>
              <td>
                <input
                  value={r.notes}
                  onChange={(e) => {
                    const v = [...rows]
                    v[idx].notes = e.target.value
                    setRows(v)
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

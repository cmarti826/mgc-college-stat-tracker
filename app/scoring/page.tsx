'use client'
import { supabase } from '@/lib/supabaseClient'
import { useEffect, useState } from 'react'

type Round = {
  id: string
  name: string | null
  round_date: string
  courses: { name: string } | { name: string }[] | null
}
type Player = { id: string; full_name: string | null }

const courseLabel = (c: Round['courses']) =>
  Array.isArray(c) ? c[0]?.name : c?.name


export default function Scoring() {
  const [rounds, setRounds] = useState<Round[]>([])
  const [roundId, setRoundId] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [userId, setUserId] = useState('')

  const [rows, setRows] = useState(
    Array.from({ length: 18 }, (_, i) => ({
      hole: i + 1,
      strokes: 4,
      putts: 2,
      fir: null as null | boolean,
      gir: null as null | boolean,
      up_down: null as null | boolean,
      sand_save: null as null | boolean,
      penalties: 0,
      sg_ott: 0,
      sg_app: 0,
      sg_arg: 0,
      sg_putt: 0,
      notes: '',
    }))
  )

  // Load open rounds (latest first)
  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase
        .from('rounds')
        .select('id,name,round_date,courses(name)')
        .eq('status', 'open')
        .order('round_date', { ascending: false })
      if (error) {
        alert(error.message)
        return
      }
      setRounds((data as Round[]) || [])
    })()
  }, [])

  // Load players for selected round (via profiles)
  useEffect(() => {
    if (!roundId) return
    ;(async () => {
      // get user_ids from round_players
      const { data: rp, error: e1 } = await supabase
        .from('round_players')
        .select('user_id')
        .eq('round_id', roundId)

      if (e1) {
        alert(e1.message)
        return
      }
      const userIds = (rp || []).map((r) => r.user_id)
      if (userIds.length === 0) {
        setPlayers([])
        return
      }

      const { data: profs, error: e2 } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)

      if (e2) {
        alert(e2.message)
        return
      }

      const mapped: Player[] = (profs || []).map((p) => ({
        id: p.id as string,
        full_name: (p as any).full_name ?? null,
      }))
      setPlayers(mapped)
    })()
  }, [roundId])

  const save = async () => {
    if (!roundId || !userId) return alert('Select round and player first')
    for (const r of rows) {
      const { error } = await supabase.rpc('upsert_score', {
        p_round: roundId,
        p_user: userId,
        p_hole: r.hole,
        p_strokes: r.strokes,
        p_putts: r.putts,
        p_fir: r.fir,
        p_gir: r.gir,
        p_up_down: r.up_down,
        p_sand_save: r.sand_save,
        p_penalties: r.penalties,
        p_sg_ott: r.sg_ott,
        p_sg_app: r.sg_app,
        p_sg_arg: r.sg_arg,
        p_sg_putt: r.sg_putt,
        p_notes: r.notes,
      })
      if (error) return alert(`Hole ${r.hole}: ${error.message}`)
    }
    alert('Saved!')
  }

  return (
    <div>
      <h2>Open Scoring</h2>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
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
                {new Date(r.round_date).toLocaleDateString()} — {r.courses?.name}{' '}
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

        <button onClick={save}>Save All 18</button>
      </div>

      <table style={{ marginTop: 16, borderCollapse: 'collapse' }}>
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
                    v[idx].strokes = parseInt(e.target.value || '0', 10)
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
                    v[idx].putts = parseInt(e.target.value || '0', 10)
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
                    v[idx].penalties = parseInt(e.target.value || '0', 10)
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
                    v[idx].sg_ott = parseFloat(e.target.value || '0')
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
                    v[idx].sg_app = parseFloat(e.target.value || '0')
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
                    v[idx].sg_arg = parseFloat(e.target.value || '0')
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
                    v[idx].sg_putt = parseFloat(e.target.value || '0')
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

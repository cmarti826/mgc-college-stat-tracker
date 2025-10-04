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

type HoleScore = {
  hole: number
  strokes: number
  putts: number
  fir: boolean
  gir: boolean
  penalties: number
  notes: string
}

type Shot = {
  shot_number: number
  start_lie: 'tee' | 'fairway' | 'rough' | 'sand' | 'recovery' | 'green'
  start_distance: number | ''
  end_lie: 'fairway' | 'rough' | 'sand' | 'recovery' | 'green' | 'holed'
  end_distance: number | ''
  penalty: number
  club?: string
  note?: string
}

export default function ScoringPage() {
  const [rounds, setRounds] = useState<RoundRow[]>([])
  const [courseNames, setCourseNames] = useState<Record<string, string>>({})
  const [roundId, setRoundId] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [userId, setUserId] = useState('')

  // hole scores (18)
  const blankScores: HoleScore[] = Array.from({ length: 18 }, (_, i) => ({
    hole: i + 1,
    strokes: 4,
    putts: 2,
    fir: false,
    gir: false,
    penalties: 0,
    notes: '',
  }))
  const [scores, setScores] = useState<HoleScore[]>(blankScores)

  // shots by hole (map of hole -> array)
  const [shots, setShots] = useState<Record<number, Shot[]>>({})

  // Totals strip
  const totals = useMemo(() => {
    const s = scores.reduce(
      (a, r) => {
        a.strokes += Number(r.strokes || 0)
        a.putts += Number(r.putts || 0)
        a.pen += Number(r.penalties || 0)
        a.fir += r.fir ? 1 : 0
        a.gir += r.gir ? 1 : 0
        return a
      },
      { strokes: 0, putts: 0, pen: 0, fir: 0, gir: 0 }
    )
    const pct = (num: number) => `${Math.round((num / 18) * 100)}%`
    return { ...s, fir_pct: pct(s.fir), gir_pct: pct(s.gir) }
  }, [scores])

  // Load open rounds + course names
  useEffect(() => {
    ;(async () => {
      const { data: rds, error } = await supabase
        .from('rounds')
        .select('id,name,round_date,course_id,status,type')
        .eq('status', 'open')
        .order('round_date', { ascending: false })
      if (error) return alert(error.message)
      const list = (rds || []) as RoundRow[]
      setRounds(list)

      const cids = Array.from(new Set(list.map((r) => r.course_id))).filter(Boolean)
      if (cids.length) {
        const { data: cs, error: e2 } = await supabase.from('courses').select('id,name').in('id', cids)
        if (!e2 && cs) {
          const map: Record<string, string> = {}
          cs.forEach((c: any) => (map[c.id] = c.name))
          setCourseNames(map)
        }
      }
    })()
  }, [])

  // Load players for round
  useEffect(() => {
    if (!roundId) {
      setPlayers([]); setUserId(''); setScores(blankScores); setShots({})
      return
    }
    ;(async () => {
      const { data: rp, error } = await supabase.from('round_players').select('user_id').eq('round_id', roundId)
      if (error) return alert(error.message)
      const ids = (rp || []).map((x: any) => x.user_id)
      if (!ids.length) { setPlayers([]); setUserId(''); return }
      const { data: profs, error: e2 } = await supabase.from('profiles').select('id, full_name').in('id', ids)
      if (e2) return alert(e2.message)
      const mapped = (profs || []).map((p: any) => ({ id: p.id as string, full_name: p.full_name ?? null }))
      setPlayers(mapped)
      if (!mapped.find((m) => m.id === userId)) setUserId('')
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId])

  // Load existing hole scores + shots when player selected
  useEffect(() => {
    if (!roundId || !userId) return
    ;(async () => {
      // scores
      const { data: sc } = await supabase
        .from('scores')
        .select('hole_number, strokes, putts, fir, gir, penalties, notes')
        .eq('round_id', roundId)
        .eq('user_id', userId)
        .order('hole_number')
      if (sc && sc.length) {
        const next = blankScores.map((r) => {
          const m = (sc as any[]).find((x) => x.hole_number === r.hole)
          return m
            ? { hole: r.hole, strokes: m.strokes ?? 0, putts: m.putts ?? 0, fir: !!m.fir, gir: !!m.gir, penalties: m.penalties ?? 0, notes: m.notes ?? '' }
            : r
        })
        setScores(next)
      } else {
        setScores(blankScores)
      }
      // shots
      const { data: sh } = await supabase
        .from('shots')
        .select('hole_number, shot_number, start_lie, start_distance, end_lie, end_distance, penalty, club, note')
        .eq('round_id', roundId)
        .eq('user_id', userId)
        .order('hole_number')
        .order('shot_number')
      const byHole: Record<number, Shot[]> = {}
      ;(sh || []).forEach((row: any) => {
        if (!byHole[row.hole_number]) byHole[row.hole_number] = []
        byHole[row.hole_number].push({
          shot_number: row.shot_number,
          start_lie: row.start_lie,
          start_distance: row.start_distance ?? '',
          end_lie: row.end_lie,
          end_distance: row.end_distance ?? '',
          penalty: row.penalty ?? 0,
          club: row.club ?? '',
          note: row.note ?? '',
        })
      })
      setShots(byHole)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, roundId])

  const saveAllScores = async () => {
    if (!roundId || !userId) return alert('Pick round + player.')
    for (const r of scores) {
      const { error } = await supabase.rpc('upsert_score', {
        p_round: roundId,
        p_user: userId,
        p_hole: r.hole,
        p_strokes: Number(r.strokes || 0),
        p_putts: Number(r.putts || 0),
        p_fir: r.fir,
        p_gir: r.gir,
        p_up_down: null,      // not tracked here
        p_sand_save: null,    // not tracked here
        p_penalties: Number(r.penalties || 0),
        p_sg_ott: 0,
        p_sg_app: 0,
        p_sg_arg: 0,
        p_sg_putt: 0,
        p_notes: r.notes || '',
      })
      if (error) return alert(`Hole ${r.hole}: ${error.message}`)
    }
    alert('Scores saved')
  }

  const saveShotsForHole = async (hole: number) => {
    if (!roundId || !userId) return alert('Pick round + player.')
    const arr = shots[hole] || []
    for (const s of arr) {
      const { error } = await supabase.rpc('upsert_shot', {
        p_round: roundId,
        p_user: userId,
        p_hole: hole,
        p_shot: s.shot_number,
        p_start_lie: s.start_lie,
        p_start_distance: s.start_distance === '' ? null : Number(s.start_distance),
        p_end_lie: s.end_lie,
        p_end_distance: s.end_distance === '' ? null : Number(s.end_distance),
        p_penalty: Number(s.penalty || 0),
        p_club: s.club || null,
        p_note: s.note || null,
      })
      if (error) return alert(`Hole ${hole}, shot ${s.shot_number}: ${error.message}`)
    }
    alert(`Saved ${arr.length} shot(s) for hole ${hole}`)
  }

  const recalcFromShots = async () => {
    if (!roundId || !userId) return alert('Pick round + player.')
    const { error } = await supabase.rpc('recalc_scores_from_shots', { p_round: roundId, p_user: userId })
    if (error) return alert(error.message)
    // reload scores
    const { data: sc } = await supabase
      .from('scores')
      .select('hole_number, strokes, putts, fir, gir, penalties, notes')
      .eq('round_id', roundId)
      .eq('user_id', userId)
      .order('hole_number')
    if (sc) {
      const next = blankScores.map((r) => {
        const m = (sc as any[]).find((x) => x.hole_number === r.hole)
        return m
          ? { hole: r.hole, strokes: m.strokes ?? 0, putts: m.putts ?? 0, fir: !!m.fir, gir: !!m.gir, penalties: m.penalties ?? 0, notes: m.notes ?? '' }
          : r
      })
      setScores(next)
    }
    alert('Recalculated from shots')
  }

  const onNum = (v: string) => (v === '' ? 0 : Number(v))

  const addShot = (hole: number) => {
    setShots((prev) => {
      const arr = prev[hole] ? [...prev[hole]] : []
      const nextNum = (arr.at(-1)?.shot_number || 0) + 1
      arr.push({
        shot_number: nextNum,
        start_lie: nextNum === 1 ? 'tee' as const : 'fairway',
        start_distance: '',
        end_lie: 'fairway',
        end_distance: '',
        penalty: 0,
        club: '',
        note: '',
      })
      return { ...prev, [hole]: arr }
    })
  }

  const removeShot = (hole: number, shot_number: number) => {
    setShots((prev) => {
      const arr = (prev[hole] || []).filter((s) => s.shot_number !== shot_number)
      // reindex shot numbers
      arr.forEach((s, i) => (s.shot_number = i + 1))
      return { ...prev, [hole]: arr }
    })
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Open Scoring</h2>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        <label>
          Round{' '}
          <select
            value={roundId}
            onChange={(e) => { setRoundId(e.target.value); setUserId('') }}
          >
            <option value="">Select</option>
            {rounds.map((r) => (
              <option key={r.id} value={r.id}>
                {new Date(r.round_date).toLocaleDateString()} — {courseNames[r.course_id] || 'Course'} {r.name ? `(${r.name})` : ''}
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

        <button onClick={saveAllScores} disabled={!roundId || !userId}>Save Hole Totals</button>
        <button onClick={recalcFromShots} disabled={!roundId || !userId}>Recalculate from Shots</button>
      </div>

      {/* Totals */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12, color: '#333' }}>
        <span><strong>Strokes:</strong> {totals.strokes}</span>
        <span><strong>Putts:</strong> {totals.putts}</span>
        <span><strong>Pen:</strong> {totals.pen}</span>
        <span><strong>FIR:</strong> {totals.fir} ({totals.fir_pct})</span>
        <span><strong>GIR:</strong> {totals.gir} ({totals.gir_pct})</span>
      </div>

      {/* Hole totals table (no SG inputs) */}
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>Hole</th>
            <th>Strokes</th>
            <th>Putts</th>
            <th>FIR</th>
            <th>GIR</th>
            <th>Pen</th>
            <th>Notes</th>
            <th>Shots</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((r, idx) => (
            <tr key={r.hole}>
              <td>{r.hole}</td>
              <td>
                <input type="number" value={r.strokes}
                  onChange={(e) => { const v=[...scores]; v[idx].strokes = onNum(e.target.value); setScores(v) }} />
              </td>
              <td>
                <input type="number" value={r.putts}
                  onChange={(e) => { const v=[...scores]; v[idx].putts = onNum(e.target.value); setScores(v) }} />
              </td>
              <td>
                <input type="checkbox" checked={!!r.fir}
                  onChange={(e) => { const v=[...scores]; v[idx].fir = e.target.checked; setScores(v) }} />
              </td>
              <td>
                <input type="checkbox" checked={!!r.gir}
                  onChange={(e) => { const v=[...scores]; v[idx].gir = e.target.checked; setScores(v) }} />
              </td>
              <td>
                <input type="number" value={r.penalties}
                  onChange={(e) => { const v=[...scores]; v[idx].penalties = onNum(e.target.value); setScores(v) }} />
              </td>
              <td>
                <input value={r.notes}
                  onChange={(e) => { const v=[...scores]; v[idx].notes = e.target.value; setScores(v) }} />
              </td>
              <td>
                <HoleShotsEditor
                  hole={r.hole}
                  value={shots[r.hole] || []}
                  setValue={(arr) => setShots((prev) => ({ ...prev, [r.hole]: arr }))}
                  onSave={() => saveShotsForHole(r.hole)}
                  onAdd={() => addShot(r.hole)}
                  onRemove={(n) => removeShot(r.hole, n)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function HoleShotsEditor({
  hole,
  value,
  setValue,
  onSave,
  onAdd,
  onRemove,
}: {
  hole: number
  value: Shot[]
  setValue: (arr: Shot[]) => void
  onSave: () => void
  onAdd: () => void
  onRemove: (shot_number: number) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setOpen(!open)}>
        {open ? 'Hide' : 'Show'} ({value.length})
      </button>
      {open && (
        <div style={{ marginTop: 8, border: '1px solid #eee', padding: 8, borderRadius: 8 }}>
          {value.length === 0 && <div style={{ color: '#666', marginBottom: 6 }}>No shots yet.</div>}
          {value.map((s, i) => (
            <div key={s.shot_number} style={{ display: 'grid', gridTemplateColumns: 'auto 110px 100px 110px 100px 70px auto auto', gap: 6, alignItems: 'center', marginBottom: 6 }}>
              <div>#{s.shot_number}</div>
              <select value={s.start_lie} onChange={(e) => {
                const arr=[...value]; arr[i].start_lie = e.target.value as any; setValue(arr)
              }}>
                <option value="tee">tee</option>
                <option value="fairway">fairway</option>
                <option value="rough">rough</option>
                <option value="sand">sand</option>
                <option value="recovery">recovery</option>
                <option value="green">green</option>
              </select>
              <input type="number" placeholder="start dist" value={s.start_distance as any}
                onChange={(e) => { const arr=[...value]; arr[i].start_distance = e.target.value === '' ? '' : Number(e.target.value); setValue(arr) }} />
              <select value={s.end_lie} onChange={(e) => {
                const arr=[...value]; arr[i].end_lie = e.target.value as any; setValue(arr)
              }}>
                <option value="fairway">fairway</option>
                <option value="rough">rough</option>
                <option value="sand">sand</option>
                <option value="recovery">recovery</option>
                <option value="green">green</option>
                <option value="holed">holed</option>
              </select>
              <input type="number" placeholder="end dist" value={s.end_distance as any}
                onChange={(e) => { const arr=[...value]; arr[i].end_distance = e.target.value === '' ? '' : Number(e.target.value); setValue(arr) }} />
              <input type="number" placeholder="pen" value={s.penalty}
                onChange={(e) => { const arr=[...value]; arr[i].penalty = Number(e.target.value || 0); setValue(arr) }} />
              <input placeholder="club" value={s.club || ''} onChange={(e) => { const arr=[...value]; arr[i].club = e.target.value; setValue(arr) }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" onClick={() => onRemove(s.shot_number)}>✕</button>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onAdd}>+ Add Shot</button>
            <button type="button" onClick={onSave} disabled={value.length === 0}>Save Shots</button>
          </div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
            Tip: Putts = shots where <code>start_lie</code> is <em>green</em>. Strokes = shots + penalties.
          </div>
        </div>
      )}
    </div>
  )
}

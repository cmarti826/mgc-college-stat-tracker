'use client'
import { useEffect, useMemo, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabaseClient'

export default function ScoreForm({ round, players }: { round: any, players: any[] }) {
  const supabase = getSupabaseBrowser()
  const [playerId, setPlayerId] = useState<string>('')
  const [holes, setHoles] = useState(() =>
    Array.from({ length: 18 }, (_, i) => ({ hole: i+1, strokes: '', putts: '', fir: false, gir: false, up_down: false, sand_save: false }))
  )
  const [msg, setMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (players?.length && !playerId) setPlayerId(players[0].id)
  }, [players])

  async function save() {
    setSaving(true); setMsg(null)
    // upsert player_round
    const { data: pr, error: e1 } = await supabase.from('player_rounds')
      .upsert({ round_id: round.round_id, player_id: playerId }, { onConflict: 'round_id,player_id' })
      .select('id').single()
    if (e1) { setMsg(e1.message); setSaving(false); return }

    // Upsert each hole
    const rows = holes
      .filter(h => h.strokes !== '')
      .map(h => ({
        player_round_id: pr!.id,
        hole: h.hole,
        strokes: Number(h.strokes),
        putts: h.putts === '' ? null : Number(h.putts),
        fir: h.fir || null,
        gir: h.gir || null,
        up_down: h.up_down || null,
        sand_save: h.sand_save || null
      }))

    if (rows.length === 0) { setMsg('Enter at least one hole.'); setSaving(false); return }

    // Delete existing then insert (simple and safe for demo)
    await supabase.from('hole_stats').delete().eq('player_round_id', pr!.id)
    const { error: e2 } = await supabase.from('hole_stats').insert(rows)
    if (e2) { setMsg(e2.message); setSaving(false); return }

    setMsg('Saved! Totals updated.')
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold">{round?.round_name ?? `${round?.type} @ ${round?.course_name}`}</h1>
            <div className="text-sm text-gray-600">{round?.date} • {round?.team_name} • {round?.course_name} ({round?.tee_name})</div>
          </div>
          <div>
            <select className="input" value={playerId} onChange={e=>setPlayerId(e.target.value)}>
              {players?.map(p => <option key={p.id} value={p.id}>{p.full_name ?? p.email}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-2">Hole</th>
              <th className="p-2">Strokes</th>
              <th className="p-2">Putts</th>
              <th className="p-2">FIR</th>
              <th className="p-2">GIR</th>
              <th className="p-2">Up&Down</th>
              <th className="p-2">Sand Save</th>
            </tr>
          </thead>
          <tbody>
            {holes.map((h, idx) => (
              <tr key={idx} className="border-t">
                <td className="p-2">{h.hole}</td>
                <td className="p-2"><input className="input" type="number" min={1} value={h.strokes} onChange={e=>{
                  const v=e.target.value; const copy=[...holes]; copy[idx]={...h, strokes:v}; setHoles(copy)
                }}/></td>
                <td className="p-2"><input className="input" type="number" min={0} value={h.putts} onChange={e=>{
                  const v=e.target.value; const copy=[...holes]; copy[idx]={...h, putts:v}; setHoles(copy)
                }}/></td>
                <td className="p-2"><input type="checkbox" checked={h.fir} onChange={e=>{
                  const copy=[...holes]; copy[idx]={...h, fir:e.target.checked}; setHoles(copy)
                }}/></td>
                <td className="p-2"><input type="checkbox" checked={h.gir} onChange={e=>{
                  const copy=[...holes]; copy[idx]={...h, gir:e.target.checked}; setHoles(copy)
                }}/></td>
                <td className="p-2"><input type="checkbox" checked={h.up_down} onChange={e=>{
                  const copy=[...holes]; copy[idx]={...h, up_down:e.target.checked}; setHoles(copy)
                }}/></td>
                <td className="p-2"><input type="checkbox" checked={h.sand_save} onChange={e=>{
                  const copy=[...holes]; copy[idx]={...h, sand_save:e.target.checked}; setHoles(copy)
                }}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="btn btn-primary" onClick={save} disabled={!playerId || saving}>
        {saving ? 'Saving...' : 'Save Scores'}
      </button>
      {msg && <p className="text-sm text-gray-700">{msg}</p>}
      <p className="text-xs text-gray-500">Any team member can edit any player’s scores for this round (RLS).</p>
    </div>
  )
}

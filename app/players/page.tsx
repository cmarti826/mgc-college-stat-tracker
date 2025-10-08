// app/players/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

type Player = { id: string; full_name: string; grad_year: number | null }
type Mapping = { player_id: string | null } | null

export default function PlayersPage() {
  const supabase = useMemo(() => supabaseBrowser(), [])
  const [players, setPlayers] = useState<Player[]>([])
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newGrad, setNewGrad] = useState<number | ''>('')

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    // current mapping
    let mp: Mapping = null
    if (user?.id) {
      const { data } = await supabase
        .from('user_players')
        .select('player_id')
        .eq('user_id', user.id)
        .maybeSingle()
      mp = data ?? null
    }
    setMyPlayerId(mp?.player_id ?? null)

    // all players
    const { data: list } = await supabase
      .from('players')
      .select('id, full_name, grad_year')
      .order('full_name', { ascending: true })
    setPlayers((list ?? []) as Player[])
  }

  useEffect(() => { load() }, [])

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    await supabase.from('players').insert({
      full_name: newName.trim(),
      grad_year: newGrad === '' ? null : Number(newGrad),
    })
    setNewName('')
    setNewGrad('')
    await load()
  }

  async function linkMe(playerId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) return alert('Please sign in.')
    await supabase
      .from('user_players')
      .upsert({ user_id: user.id, player_id: playerId }, { onConflict: 'user_id' })
    setMyPlayerId(playerId)
    alert('Linked! Your rounds and filters will use this player.')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1>Players</h1>
      </div>

      {/* Add player */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Add Player</div>
        </div>
        <form onSubmit={addPlayer} className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Full name</label>
            <input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="First Last" />
          </div>
          <div>
            <label className="label">Grad year (optional)</label>
            <input className="input" type="number" value={newGrad} onChange={e => setNewGrad(e.target.value === '' ? '' : Number(e.target.value))} placeholder="2028" />
          </div>
          <div className="flex items-end">
            <button className="btn-on-light" type="submit">Add Player</button>
          </div>
        </form>
      </div>

      {/* Current link */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Your Player Link</div>
            <div className="card-subtle">
              {myPlayerId ? 'You are linked to a roster player. You can change it below.' : 'Not linked yet. Choose a player below.'}
            </div>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th><th>Grad</th><th>Link</th>
            </tr>
          </thead>
          <tbody>
            {players.map(p => (
              <tr key={p.id}>
                <td>{p.full_name}</td>
                <td>{p.grad_year ?? '—'}</td>
                <td>
                  {myPlayerId === p.id ? (
                    <span className="chip chip-blue">Linked</span>
                  ) : (
                    <button className="btn-on-light-outline" onClick={() => linkMe(p.id)}>Link me</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

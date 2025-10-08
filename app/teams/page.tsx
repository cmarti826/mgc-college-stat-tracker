// app/teams/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

type Player = { id: string; full_name: string; grad_year: number | null }
type Member = { id: string; role: string; player_id: string; players: Player }
type Team = { id: string; name: string; team_members: Member[] }

export default function TeamsPage() {
  const supabase = useMemo(() => supabaseBrowser(), [])
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [newTeam, setNewTeam] = useState('')

  async function load() {
    const { data: t } = await supabase
      .from('teams')
      .select('id, name, team_members(id, role, player_id, players(id, full_name, grad_year))')
      .order('name', { ascending: true })
    setTeams((t ?? []) as any)

    const { data: p } = await supabase
      .from('players')
      .select('id, full_name, grad_year')
      .order('full_name', { ascending: true })
    setPlayers((p ?? []) as Player[])
  }

  useEffect(() => { load() }, [])

  async function addTeam(e: React.FormEvent) {
    e.preventDefault()
    if (!newTeam.trim()) return
    await supabase.from('teams').insert({ name: newTeam.trim() })
    setNewTeam('')
    await load()
  }

  async function addMember(teamId: string, playerId: string, role: string) {
    if (!playerId) return
    await supabase.from('team_members').insert({ team_id: teamId, player_id: playerId, role })
    await load()
  }

  async function removeMember(memberId: string) {
    await supabase.from('team_members').delete().eq('id', memberId)
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1>Teams</h1>
      </div>

      {/* Add team */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Add Team</div>
        </div>
        <form onSubmit={addTeam} className="flex flex-col sm:flex-row gap-3">
          <input className="input" placeholder="Team name (e.g., HCU Huskies)" value={newTeam} onChange={e => setNewTeam(e.target.value)} />
          <button className="btn-on-light" type="submit">Create Team</button>
        </form>
      </div>

      {/* Teams + roster */}
      {teams.length === 0 ? (
        <div className="card">No teams yet.</div>
      ) : (
        teams.map(team => (
          <div key={team.id} className="card">
            <div className="card-header">
              <div className="card-title">{team.name}</div>
            </div>

            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Player</th><th>Grad</th><th>Role</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {(team.team_members ?? []).map(m => (
                    <tr key={m.id}>
                      <td>{m.players?.full_name ?? '—'}</td>
                      <td>{m.players?.grad_year ?? '—'}</td>
                      <td>{m.role}</td>
                      <td className="text-right">
                        <button className="btn-on-light-outline" onClick={() => removeMember(m.id)}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add member row */}
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="label">Select Player</label>
                <select id={`player-${team.id}`} className="select">
                  <option value="">— choose —</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Role</label>
                <select id={`role-${team.id}`} className="select" defaultValue="player">
                  <option value="player">player</option>
                  <option value="coach">coach</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  className="btn-on-light-outline"
                  onClick={() => {
                    const sel = document.getElementById(`player-${team.id}`) as HTMLSelectElement
                    const role = document.getElementById(`role-${team.id}`) as HTMLSelectElement
                    addMember(team.id, sel.value, role.value)
                  }}
                >
                  Add to Team
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

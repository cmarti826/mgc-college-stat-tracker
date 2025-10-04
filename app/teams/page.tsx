'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Team = { id: string; name: string }
type Member = { user_id: string; role: 'player' | 'coach' | 'admin'; full_name: string | null }

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [teamId, setTeamId] = useState<string>('')
  const [newTeam, setNewTeam] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Member['role']>('player')
  const [rename, setRename] = useState('')
  const [msg, setMsg] = useState('')

  const selected = useMemo(() => teams.find(t => t.id === teamId) || null, [teams, teamId])

  // Load teams on mount
  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase.from('teams').select('id,name').order('created_at')
      if (error) { setMsg(error.message); return }
      setTeams((data as any) || [])
      if (data?.length && !teamId) setTeamId(data[0].id)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load members when team changes
  useEffect(() => {
    if (!teamId) { setMembers([]); setRename(''); return }
    ;(async () => {
      const { data: t } = await supabase.from('teams').select('name').eq('id', teamId).single()
      setRename((t?.name as string) || '')
      const { data, error } = await supabase
        .from('team_members')
        .select('user_id, role, profiles!inner(id, full_name)')
        .eq('team_id', teamId)
        .order('role', { ascending: false })
      if (error) { setMsg(error.message); return }
      const rows = (data || []).map((r: any) => ({
        user_id: r.user_id,
        role: r.role,
        full_name: r.profiles?.full_name ?? null,
      }))
      setMembers(rows)
      setMsg('')
    })()
  }, [teamId])

  // Create team: also add current user as coach and set their default_team_id
  const createTeam = async () => {
    setMsg('')
    const name = newTeam.trim()
    if (!name) return alert('Enter a team name')
    const { data: me } = await supabase.auth.getUser()
    if (!me?.user) return alert('Sign in first')

    const { data: t, error } = await supabase.from('teams').insert({ name }).select('id,name').single()
    if (error) return setMsg(error.message)
    const tid = t!.id as string

    // upsert profile (in case it doesn't exist) and set default team
    await supabase.from('profiles').upsert({ id: me.user.id, full_name: me.user.email, role: 'coach', default_team_id: tid }, { onConflict: 'id' })

    // add creator as coach
    await supabase.from('team_members').upsert({ team_id: tid, user_id: me.user.id, role: 'coach' })

    setTeams(prev => [...prev, { id: tid, name: t!.name }])
    setTeamId(tid)
    setNewTeam('')
    setMsg('Team created ✅')
  }

  const renameTeam = async () => {
    if (!teamId) return
    const { error } = await supabase.from('teams').update({ name: rename.trim() || selected?.name }).eq('id', teamId)
    if (error) return setMsg(error.message)
    setTeams(prev => prev.map(t => (t.id === teamId ? { ...t, name: rename.trim() || t.name } : t)))
    setMsg('Renamed ✅')
  }

  const addByEmail = async () => {
    if (!teamId || !email.trim()) return
    // Use RPC (works only if the user has signed in once)
    const { error } = await supabase.rpc('add_team_member_by_email', {
      p_team: teamId,
      p_email: email.trim(),
      p_role: role,
    })
    if (error) {
      // Fallback: tell the coach why it failed
      return setMsg(error.message + ' — ask them to sign in once so their account exists.')
    }
    setEmail('')
    setRole('player')
    // reload members
    const { data, error: e2 } = await supabase
      .from('team_members')
      .select('user_id, role, profiles!inner(id, full_name)')
      .eq('team_id', teamId)
    if (!e2) {
      const rows = (data || []).map((r: any) => ({ user_id: r.user_id, role: r.role, full_name: r.profiles?.full_name ?? null }))
      setMembers(rows)
    }
    setMsg('Member added ✅')
  }

  const removeMember = async (uid: string) => {
    if (!teamId) return
    const { error } = await supabase.from('team_members').delete().eq('team_id', teamId).eq('user_id', uid)
    if (error) return setMsg(error.message)
    setMembers(prev => prev.filter(m => m.user_id !== uid))
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: 12 }}>Teams</h1>

      {/* Create team */}
      <section style={{ marginBottom: 18 }}>
        <h3>Create a Team</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input placeholder="Team name" value={newTeam} onChange={(e) => setNewTeam(e.target.value)} />
          <button onClick={createTeam}>Create</button>
        </div>
      </section>

      {/* Select / manage */}
      <section>
        <h3>Manage Team</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
          <label>
            Team{' '}
            <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">Select</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>

          {!!selected && (
            <>
              <input value={rename} onChange={(e) => setRename(e.target.value)} />
              <button onClick={renameTeam}>Rename</button>
            </>
          )}
        </div>

        {teamId ? (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 640 }}>
                <thead>
                  <tr>
                    <th style={th}>Member</th>
                    <th style={th}>Role</th>
                    <th style={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr><td style={td} colSpan={3}>No members yet.</td></tr>
                  ) : (
                    members.map((m) => (
                      <tr key={m.user_id}>
                        <td style={td}>{m.full_name || m.user_id.slice(0, 8)}</td>
                        <td style={td}>{m.role}</td>
                        <td style={td}>
                          <button onClick={() => removeMember(m.user_id)}>Remove</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 8, maxWidth: 680 }}>
              <input placeholder="Add by email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <select value={role} onChange={(e) => setRole(e.target.value as Member['role'])}>
                <option value="player">player</option>
                <option value="coach">coach</option>
                <option value="admin">admin</option>
              </select>
              <button onClick={addByEmail}>Add Member</button>
            </div>
          </>
        ) : (
          <div style={{ color: '#666' }}>Pick a team to manage members.</div>
        )}
      </section>

      {msg && <div style={{ marginTop: 12, color: msg.startsWith('No user') || msg.startsWith('Error') ? '#c00' : '#2a6' }}>{msg}</div>}
    </div>
  )
}

const th: React.CSSProperties = { textAlign: 'left', padding: 8, borderBottom: '1px solid #eee', background: '#fafafa' }
const td: React.CSSProperties = { padding: 8, borderBottom: '1px solid #f2f2f2' }

'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import RoleGate from '@/components/RoleGate'

type Team = { id: string; name: string }
type Role = 'player' | 'coach' | 'admin'
type Member = { user_id: string; role: Role; full_name: string | null }

export default function TeamsPage() {
  return (
    <RoleGate allow={['coach', 'admin']}>
      <TeamsInner />
    </RoleGate>
  )
}

function TeamsInner() {
  const [teams, setTeams] = useState<Team[]>([])
  const [teamId, setTeamId] = useState<string>('')
  const [newTeam, setNewTeam] = useState('')
  const [rename, setRename] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('player')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  const selected = useMemo(
    () => teams.find((t) => t.id === teamId) || null,
    [teams, teamId]
  )

  // Load teams on mount, prefer default team from profile if present
  useEffect(() => {
    ;(async () => {
      setMsg('')
      const { data: tms, error } = await supabase
        .from('teams')
        .select('id,name')
        .order('created_at')

      if (error) { setMsg(error.message); return }
      const list = (tms as Team[]) || []
      setTeams(list)

      const { data: u } = await supabase.auth.getUser()
      const uid = u?.user?.id
      if (uid) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('default_team_id')
          .eq('id', uid)
          .maybeSingle()
        const def = (prof as any)?.default_team_id as string | undefined
        if (def && list.some(t => t.id === def)) {
          setTeamId(def)
          return
        }
      }
      if (list.length && !teamId) setTeamId(list[0].id)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load members & current name when team changes
  useEffect(() => {
    if (!teamId) { setMembers([]); setRename(''); return }
    loadMembers(teamId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId])

  async function loadMembers(tid: string) {
    setMsg('')
    setInviteLink(null)

    const { data: t, error: e1 } = await supabase
      .from('teams')
      .select('name')
      .eq('id', tid)
      .maybeSingle()
    if (!e1 && t) setRename((t as any).name as string)

    const { data: tm, error: e2 } = await supabase
      .from('team_members')
      .select('user_id, role')
      .eq('team_id', tid)
      .order('role', { ascending: false })
    if (e2) { setMsg(e2.message); return }

    const ids = ((tm as any[]) || []).map(m => m.user_id)
    const profMap: Record<string, string | null> = {}
    if (ids.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', ids)
      ;(profs as any[] || []).forEach(p => { profMap[p.id] = p.full_name ?? null })
    }

    const rows: Member[] = ((tm as any[]) || []).map(m => ({
      user_id: m.user_id,
      role: m.role,
      full_name: profMap[m.user_id] ?? null,
    }))
    setMembers(rows)
  }

  // Create a team; add current user as coach; set default_team_id
  const createTeam = async () => {
    setMsg('')
    const name = newTeam.trim()
    if (!name) return alert('Enter a team name')
    setBusy(true)
    try {
      const { data: u } = await supabase.auth.getUser()
      const me = u?.user
      if (!me) throw new Error('Sign in first')

      const { data: t, error } = await supabase
        .from('teams')
        .insert({ name })
        .select('id,name')
        .single()
      if (error) throw error
      const tid = (t as any).id as string

      await supabase.from('profiles').upsert(
        { id: me.id, full_name: me.email, role: 'coach', default_team_id: tid },
        { onConflict: 'id' }
      )

      await supabase
        .from('team_members')
        .upsert({ team_id: tid, user_id: me.id, role: 'coach' })

      setTeams(prev => [...prev, { id: tid, name }])
      setTeamId(tid)
      setNewTeam('')
      setMsg('Team created ✅')
    } catch (e: any) {
      setMsg(e.message || 'Error creating team')
    } finally {
      setBusy(false)
    }
  }

  const renameTeam = async () => {
    if (!teamId) return
    const name = rename.trim()
    if (!name) return
    setBusy(true)
    try {
      const { error } = await supabase
        .from('teams')
        .update({ name })
        .eq('id', teamId)
      if (error) throw error
      setTeams(prev => prev.map(t => (t.id === teamId ? { ...t, name } : t)))
      setMsg('Renamed ✅')
    } catch (e: any) {
      setMsg(e.message || 'Error renaming team')
    } finally {
      setBusy(false)
    }
  }

  // Invite via server API (uses service role; also adds to team)
  const addByEmail = async () => {
    if (!teamId || !email.trim()) return
    setBusy(true)
    setInviteLink(null)
    setMsg('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Sign in required')

      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email: email.trim(), teamId, role }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Invite failed')

      if (json.action_link) setInviteLink(json.action_link as string)

      setEmail('')
      setRole('player')
      await loadMembers(teamId)
      setMsg(json.status === 'invited' ? 'Invite sent ✅' : 'Magic link created & member added ✅')
    } catch (e: any) {
      setMsg(e.message || 'Error adding member')
    } finally {
      setBusy(false)
    }
  }

  const removeMember = async (uid: string) => {
    if (!teamId) return
    setBusy(true)
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', uid)
      if (error) throw error
      setMembers(prev => prev.filter(m => m.user_id !== uid))
      setMsg('Member removed ✅')
    } catch (e: any) {
      setMsg(e.message || 'Error removing member')
    } finally {
      setBusy(false)
    }
  }

  const copyLink = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setMsg('Invite link copied ✅')
    } catch {
      setMsg('Could not copy link')
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: 12 }}>Teams</h1>

      {/* Create team */}
      <section style={{ marginBottom: 18 }}>
        <h3>Create a Team</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            placeholder="Team name"
            value={newTeam}
            onChange={(e) => setNewTeam(e.target.value)}
          />
          <button onClick={createTeam} disabled={busy || !newTeam.trim()}>
            Create
          </button>
        </div>
      </section>

      {/* Manage team */}
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
              <button onClick={renameTeam} disabled={busy || !rename.trim()}>Rename</button>
            </>
          )}
        </div>

        {!teamId ? (
          <div style={{ color: '#666' }}>Pick a team to manage members.</div>
        ) : (
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
                          <button onClick={() => removeMember(m.user_id)} disabled={busy}>Remove</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 8, maxWidth: 720 }}>
              <input
                placeholder="Add by email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="player">player</option>
                <option value="coach">coach</option>
                <option value="admin">admin</option>
              </select>
              <button onClick={addByEmail} disabled={busy || !email.trim()}>Add Member</button>
            </div>

            {inviteLink && (
              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <code style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 520 }}>
                  {inviteLink}
                </code>
                <button onClick={copyLink}>Copy link</button>
              </div>
            )}
          </>
        )}
      </section>

      {msg && (
        <div style={{ marginTop: 12, color: msg.toLowerCase().includes('error') ? '#c00' : '#2a6' }}>
          {msg}
        </div>
      )}
    </div>
  )
}

const th: React.CSSProperties = { textAlign: 'left', padding: 8, borderBottom: '1px solid #eee', background: '#fafafa' }
const td: React.CSSProperties = { padding: 8, borderBottom: '1px solid #f2f2f2' }

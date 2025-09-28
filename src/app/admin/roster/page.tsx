'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Team   = { id:string; name:string }
type Player = { id:string; display_name:string; graduation_year:number|null }
type Invite = { player_id:string; email:string|null; code:string|null; expires_at:string|null }

export default function RosterAdminPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [teamId, setTeamId] = useState<string>('')

  const [players, setPlayers] = useState<Player[]>([])
  const [invites, setInvites] = useState<Record<string, Invite>>({})

  // form
  const [name, setName] = useState('')
  const [grad, setGrad] = useState<string>('')        // keep as string for input
  const [email, setEmail] = useState('')

  const [err, setErr] = useState<string|null>(null)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string|null>(null)

  // ---- Load teams the user can access (RLS controls visibility) ----
  const loadTeams = async () => {
    setErr(null)
    const { data, error } = await supabase
      .from('teams')
      .select('id,name')
      .order('name')
    if (error) { setErr(error.message); return }
    const list = (data ?? []) as Team[]
    setTeams(list)
    // preserve current team if still present; else pick first
    setTeamId(prev => (list.some(t => t.id === prev) ? prev : (list[0]?.id ?? '')))
  }

  // ---- Load roster + invites for selected team ----
  const loadRosterFor = async (tid: string) => {
    if (!tid) { setPlayers([]); setInvites({}); return }

    const { data: tr, error: er } = await supabase
      .from('team_roster').select('player_id').eq('team_id', tid)
    if (er) { setErr(er.message); return }
    const ids = (tr ?? []).map((x:any)=> x.player_id)

    // players
    if (ids.length) {
      const { data: p, error: ep } = await supabase
        .from('players')
        .select('id,display_name,graduation_year')
        .in('id', ids)
        .order('display_name')
      if (ep) { setErr(ep.message); return }
      setPlayers((p ?? []) as Player[])
    } else {
      setPlayers([])
    }

    // invites
    if (ids.length) {
      const { data: inv, error: einv } = await supabase
        .from('invites')
        .select('player_id,email,code,expires_at')
        .eq('team_id', tid)
        .in('player_id', ids)
      if (einv) { setErr(einv.message); return }
      const map: Record<string, Invite> = {}
      for (const row of inv ?? []) map[(row as any).player_id] = row as Invite
      setInvites(map)
    } else {
      setInvites({})
    }
  }

  useEffect(() => { loadTeams() }, [])
  useEffect(() => { loadRosterFor(teamId) }, [teamId])

  // ---- Actions ----
  const addPlayer = async () => {
    if (!teamId || !name.trim()) return
    setSaving(true); setErr(null)
    try {
      const gradInt = grad.trim() === '' ? null : Number(grad)
      const { error } = await supabase.rpc('create_player_with_invite', {
        p_team: teamId,
        p_display: name.trim(),
        p_grad: gradInt,
        p_email: email.trim() || null
      })
      if (error) throw error
      setName(''); setGrad(''); setEmail('')
      await loadRosterFor(teamId)
    } catch (e:any) {
      setErr(e.message ?? 'Failed to add')
    } finally {
      setSaving(false)
    }
  }

  const regenCode = async (playerId: string) => {
    if (!teamId) return
    setBusyId(playerId); setErr(null)
    try {
      const { error } = await supabase.rpc('regenerate_join_code', {
        p_team: teamId, p_player: playerId
      })
      if (error) throw error
      await loadRosterFor(teamId)
    } catch (e:any) {
      setErr(e.message ?? 'Failed to regenerate')
    } finally {
      setBusyId(null)
    }
  }

  const copy = async (txt: string | null | undefined) => {
    if (!txt) return
    await navigator.clipboard.writeText(txt)
  }

  return (
    <div className="space-y-4">
      {/* Header with Team selector */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Roster</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Team:</span>
          <select
            className="rounded border px-2 py-1"
            value={teamId}
            onChange={e => setTeamId(e.target.value)}
          >
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            {!teams.length && <option value="">No teams</option>}
          </select>
        </div>
      </div>

      {err && <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{err}</div>}

      {/* Add Player */}
      <div className="rounded border bg-white p-3">
        <div className="mb-2 text-sm text-gray-600">Add Player to <b>{teams.find(t=>t.id===teamId)?.name ?? '—'}</b></div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="w-64 rounded border px-2 py-1"
            placeholder="Display name"
            value={name}
            onChange={e=>setName(e.target.value)}
          />
          <input
            className="w-32 rounded border px-2 py-1"
            placeholder="Graduation (e.g., 2028)"
            value={grad}
            onChange={e=>setGrad(e.target.value.replace(/[^0-9]/g,''))}
          />
          <input
            className="w-80 rounded border px-2 py-1"
            placeholder="Email (optional — creates a join code)"
            value={email}
            onChange={e=>setEmail(e.target.value)}
          />
          <button
            onClick={addPlayer}
            disabled={saving || !name.trim() || !teamId}
            className="rounded bg-[#0B6B3A] px-3 py-1.5 text-white disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
        <div className="mt-1 text-xs text-gray-500">
          Email creates/refreshes a <b>Join Code</b> for that player (expires in 14 days).
        </div>
      </div>

      {/* Roster Table */}
      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Player</th>
              <th className="px-3 py-2 text-left">Grad</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Join Code</th>
              <th className="px-3 py-2 text-left">Expires</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {players.map(p => {
              const inv = invites[p.id]
              return (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2">{p.display_name}</td>
                  <td className="px-3 py-2">{p.graduation_year ?? '—'}</td>
                  <td className="px-3 py-2">{inv?.email ?? '—'}</td>
                  <td className="px-3 py-2">
                    {inv?.code ? (
                      <button onClick={() => copy(inv.code)} className="rounded border px-2 py-0.5">
                        {inv.code} <span className="text-xs text-gray-500">(copy)</span>
                      </button>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2">{inv?.expires_at ? inv.expires_at.slice(0,10) : '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Link className="text-[#0033A0] underline" href={`/players/${p.id}`}>Report</Link>
                      <button
                        onClick={() => regenCode(p.id)}
                        disabled={busyId === p.id || !teamId}
                        className="rounded border px-3 py-1.5"
                      >
                        {busyId === p.id ? 'Regenerating…' : 'Regenerate Code'}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {!players.length && (
              <tr>
                <td className="px-3 py-4 text-gray-600" colSpan={6}>
                  No players yet for this team.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

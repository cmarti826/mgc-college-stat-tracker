'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Team = {
  id: string
  name: string
  org_name: string | null
  sg_model: string | null
  deleted_at: string | null
}

export default function AdminTeamPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [teamId, setTeamId] = useState<string>('')

  const [name, setName] = useState('')
  const [org, setOrg] = useState('')
  const [model, setModel] = useState('ncaa_d1_men')

  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Danger zone
  const [confirmText, setConfirmText] = useState('')

  const current = useMemo(() => teams.find(t => t.id === teamId) ?? null, [teams, teamId])

  const loadTeams = async () => {
    setErr(null)
    // include deleted_at so admins can see archived teams; RLS may hide for non-admins
    const { data, error } = await supabase
      .from('teams')
      .select('id,name,org_name,sg_model,deleted_at')
      .order('name')
    if (error) { setErr(error.message); return }
    const list = (data ?? []) as Team[]
    setTeams(list)
    const pick = list.some(t => t.id === teamId) ? teamId : (list[0]?.id ?? '')
    setTeamId(pick)
    const t = list.find(x => x.id === pick)
    if (t) {
      setName(t.name)
      setOrg(t.org_name ?? '')
      setModel(t.sg_model ?? 'ncaa_d1_men')
    }
  }

  useEffect(() => { loadTeams() }, [])

  useEffect(() => {
    setInfo(null)
    const t = teams.find(x => x.id === teamId)
    if (t) {
      setName(t.name)
      setOrg(t.org_name ?? '')
      setModel(t.sg_model ?? 'ncaa_d1_men')
      setConfirmText('')
    }
  }, [teamId, teams])

  const saveMeta = async () => {
    if (!current) return
    setBusy(true); setErr(null); setInfo(null)
    try {
      const { error } = await supabase
        .from('teams')
        .update({ name: name.trim(), org_name: org.trim() || null, sg_model: model })
        .eq('id', current.id)
      if (error) throw error
      setInfo('Team updated.')
      await loadTeams()
    } catch (e: any) {
      setErr(e.message ?? 'Failed to save')
    } finally {
      setBusy(false)
    }
  }

  const archiveTeam = async () => {
    if (!current) return
    setBusy(true); setErr(null); setInfo(null)
    try {
      const { error } = await supabase.rpc('delete_team', { p_team: current.id, p_hard: false })
      if (error) throw error
      setInfo('Team archived.')
      await loadTeams()
    } catch (e:any) {
      setErr(e.message ?? 'Failed to archive team')
    } finally {
      setBusy(false)
    }
  }

  const restoreTeam = async () => {
    if (!current) return
    setBusy(true); setErr(null); setInfo(null)
    try {
      const { error } = await supabase.rpc('unarchive_team', { p_team: current.id })
      if (error) throw error
      setInfo('Team restored.')
      await loadTeams()
    } catch (e:any) {
      setErr(e.message ?? 'Failed to restore team')
    } finally {
      setBusy(false)
    }
  }

  const hardDelete = async () => {
    if (!current) return
    if (confirmText !== current.name) {
      setErr('Type the exact team name to confirm.')
      return
    }
    setBusy(true); setErr(null); setInfo(null)
    try {
      const { error } = await supabase.rpc('delete_team', { p_team: current.id, p_hard: true })
      if (error) throw error
      setInfo('Team permanently deleted.')
      setConfirmText('')
      await loadTeams()
    } catch (e:any) {
      setErr(e.message ?? 'Failed to delete team')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Team Settings</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Team:</span>
          <select
            className="rounded border px-2 py-1"
            value={teamId}
            onChange={e => setTeamId(e.target.value)}
          >
            {teams.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}{t.deleted_at ? ' (archived)' : ''}
              </option>
            ))}
            {!teams.length && <option value="">No teams</option>}
          </select>
        </div>
      </div>

      {err && <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{err}</div>}
      {info && <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">{info}</div>}

      {/* Meta */}
      {current && (
        <div className="rounded border bg-white p-3">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Team name">
              <input className="w-full rounded border px-2 py-1" value={name} onChange={e=>setName(e.target.value)} />
            </Field>
            <Field label="Organization">
              <input className="w-full rounded border px-2 py-1" value={org} onChange={e=>setOrg(e.target.value)} />
            </Field>
            <Field label="SG Model">
              <select className="w-full rounded border px-2 py-1" value={model} onChange={e=>setModel(e.target.value)}>
                <option value="ncaa_d1_men">NCAA D1 Men</option>
                <option value="pga">PGA</option>
              </select>
            </Field>
          </div>
          <div className="mt-3">
            <button
              onClick={saveMeta}
              disabled={busy || !name.trim()}
              className="rounded bg-[#0033A0] px-4 py-2 text-white disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      {current && (
        <div className="rounded border border-red-300 bg-red-50 p-3">
          <div className="mb-2 font-semibold text-red-700">Danger Zone</div>

          {!current.deleted_at ? (
            <div className="mb-3 flex items-center justify-between gap-3 rounded border bg-white p-3">
              <div>
                <div className="font-medium">Archive Team</div>
                <div className="text-sm text-gray-600">Hides the team (and its data) from all non-admin views. Reversible.</div>
              </div>
              <button onClick={archiveTeam} disabled={busy} className="rounded border border-red-600 px-3 py-1.5 text-red-700">
                Archive
              </button>
            </div>
          ) : (
            <div className="mb-3 flex items-center justify-between gap-3 rounded border bg-white p-3">
              <div>
                <div className="font-medium">Restore Team</div>
                <div className="text-sm text-gray-600">Un-archives and makes the team visible again.</div>
              </div>
              <button onClick={restoreTeam} disabled={busy} className="rounded border px-3 py-1.5">
                Restore
              </button>
            </div>
          )}

          <div className="rounded border bg-white p-3">
            <div className="font-medium text-red-700">Delete Team Permanently</div>
            <div className="mt-1 text-sm text-red-700">
              This deletes events, rounds (and shots), entries, invites, roster, and team members.
              Players themselves are not deleted. <b>This cannot be undone.</b>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                className="w-80 rounded border px-2 py-1"
                placeholder={`Type "${current.name}" to confirm`}
                value={confirmText}
                onChange={e=>setConfirmText(e.target.value)}
              />
              <button
                onClick={hardDelete}
                disabled={busy || confirmText !== current.name}
                className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-gray-600">{label}</div>
      {children}
    </label>
  )
}

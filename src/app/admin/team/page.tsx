'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Team = { id: string; name: string; sg_model: string }

const MODELS = [
  { value: 'ncaa_d1_men', label: 'NCAA D1 Men' },
  { value: 'pga', label: 'PGA Tour' },
  { value: 'default', label: 'Default' },
]

export default function TeamSettingsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newOrg, setNewOrg] = useState('')

  const load = async () => {
    setErr(null)
    const { data, error } = await supabase
      .from('teams')
      .select('id,name,sg_model')
      .order('name')
    if (error) setErr(error.message)
    else setTeams((data ?? []) as Team[])
  }

  useEffect(() => { load() }, [])

  const saveModel = async (id: string, sg_model: string) => {
    setSaving(id); setErr(null)
    const { error } = await supabase.from('teams').update({ sg_model }).eq('id', id)
    if (error) setErr(error.message)
    await load()
    setSaving(null)
  }

  const createTeam = async () => {
    if (!newName.trim()) return
    setCreating(true); setErr(null)
    const { error } = await supabase
      .from('teams')
      .insert({ name: newName.trim(), org_name: newOrg.trim() || null })
    if (error) setErr(error.message)
    setNewName(''); setNewOrg('')
    await load()
    setCreating(false)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Team Settings</h1>
      {err && <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{err}</div>}

      {!teams.length && (
        <div className="rounded border bg-white p-4">
          <div className="mb-2 text-sm text-gray-700">No teams yet. Create one:</div>
          <div className="flex flex-wrap gap-2">
            <input className="w-64 rounded border px-2 py-1" placeholder="Team name"
                   value={newName} onChange={e=>setNewName(e.target.value)} />
            <input className="w-64 rounded border px-2 py-1" placeholder="Organization (optional)"
                   value={newOrg} onChange={e=>setNewOrg(e.target.value)} />
            <button onClick={createTeam}
                    disabled={creating || !newName.trim()}
                    className="rounded bg-[#0033A0] px-3 py-1.5 text-white disabled:opacity-50">
              {creating ? 'Creating…' : 'Create Team'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {teams.map(t => (
          <div key={t.id} className="flex items-center justify-between rounded border bg-white p-3">
            <div>
              <div className="font-medium">{t.name}</div>
              <div className="text-xs text-gray-600">Current model: {t.sg_model}</div>
            </div>
            <select
              className="rounded border px-2 py-1"
              defaultValue={t.sg_model}
              onChange={e => saveModel(t.id, e.target.value)}
              disabled={saving === t.id}
            >
              {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Team = { id: string; name: string; org_name: string | null };

export default function AdminTeam() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState('');
  const [org, setOrg] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    const { data, error } = await supabase.from<Team>('teams').select('id,name,org_name').order('name');
    if (error) setErr(error.message);
    setTeams(data ?? []);
  }

  useEffect(() => { load(); }, []);

  async function createTeam() {
    setErr('');
    if (!name.trim()) return;
    const { error } = await supabase.from('teams').insert({ name: name.trim(), org_name: org || null });
    if (error) setErr(error.message);
    setName(''); setOrg('');
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Team Settings</h1>

      <div className="rounded border bg-white p-3">
        <div className="mb-2 font-medium">Create Team</div>
        <div className="flex flex-wrap gap-2">
          <input className="rounded border px-3 py-2" placeholder="Team name" value={name} onChange={e => setName(e.target.value)} />
          <input className="rounded border px-3 py-2" placeholder="Organization" value={org} onChange={e => setOrg(e.target.value)} />
          <button className="rounded bg-[#0033A0] px-3 py-2 text-white" onClick={createTeam}>Create</button>
        </div>
      </div>

      <div className="rounded border bg-white">
        <div className="border-b px-3 py-2 font-medium">My Teams</div>
        {teams.map(t => (
          <div key={t.id} className="flex items-center justify-between border-t px-3 py-2 text-sm">
            <div>
              <div className="font-medium">{t.name}</div>
              <div className="text-gray-600">{t.org_name ?? ''}</div>
            </div>
          </div>
        ))}
        {teams.length === 0 && <div className="px-3 py-3 text-sm text-gray-600">No teams yet.</div>}
      </div>

      {err && <div className="rounded border border-red-200 bg-red-50 p-2 text-red-700">{err}</div>}
    </div>
  );
}

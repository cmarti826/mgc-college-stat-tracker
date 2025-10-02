'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Team = { id: string; name: string };
type RosterRow = {
  team_id: string; player_id: string;
  display_name: string | null; graduation_year: number | null;
  invite_email: string | null; join_code: string | null; expires_at: string | null;
};

export default function RosterPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<string>('');
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [newName, setNewName] = useState('');
  const [newGrad, setNewGrad] = useState<number | ''>('');
  const [newEmail, setNewEmail] = useState('');
  const [err, setErr] = useState('');

  const selectedTeam = useMemo(() => teams.find(t => t.id === teamId) ?? null, [teams, teamId]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from<Team>('teams').select('id,name').order('name');
      setTeams(data ?? []);
      if (!teamId && data && data.length) setTeamId(data[0].id);
    })();
  }, []); // eslint-disable-line

  async function loadRoster() {
    if (!teamId) return;
    const { data, error } = await supabase
      .from<RosterRow>('v_team_roster_details')
      .select('*')
      .eq('team_id', teamId)
      .order('display_name', { ascending: true });
    if (error) setErr(error.message);
    setRows(data ?? []);
  }

  useEffect(() => { loadRoster(); }, [teamId]);

  async function addPlayer() {
    setErr('');
    if (!teamId || !newName.trim()) return;

    const { data: p, error: e1 } = await supabase
      .from('players')
      .insert({ display_name: newName.trim(), graduation_year: newGrad === '' ? null : Number(newGrad) })
      .select('id')
      .single();
    if (e1 || !p) { setErr(e1?.message ?? 'Failed to create player'); return; }

    const { error: e2 } = await supabase.from('team_roster').insert({ team_id: teamId, player_id: p.id });
    if (e2) { setErr(e2.message); return; }

    if (newEmail.trim()) {
      await supabase.from('invites').insert({
        team_id: teamId, player_id: p.id, email: newEmail.trim(),
        expires_at: new Date(Date.now() + 14*24*3600*1000).toISOString()
      });
    }

    setNewName(''); setNewGrad(''); setNewEmail('');
    await loadRoster();
  }

  async function removeFromTeam(pid: string) {
    await supabase.from('team_roster').delete().eq('team_id', teamId).eq('player_id', pid);
    await loadRoster();
  }

  async function reissueInvite(pid: string, email: string | null) {
    const target = email || newEmail || '';
    if (!target) { setErr('No email on file.'); return; }
    await supabase.from('invites').insert({
      team_id: teamId, player_id: pid, email: target,
      expires_at: new Date(Date.now() + 14*24*3600*1000).toISOString()
    });
    await loadRoster();
  }

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="mb-4 text-xl font-semibold">Roster</h1>

      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm text-gray-700">Team:</span>
        <select className="rounded border px-2 py-1" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {err && <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-red-700">{err}</div>}

      <div className="mb-6 rounded border bg-white p-4">
        <div className="mb-2 font-medium">Add Player to {selectedTeam?.name ?? 'Team'}</div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <input className="rounded border px-3 py-2" placeholder="Player name" value={newName} onChange={e => setNewName(e.target.value)} />
          <input className="rounded border px-3 py-2" placeholder="Graduation year" inputMode="numeric" value={newGrad} onChange={e => setNewGrad(e.target.value ? Number(e.target.value) : '')} />
          <input className="rounded border px-3 py-2" placeholder="Email (optional)" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
          <button className="rounded bg-[#0033A0] px-3 py-2 text-white" onClick={addPlayer}>Add</button>
        </div>
      </div>

      <div className="rounded border bg-white">
        <div className="grid grid-cols-12 gap-2 border-b px-3 py-2 text-sm font-medium">
          <div className="col-span-4">Player</div>
          <div className="col-span-1">Grad</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-2">Join Code</div>
          <div className="col-span-1">Expires</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {rows.map(r => (
          <div key={`${r.team_id}-${r.player_id}`} className="grid grid-cols-12 items-center gap-2 border-t px-3 py-2 text-sm">
            <div className="col-span-4">{r.display_name ?? '(no name)'}</div>
            <div className="col-span-1">{r.graduation_year ?? ''}</div>
            <div className="col-span-3">{r.invite_email ?? ''}</div>
            <div className="col-span-2 font-mono">{r.join_code ?? ''}</div>
            <div className="col-span-1">{r.expires_at ? new Date(r.expires_at).toLocaleDateString() : ''}</div>
            <div className="col-span-1 text-right">
              <button className="mr-2 rounded border px-2 py-1 hover:bg-gray-50" onClick={() => reissueInvite(r.player_id, r.invite_email)}>Invite</button>
              <button className="rounded border px-2 py-1 text-red-700 hover:bg-red-50" onClick={() => removeFromTeam(r.player_id)}>Remove</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="px-3 py-3 text-sm text-gray-600">No players yet.</div>}
      </div>
    </div>
  );
}

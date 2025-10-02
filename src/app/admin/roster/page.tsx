'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

// If you already have a helper that creates a browser client, import that instead.
const supabase =
  (globalThis as any).__sb ??
  ((): any => {
    const c = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    );
    (globalThis as any).__sb = c;
    return c;
  })();

type Team = { id: string; name: string };
type RosterRow = {
  team_id: string;
  player_id: string;
  display_name: string | null;
  graduation_year: number | null;
  invite_email: string | null;
  join_code: string | null;
  expires_at: string | null;
};
type Player = { id: string; display_name: string | null; graduation_year: number | null };

function fmtDate(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString();
}

export default function RosterPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<string>('');
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>('');

  // form state
  const [newName, setNewName] = useState('');
  const [newGrad, setNewGrad] = useState<number | ''>('');
  const [newEmail, setNewEmail] = useState('');

  const selectedTeam = useMemo(() => teams.find(t => t.id === teamId) ?? null, [teams, teamId]);

  // --- load teams user can administer/coach
  useEffect(() => {
    (async () => {
      setErr('');
      const { data, error } = await supabase
        .from<Team>('teams')
        .select('id,name')
        .order('name', { ascending: true });
      if (error) {
        setErr(error.message);
        setTeams([]);
        return;
      }
      setTeams(data ?? []);
      if (!teamId && data && data.length) setTeamId(data[0].id);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- load roster
  useEffect(() => {
    if (!teamId) return;
    (async () => {
      setLoading(true);
      setErr('');
      const { data, error } = await supabase
        .from<RosterRow>('v_team_roster_details')
        .select('*')
        .eq('team_id', teamId)
        .order('display_name', { ascending: true });
      if (error) {
        setErr(error.message);
        setRows([]);
      } else {
        setRows(data ?? []);
      }
      setLoading(false);
    })();
  }, [teamId]);

  async function refresh() {
    if (!teamId) return;
    setLoading(true);
    setErr('');
    const { data, error } = await supabase
      .from<RosterRow>('v_team_roster_details')
      .select('*')
      .eq('team_id', teamId)
      .order('display_name', { ascending: true });
    if (error) setErr(error.message);
    setRows(data ?? []);
    setLoading(false);
  }

  async function addPlayer() {
    setErr('');
    if (!teamId) {
      setErr('Select a team first.');
      return;
    }
    if (!newName.trim()) {
      setErr('Enter a player name.');
      return;
    }

    // 1) create player
    const { data: p, error: e1 } = await supabase
      .from<Player>('players')
      .insert({
        display_name: newName.trim(),
        graduation_year: newGrad === '' ? null : Number(newGrad),
      })
      .select('id,display_name,graduation_year')
      .single();

    if (e1 || !p) {
      setErr(e1?.message || 'Failed to create player');
      return;
    }

    // 2) add to team_roster
    const { error: e2 } = await supabase
      .from('team_roster')
      .insert({ team_id: teamId, player_id: p.id });

    if (e2) {
      setErr(e2.message);
      return;
    }

    // 3) optional invite
    if (newEmail.trim()) {
      const expiresAt = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();
      const { error: e3 } = await supabase.from('invites').insert({
        team_id: teamId,
        player_id: p.id,
        email: newEmail.trim(),
        expires_at: expiresAt,
      });
      if (e3) {
        // Not fatal for adding to roster
        setErr(`Player added, invite error: ${e3.message}`);
      }
    }

    // reset + refresh
    setNewName('');
    setNewGrad('');
    setNewEmail('');
    await refresh();
  }

  async function reissueInvite(playerId: string, emailFromRow: string | null) {
    setErr('');
    if (!teamId) return;
    const email = (emailFromRow || newEmail || '').trim();
    if (!email) {
      setErr('No email on file for this player. Enter an email above and click Add to create a fresh invite.');
      return;
    }
    const expiresAt = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();
    const { error } = await supabase.from('invites').insert({
      team_id: teamId,
      player_id: playerId,
      email,
      expires_at: expiresAt,
    });
    if (error) {
      setErr(error.message);
      return;
    }
    await refresh();
  }

  async function removeFromTeam(playerId: string) {
    setErr('');
    if (!teamId) return;
    const { error } = await supabase
      .from('team_roster')
      .delete()
      .eq('team_id', teamId)
      .eq('player_id', playerId);
    if (error) {
      setErr(error.message);
      return;
    }
    await refresh();
  }

  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Roster</h1>
        <div>
          <Link className="mr-3 underline" href="/events">Events</Link>
          <Link className="underline" href="/admin/team">Team Settings</Link>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm text-gray-700">Team:</span>
        <select
          className="rounded border px-2 py-1"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {err && (
        <div className="mb-4 rounded border border-red-400 bg-red-50 px-3 py-2 text-red-700">
          {err}
        </div>
      )}

      {/* Add player form */}
      <div className="mb-6 rounded border bg-white p-4">
        <div className="mb-2 font-medium">
          Add Player to {selectedTeam ? selectedTeam.name : 'Team'}
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <input
            className="rounded border px-3 py-2"
            placeholder="Player name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            className="rounded border px-3 py-2"
            placeholder="Graduation year (optional)"
            inputMode="numeric"
            value={newGrad}
            onChange={(e) => {
              const v = e.target.value.replace(/\D+/g, '');
              setNewGrad(v ? Number(v) : '');
            }}
          />
          <input
            className="rounded border px-3 py-2"
            placeholder="Email (optional)"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <button
            className="rounded bg-[#0033A0] px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
            onClick={addPlayer}
            disabled={loading || !teamId}
            type="button"
          >
            Add
          </button>
        </div>
        <div className="mt-1 text-xs text-gray-500">
          Email creates / refreshes a Join Code for that player (expires in 14 days).
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

        {rows.length === 0 && (
          <div className="px-3 py-3 text-sm text-gray-600">
            {loading ? 'Loading…' : 'No players yet for this team.'}
          </div>
        )}

        {rows.map((r) => (
          <div key={`${r.team_id}-${r.player_id}`} className="grid grid-cols-12 items-center gap-2 border-t px-3 py-2 text-sm">
            <div className="col-span-4">{r.display_name || '(no name)'}</div>
            <div className="col-span-1">{r.graduation_year ?? ''}</div>
            <div className="col-span-3">{r.invite_email ?? ''}</div>
            <div className="col-span-2 font-mono">{r.join_code ?? ''}</div>
            <div className="col-span-1">{fmtDate(r.expires_at)}</div>
            <div className="col-span-1 text-right">
              <button
                className="mr-2 rounded border px-2 py-1 hover:bg-gray-50"
                onClick={() => reissueInvite(r.player_id, r.invite_email)}
                type="button"
              >
                Invite
              </button>
              <button
                className="rounded border px-2 py-1 text-red-700 hover:bg-red-50"
                onClick={() => removeFromTeam(r.player_id)}
                type="button"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

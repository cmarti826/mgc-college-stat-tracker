// app/players/_components/AttachPlayer.tsx

'use client';

import { useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/client';

type Player = { id: string; full_name: string };
type Team = { id: string; name: string };

type Props = {
  players: Player[];
  teams: Team[];
};

export default function AttachPlayer({ players, teams }: Props) {
  const supabase = createBrowserSupabase();

  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function attach() {
    if (!selectedPlayerId || !selectedTeamId) {
      setStatus('Please select both a player and a team.');
      return;
    }

    setBusy(true);
    setStatus(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus('You must be logged in.');
        setBusy(false);
        return;
      }

      // 1. Link user → player
      const { error: linkErr } = await supabase
        .from('user_players')
        .upsert(
          { user_id: user.id, player_id: selectedPlayerId },
          { onConflict: 'user_id' }
        );

      if (linkErr) throw linkErr;

      // 2. Assign player → team
      const { error: teamErr } = await supabase
        .from('team_members')
        .upsert(
          { player_id: selectedPlayerId, team_id: selectedTeamId },
          { onConflict: 'player_id' }
        );

      if (teamErr) throw teamErr;

      setStatus('Player linked and assigned to team!');
      setSelectedPlayerId('');
      setSelectedTeamId('');
    } catch (err: any) {
      console.error('Attach error:', err);
      setStatus(`Error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded-xl border shadow-sm space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Player
        </label>
        <select
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={selectedPlayerId}
          onChange={(e) => setSelectedPlayerId(e.target.value)}
          disabled={busy}
        >
          <option value="">— Choose a player —</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Assign to Team
        </label>
        <select
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
          disabled={busy}
        >
          <option value="">— Choose a team —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={attach}
        disabled={busy || !selectedPlayerId || !selectedTeamId}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {busy ? 'Saving...' : 'Attach Player to Team'}
      </button>

      {status && (
        <p
          className={`text-sm font-medium p-3 rounded-md ${
            status.includes('Error')
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-green-50 text-green-800 border border-green-200'
          }`}
        >
          {status}
        </p>
      )}
    </div>
  );
}
// app/players/page.tsx

import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Player = {
  id: string;
  full_name: string;
  grad_year: number | null;
  created_at: string;
};

type TeamMember = {
  player_id: string;
  team_id: string;
};

type ScheduledRound = {
  id: string;
  player_id: string;
};

export default async function PlayersPage() {
  const supabase = createServerSupabase();

  // 1. Fetch players
  const { data: players, error: pErr } = await supabase
    .from('mgc.players')
    .select('id, full_name, grad_year, created_at')
    .order('full_name', { ascending: true });

  if (pErr) {
    return (
      <div className="p-6 text-red-600">
        Error loading players: {pErr.message}
      </div>
    );
  }

  if (!players || players.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Players</h1>
        <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
          No players found.
        </div>
      </div>
    );
  }

  // 2. Fetch team memberships
  const { data: teamMembers, error: tErr } = await supabase
    .from('mgc.team_members')
    .select('player_id, team_id');

  if (tErr) {
    console.error('Team members fetch error:', tErr);
  }

  // 3. Fetch scheduled rounds
  const { data: scheduledRounds, error: rErr } = await supabase
    .from('mgc.scheduled_rounds')
    .select('id, player_id');

  if (rErr) {
    console.error('Scheduled rounds fetch error:', rErr);
  }

  // 4. Count per player
  const teamsByPlayer = new Map<string, number>();
  (teamMembers ?? []).forEach((m: TeamMember) => {
    teamsByPlayer.set(m.player_id, (teamsByPlayer.get(m.player_id) ?? 0) + 1);
  });

  const roundsByPlayer = new Map<string, number>();
  (scheduledRounds ?? []).forEach((r: ScheduledRound) => {
    roundsByPlayer.set(r.player_id, (roundsByPlayer.get(r.player_id) ?? 0) + 1);
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Players</h1>
        <Link
          href="/players/attach"
          className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition"
        >
          Attach Player
        </Link>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700 border-b">
              <tr>
                <th className="text-left p-4 font-medium">Name</th>
                <th className="text-left p-4 font-medium">Grad Year</th>
                <th className="text-left p-4 font-medium">Teams</th>
                <th className="text-left p-4 font-medium">Rounds</th>
                <th className="text-left p-4 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {players.map((p: Player) => (
                <tr key={p.id} className="hover:bg-gray-50 transition">
                  <td className="p-4">
                    <Link
                      href={`/players/${p.id}`}
                      className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      {p.full_name}
                    </Link>
                  </td>
                  <td className="p-4 text-gray-600">{p.grad_year ?? '—'}</td>
                  <td className="p-4 text-gray-600">{teamsByPlayer.get(p.id) ?? 0}</td>
                  <td className="p-4 text-gray-600">{roundsByPlayer.get(p.id) ?? 0}</td>
                  <td className="p-4 text-gray-500 text-xs">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
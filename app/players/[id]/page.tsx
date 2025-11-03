// app/players/[id]/page.tsx

import { createServerSupabase } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

type Player = {
  id: string;
  full_name: string;
  grad_year: number | null;
  // Supabase returns team_members as an array where each item has a team array
  team_members: {
    team?: {
      name?: string;
    }[] | null;
  }[] | null;
};

type Hole = {
  strokes: number | null;
  putts: number | null;
};

type Round = {
  id: string;
  date: string;
  course: {
    name: string;
  } | null;
  holes: Hole[];
};

export default async function PlayerDetail({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase();
  const playerId = params.id;

  // 1. Fetch player with team
  const { data: player, error: playerErr } = await supabase
    .from('players')
    .select(`
      id,
      full_name,
      grad_year,
      team_members!left (
        team:teams ( name )
      )
    `)
    .eq('id', playerId)
    .single();

  if (playerErr || !player) {
    notFound();
  }

  // 2. Fetch rounds with course and holes
  const { data: rounds, error: roundsErr } = await supabase
    .from('rounds')
    .select(`
      id,
      date,
      course:courses ( name ),
      holes:holes (
        strokes,
        putts
      )
    `)
    .eq('player_id', playerId)
    .order('date', { ascending: false });

  if (roundsErr) {
    console.error('Rounds fetch error:', roundsErr);
    // Continue — show player even if rounds fail
  }

  // 3. Calculate stats
  const stats = (rounds ?? []).reduce(
    (acc, r: any) => {
      const strokes = (r.holes ?? []).reduce((s: number, h: any) => s + (h.strokes ?? 0), 0);
      const putts = (r.holes ?? []).reduce((p: number, h: any) => p + (h.putts ?? 0), 0);
      acc.totalStrokes += strokes;
      acc.totalPutts += putts;
      acc.roundCount += 1;
      return acc;
    },
    { totalStrokes: 0, totalPutts: 0, roundCount: 0 }
  );

  const avgScore = stats.roundCount > 0 ? (stats.totalStrokes / stats.roundCount).toFixed(1) : '—';
  const avgPutts = stats.roundCount > 0 ? (stats.totalPutts / stats.roundCount).toFixed(1) : '—';

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{player.full_name}</h1>
            {player.grad_year && (
              <p className="text-lg text-gray-600 mt-1">Class of {player.grad_year}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold text-indigo-600">
              {player.team_members?.[0]?.team?.[0]?.name || 'No team'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100 shadow-sm">
          <p className="text-sm font-medium text-green-700 uppercase tracking-wider">
            Rounds Played
          </p>
          <p className="text-4xl font-bold text-green-900 mt-2">{stats.roundCount}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
          <p className="text-sm font-medium text-blue-700 uppercase tracking-wider">
            Average Score
          </p>
          <p className="text-4xl font-bold text-blue-900 mt-2">{avgScore}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100 shadow-sm">
          <p className="text-sm font-medium text-purple-700 uppercase tracking-wider">
            Average Putts
          </p>
          <p className="text-4xl font-bold text-purple-900 mt-2">{avgPutts}</p>
        </div>
      </div>

      {/* Recent Rounds */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-6 border-b bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-900">Recent Rounds</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {rounds && rounds.length > 0 ? (
            rounds.map((round: any) => {
              const totalStrokes = (round.holes ?? []).reduce(
                (s: number, h: any) => s + (h.strokes ?? 0),
                0
              );
              const totalPutts = (round.holes ?? []).reduce(
                (p: number, h: any) => p + (h.putts ?? 0),
                0
              );

              return (
                <div
                  key={round.id}
                  className="p-5 hover:bg-gray-50 transition-colors duration-150"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {round.course?.name || 'Unknown Course'}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {format(new Date(round.date), 'MMMM d, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">{totalStrokes}</p>
                      <p className="text-sm text-gray-600">{totalPutts} putts</p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center">
              <p className="text-gray-500 text-lg">No rounds recorded yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
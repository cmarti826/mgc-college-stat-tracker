// app/rounds/page.tsx

import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

type Round = {
  id: string;
  date: string;
  status: string;
  type: string;
  player: { full_name: string } | null;
  team: { name: string } | null;
  course: { name: string } | null;
};

export default async function RoundsPage() {
  const supabase = createServerSupabase();

  const { data: rounds, error } = await supabase
    .from('scheduled_rounds')
    .select(`
      id,
      round_date,
      status,
      type,
      player:player_id ( full_name ),
      team:team_id ( name ),
      course:course_id ( name )
    `)
    .order('date', { ascending: false });

  if (error) {
    return (
      <div className="p-6 text-red-600">
        Error loading rounds: {error.message}
      </div>
    );
  }

  if (!rounds || rounds.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Rounds</h1>
        <div className="bg-white rounded-xl border shadow-sm p-12 text-center">
          <p className="text-gray-500">No rounds scheduled yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Rounds</h1>
        <Link
          href="/rounds/new"
          className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition"
        >
          Schedule Round
        </Link>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700 border-b">
              <tr>
                <th className="text-left p-4 font-medium">Date</th>
                <th className="text-left p-4 font-medium">Player</th>
                <th className="text-left p-4 font-medium">Team</th>
                <th className="text-left p-4 font-medium">Course</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rounds.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50 transition">
                  <td className="p-4">
                    <Link
                      href={`/rounds/${r.id}`}
                      className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      {r.round_date ? format(new Date(r.round_date), 'MMM d, yyyy') : '—'}
                    </Link>
                  </td>
                  <td className="p-4 text-gray-700">
                    {r.player?.full_name ?? '—'}
                  </td>
                  <td className="p-4 text-gray-700">
                    {r.team?.name ?? '—'}
                  </td>
                  <td className="p-4 text-gray-700">
                    {r.course?.name ?? '—'}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        r.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : r.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : r.status === 'scheduled'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        r.type === 'TOURNAMENT'
                          ? 'bg-purple-100 text-purple-800'
                          : r.type === 'QUALIFYING'
                          ? 'bg-orange-100 text-orange-800'
                          : r.type === 'PRACTICE'
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {r.type}
                    </span>
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
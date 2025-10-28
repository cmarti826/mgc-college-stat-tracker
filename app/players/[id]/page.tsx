// app/players/[id]/page.tsx
import { createServerSupabase } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function PlayerDetail({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase(); // Server component → use server client
  const playerId = params.id;

  const { data: player, error: playerErr } = await supabase
    .from("players").schema("mgc")
    .select("*, team_members(team:teams(name))")
    .eq("id", playerId)
    .single();

  if (playerErr || !player) {
    notFound();
  }

  const { data: rounds, error: roundsErr } = await supabase
    .from("rounds")
    .select("*, course:courses(name)")
    .eq("player_id", playerId)
    .order("date", { ascending: false });

  const stats = rounds?.reduce(
    (acc, r) => {
      const strokes = r.holes.reduce((s: number, h: any) => s + (h.strokes ?? 0), 0);
      const putts = r.holes.reduce((p: number, h: any) => p + (h.putts ?? 0), 0);
      acc.totalStrokes += strokes;
      acc.totalPutts += putts;
      acc.roundCount += 1;
      return acc;
    },
    { totalStrokes: 0, totalPutts: 0, roundCount: 0 }
  );

  const avgScore = stats?.roundCount ? (stats.totalStrokes / stats.roundCount).toFixed(1) : "-";
  const avgPutts = stats?.roundCount ? (stats.totalPutts / stats.roundCount).toFixed(1) : "-";

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{player.full_name}</h1>
            {player.grad_year && <p className="text-gray-600">Class of {player.grad_year}</p>}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Team</p>
            <p className="font-medium">{player.team_members?.team?.name || "No team"}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border">
          <p className="text-sm text-gray-600">Rounds Played</p>
          <p className="text-3xl font-bold">{stats?.roundCount || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border">
          <p className="text-sm text-gray-600">Average Score</p>
          <p className="text-3xl font-bold">{avgScore}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border">
          <p className="text-sm text-gray-600">Average Putts</p>
          <p className="text-3xl font-bold">{avgPutts}</p>
        </div>
      </div>

      {/* Recent Rounds */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Recent Rounds</h2>
        </div>
        <div className="divide-y">
          {rounds && rounds.length > 0 ? (
            rounds.map((round: any) => {
              const total = round.holes.reduce((s: number, h: any) => s + (h.strokes ?? 0), 0);
              return (
                <div key={round.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{round.course?.name || "Unknown Course"}</p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(round.date), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{total}</p>
                      <p className="text-sm text-gray-600">
                        {round.holes.reduce((p: number, h: any) => p + (h.putts ?? 0), 0)} putts
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-gray-500">
              No rounds recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
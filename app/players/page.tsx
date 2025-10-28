import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase';

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const supabase = createServerSupabase()();

  const { data: players, error } = await supabase
    .from("players")
    .select("id, full_name, grad_year, created_at")
    .order("full_name", { ascending: true });

  if (error) {
    return <div className="text-red-600">Error loading players: {error.message}</div>;
  }

  // counts: teams & rounds per player
  const { data: teamCounts } = await supabase
    .from("team_members")
    .select("player_id, team_id");

  const { data: playerRounds } = await supabase
    .from("scheduled_rounds")
    .select("id, player_id");

  const teamsByPlayer = new Map<string, number>();
  (teamCounts ?? []).forEach((r) => {
    teamsByPlayer.set(r.player_id, (teamsByPlayer.get(r.player_id) ?? 0) + 1);
  });

  const roundsByPlayer = new Map<string, number>();
  (playerRounds ?? []).forEach((r) => {
    roundsByPlayer.set(r.player_id, (roundsByPlayer.get(r.player_id) ?? 0) + 1);
  });

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Players</h1>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Grad Year</th>
              <th className="text-left p-3">Teams</th>
              <th className="text-left p-3">Rounds</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {(players ?? []).map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">
                  <Link href={`/players/${p.id}`} className="underline">
                    {p.full_name ?? "Unnamed"}
                  </Link>
                </td>
                <td className="p-3">{p.grad_year ?? "-"}</td>
                <td className="p-3">{teamsByPlayer.get(p.id) ?? 0}</td>
                <td className="p-3">{roundsByPlayer.get(p.id) ?? 0}</td>
                <td className="p-3">{new Date(p.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

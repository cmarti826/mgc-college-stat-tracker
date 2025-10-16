import Link from "next/link";
import { createClient } from '@/lib/supabase/server';

export const dynamic = "force-dynamic";

export default async function PlayerDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const playerId = params.id;

  const [{ data: player }, { data: memberships }, { data: rounds }] = await Promise.all([
    supabase.from("players").select("*").eq("id", playerId).single(),
    supabase
      .from("team_members")
      .select("team_id, role, teams(name)")
      .eq("player_id", playerId),
    supabase
      .from("rounds")
      .select("id, date, course_id, team_id, tee_id, status, type, courses(name), teams(name)")
      .eq("player_id", playerId)
      .order("date", { ascending: false }),
  ]);

  if (!player) return <div className="text-red-600">Player not found.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{player.full_name}</h1>
        <p className="text-sm text-neutral-600">Grad Year: {player.grad_year ?? "-"}</p>
      </div>

      <section className="space-y-2">
        <h2 className="font-medium">Teams</h2>
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left p-3">Team</th>
                <th className="text-left p-3">Role</th>
              </tr>
            </thead>
            <tbody>
              {(memberships ?? []).map((m) => (
                <tr key={m.team_id} className="border-t">
                  <td className="p-3">
                    <Link href={`/teams/${m.team_id}`} className="underline">
                      {m.teams?.name ?? m.team_id}
                    </Link>
                  </td>
                  <td className="p-3">{m.role}</td>
                </tr>
              ))}
              {(!memberships || memberships.length === 0) && (
                <tr><td className="p-3" colSpan={2}>No team memberships.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Rounds</h2>
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Team</th>
                <th className="text-left p-3">Course</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Type</th>
              </tr>
            </thead>
            <tbody>
              {(rounds ?? []).map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">
                    <Link href={`/rounds/${r.id}`} className="underline">
                      {new Date(r.date).toLocaleDateString()}
                    </Link>
                  </td>
                  <td className="p-3">{r.teams?.name ?? r.team_id}</td>
                  <td className="p-3">{r.courses?.name ?? r.course_id}</td>
                  <td className="p-3">{r.status}</td>
                  <td className="p-3">{r.type}</td>
                </tr>
              ))}
              {(!rounds || rounds.length === 0) && (
                <tr><td className="p-3" colSpan={5}>No rounds yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

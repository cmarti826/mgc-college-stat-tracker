import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RelName = { name?: string } | { name?: string }[] | null;
function relName(x: RelName): string {
  if (!x) return "—";
  if (Array.isArray(x)) return x[0]?.name ?? "—";
  return x.name ?? "—";
}

export default async function PlayerDetail({ params }: { params: { id: string } }) {
  const supabase = createBrowserSupabase();
  const playerId = params.id;

  const { data: player, error: playerErr } = await supabase
    .from("players").select("*").eq("id", playerId).single();

  if (playerErr || !player) return <div className="text-red-600">Player not found.</div>;

  const [{ data: memberships }, { data: rounds }] = await Promise.all([
    supabase
      .from("team_members")
      .select(`
        team_id, role,
        teams:team_id ( name )
      `)
      .eq("player_id", playerId),
    supabase
      .from("scheduled_rounds")
      .select(`
        id, date, status, type,
        teams:team_id ( name ),
        courses:course_id ( name )
      `)
      .eq("player_id", playerId)
      .order("date", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{player.full_name ?? "Player"}</h1>
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
              {(memberships ?? []).length === 0 && (
                <tr><td className="p-3" colSpan={2}>No team memberships.</td></tr>
              )}
              {(memberships ?? []).map((m) => (
                <tr key={m.team_id} className="border-t">
                  <td className="p-3">
                    <Link href={`/teams/${m.team_id}`} className="underline">
                      {relName(m.teams as RelName) || m.team_id}
                    </Link>
                  </td>
                  <td className="p-3">{m.role}</td>
                </tr>
              ))}
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
              {(rounds ?? []).length === 0 && (
                <tr><td className="p-3" colSpan={5}>No rounds yet.</td></tr>
              )}
              {(rounds ?? []).map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">
                    <Link href={`/rounds/${r.id}`} className="underline">
                      {r.date ? new Date(r.date).toLocaleDateString() : "—"}
                    </Link>
                  </td>
                  <td className="p-3">{relName(r.teams as RelName)}</td>
                  <td className="p-3">{relName(r.courses as RelName)}</td>
                  <td className="p-3">{r.status}</td>
                  <td className="p-3">{r.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

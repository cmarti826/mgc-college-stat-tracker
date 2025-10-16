import Link from "next/link";
import { createClient } from '@/lib/supabase/server';

export const dynamic = "force-dynamic";

export default async function TeamDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const teamId = params.id;

  const [{ data: team }, { data: roster }, { data: rounds }] = await Promise.all([
    supabase.from("teams").select("*").eq("id", teamId).single(),
    supabase
      .from("v_team_roster") // created in the SQL script I gave you
      .select("*")
      .eq("team_id", teamId)
      .order("full_name", { ascending: true }),
    supabase
      .from("rounds")
      .select("id, date, player_id, course_id, courses(name), players(full_name)")
      .eq("team_id", teamId)
      .order("date", { ascending: false }),
  ]);

  if (!team) return <div className="text-red-600">Team not found.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{team.name}</h1>
        <p className="text-sm text-neutral-600">School: {team.school ?? "-"}</p>
      </div>

      <section className="space-y-2">
        <h2 className="font-medium">Roster</h2>
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left p-3">Player</th>
                <th className="text-left p-3">Grad Year</th>
                <th className="text-left p-3">Role</th>
              </tr>
            </thead>
            <tbody>
              {(roster ?? []).map((r) => (
                <tr key={r.player_id} className="border-t">
                  <td className="p-3">
                    <Link href={`/players/${r.player_id}`} className="underline">
                      {r.full_name}
                    </Link>
                  </td>
                  <td className="p-3">{r.grad_year ?? "-"}</td>
                  <td className="p-3">{r.role}</td>
                </tr>
              ))}
              {(!roster || roster.length === 0) && (
                <tr><td className="p-3" colSpan={3}>No players yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Team Rounds</h2>
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Player</th>
                <th className="text-left p-3">Course</th>
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
                  <td className="p-3">{r.players?.full_name ?? r.player_id}</td>
                  <td className="p-3">{r.courses?.name ?? r.course_id}</td>
                </tr>
              ))}
              {(!rounds || rounds.length === 0) && (
                <tr><td className="p-3" colSpan={3}>No rounds yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

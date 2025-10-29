// app/teams/[id]/page.tsx
import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Normalize relation shapes (object | array | null) and safely read a key.
type Rel = Record<string, any> | Record<string, any>[] | null | undefined;
function rel(x: Rel, key: "name" | "full_name"): string {
  if (!x) return "—";
  if (Array.isArray(x)) return (x[0] && x[0][key]) ? String(x[0][key]) : "—";
  return (key in x && x[key] != null) ? String(x[key]) : "—";
}

export default async function TeamDetail({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase();
  const teamId = params.id;

  const [{ data: team }, { data: roster }, { data: rounds }] = await Promise.all([
    supabase.from("mgc.teams").select("*").eq("id", teamId).single(),
    supabase
      .from("v_team_roster")
      .select("*")
      .eq("team_id", teamId)
      .order("full_name", { ascending: true }),
    supabase
      .from("mgc.scheduled_rounds")
      .select(`
        id, date,
        players:player_id ( full_name ),
        courses:course_id ( name )
      `)
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
              {(roster ?? []).map((r: { player_id: string; full_name?: string | null; grad_year?: number | null; role?: string | null }) => (
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
              {(rounds ?? []).map((r: { id: string | number; date?: string | null; players?: Rel; courses?: Rel }) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">
                    <Link href={`/rounds/${r.id}`} className="underline">
                      {r.date ? new Date(r.date).toLocaleDateString() : "—"}
                    </Link>
                  </td>
                  <td className="p-3">{rel(r.players as Rel, "full_name")}</td>
                  <td className="p-3">{rel(r.courses as Rel, "name")}</td>
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

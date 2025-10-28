import Link from "next/link";
import { createBrowserSupabase } from '@/lib/supabase';

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const supabase = createBrowserSupabase();

  const { data: teams, error } = await supabase
    .from("teams").schema("mgc")
    .select("id, name, school, created_at")
    .order("name", { ascending: true });

  if (error) {
    return <div className="text-red-600">Error loading teams: {error.message}</div>;
  }

  const { data: roster } = await supabase.from("team_members").select("team_id, player_id");

  const rosterCounts = new Map<string, number>();
  (roster ?? []).forEach((r) => {
    rosterCounts.set(r.team_id, (rosterCounts.get(r.team_id) ?? 0) + 1);
  });

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Teams</h1>
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="text-left p-3">Team</th>
              <th className="text-left p-3">School</th>
              <th className="text-left p-3">Roster</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {(teams ?? []).map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-3">
                  <Link href={`/teams/${t.id}`} className="underline">
                    {t.name}
                  </Link>
                </td>
                <td className="p-3">{t.school ?? "-"}</td>
                <td className="p-3">{rosterCounts.get(t.id) ?? 0}</td>
                <td className="p-3">{new Date(t.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {(!teams || teams.length === 0) && (
              <tr><td className="p-3" colSpan={4}>No teams yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

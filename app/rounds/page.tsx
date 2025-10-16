import Link from "next/link";
import { createClient } from '@/lib/supabase/server';

export const dynamic = "force-dynamic";

export default async function RoundsPage() {
  const supabase = createClient();

  // We could use v_rounds_enriched, but we can join inline to avoid relying on that view.
  const { data: rounds, error } = await supabase
    .from("rounds")
    .select(`
      id, date, status, type,
      players:player_id(full_name),
      teams:team_id(name),
      courses:course_id(name)
    `)
    .order("date", { ascending: false });

  if (error) {
    return <div className="text-red-600">Error loading rounds: {error.message}</div>;
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Rounds</h1>
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Player</th>
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
                <td className="p-3">{r.players?.full_name ?? "-"}</td>
                <td className="p-3">{r.teams?.name ?? "-"}</td>
                <td className="p-3">{r.courses?.name ?? "-"}</td>
                <td className="p-3">{r.status}</td>
                <td className="p-3">{r.type}</td>
              </tr>
            ))}
            {(!rounds || rounds.length === 0) && (
              <tr><td className="p-3" colSpan={6}>No rounds yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

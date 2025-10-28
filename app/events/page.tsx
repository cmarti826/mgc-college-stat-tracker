import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RelName = { name?: string } | { name?: string }[] | null;
function relName(x: RelName): string {
  if (!x) return "—";
  if (Array.isArray(x)) return x[0]?.name ?? "—";
  return x.name ?? "—";
}

export default async function EventsPage() {
  const supabase = createBrowserSupabase();
  const { data: events, error } = await supabase
    .from("events")
    .select(`
      id, name, start_date, end_date,
      teams:team_id ( name ),
      courses:course_id ( name )
    `)
    .order("start_date", { ascending: false });

  if (error) return <div className="text-red-600">Error loading events: {error.message}</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Events</h1>
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Dates</th>
              <th className="text-left p-3">Team</th>
              <th className="text-left p-3">Course</th>
            </tr>
          </thead>
          <tbody>
            {(events ?? []).map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3">{e.name}</td>
                <td className="p-3">
                  {e.start_date ? new Date(e.start_date).toLocaleDateString() : "—"}
                  {e.end_date ? ` – ${new Date(e.end_date).toLocaleDateString()}` : ""}
                </td>
                <td className="p-3">{relName(e.teams as RelName)}</td>
                <td className="p-3">{relName(e.courses as RelName)}</td>
              </tr>
            ))}
            {(!events || events.length === 0) && (
              <tr><td className="p-3" colSpan={4}>No events.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

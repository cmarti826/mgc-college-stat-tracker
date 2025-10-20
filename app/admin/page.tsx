// app/admin/page.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

async function getDashboardData() {
  const supabase = await createClient();

  const [{ data: events }, { data: teamCount }, { data: playerCount }, { data: courseCount }, { data: roundCount }] =
    await Promise.all([
      supabase
        .from("v_admin_events")
        .select("*")
        .order("start_date", { ascending: false })
        .limit(5),
      supabase.from("teams").select("id", { count: "exact", head: true }),
      supabase.from("players").select("id", { count: "exact", head: true }),
      supabase.from("courses").select("id", { count: "exact", head: true }),
      supabase.from("rounds").select("id", { count: "exact", head: true }),
    ]);

  return {
    events: events ?? [],
    counts: {
      teams: teamCount?.length ?? teamCount?.count ?? 0,
      players: playerCount?.length ?? playerCount?.count ?? 0,
      courses: courseCount?.length ?? courseCount?.count ?? 0,
      rounds: roundCount?.length ?? roundCount?.count ?? 0,
    },
  };
}

export default async function AdminHomePage() {
  const { events, counts } = await getDashboardData();

  const tiles = [
    { href: "/admin/players", label: "Players", sub: `${counts.players} total` },
    { href: "/admin/teams", label: "Teams", sub: `${counts.teams} total` },
    { href: "/admin/courses", label: "Courses", sub: `${counts.courses} total` },
    { href: "/admin/rounds", label: "Rounds", sub: `${counts.rounds} total"}`.replace('"', "") },
    { href: "/admin/events", label: "Events", sub: "Create & manage" }, // <— NEW TILE
  ];

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </header>

      {/* Quick nav tiles */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="block rounded-2xl border bg-white p-4 hover:shadow-sm transition"
          >
            <div className="text-lg font-semibold">{t.label}</div>
            <div className="text-xs text-gray-500 mt-1">{t.sub}</div>
          </Link>
        ))}
      </section>

      {/* Recent events snapshot */}
      <section className="rounded-2xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold">Recent Events</h2>
          <Link
            href="/admin/events"
            className="text-sm px-3 py-1 rounded-lg border hover:bg-gray-50"
          >
            Manage Events →
          </Link>
        </div>

        <div className="divide-y">
          {events.length === 0 && (
            <div className="px-4 py-6 text-sm text-gray-500">No events yet.</div>
          )}

          {events.map((e: any) => (
            <Link
              key={e.id}
              href={`/admin/events/${e.id}`}
              className="block px-4 py-3 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{e.name}</div>
                  <div className="text-xs text-gray-500">
                    {e.start_date} → {e.end_date} • {e.event_type ?? "—"}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {e.rounds_count} rounds • {e.players_count} players
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

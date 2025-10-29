// app/admin/page.tsx
import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic' // ← ADD THIS

type CountResp = { count: number | null };

async function getDashboardData() {
  const supabase = await createServerSupabase();
  if (!supabase) throw new Error("Failed to create Supabase server client");

  const sb = supabase!;

  const [
    { data: events, error: evErr },
    teamsRes,
    playersRes,
    coursesRes,
    teeSetsRes, // <-- tee_sets count (replaces tees)
    roundsRes,
  ] = await Promise.all([
    sb
      .from("v_admin_events")
      .select("*")
      .order("start_date", { ascending: false })
      .limit(5),
    sb.from("mgc.teams").select("id", { count: "exact", head: true }),
    sb.from("mgc.players").select("id", { count: "exact", head: true }),
    sb.from("mgc.courses").select("id", { count: "exact", head: true }),
    sb.from("mgc.tee_sets").select("id", { count: "exact", head: true }), // <-- here
    sb.from("mgc.scheduled_rounds").select("id", { count: "exact", head: true }),
  ]);

  if (evErr) throw evErr;

  const teams   = (teamsRes   as unknown as CountResp).count ?? 0;
  const players = (playersRes as unknown as CountResp).count ?? 0;
  const courses = (coursesRes as unknown as CountResp).count ?? 0;
  const teeSets = (teeSetsRes as unknown as CountResp).count ?? 0; // <-- here
  const rounds  = (roundsRes  as unknown as CountResp).count ?? 0;

  return {
    events: events ?? [],
    counts: { teams, players, courses, teeSets, rounds },
  };
}

export default async function AdminHomePage() {
  const { events, counts } = await getDashboardData();

  const tiles = [
    { href: "/admin/players",   label: "Players",  sub: `${counts.players} total` },
    { href: "/admin/teams",     label: "Teams",    sub: `${counts.teams} total` },
    { href: "/admin/courses",   label: "Courses",  sub: `${counts.courses} total` },
    { href: "/admin/tee-sets",  label: "Tee Sets", sub: `${counts.teeSets} total` }, // <-- replaces Tees
    { href: "/admin/rounds",    label: "Rounds",   sub: `${counts.rounds} total` },
    { href: "/admin/events",    label: "Events",   sub: "Create & manage" },
  ];

  const quickActions = [
    { href: "/admin/players/new",   label: "➕ New Player" },
    { href: "/admin/teams/new",     label: "➕ New Team" },
    { href: "/admin/courses/new",   label: "➕ New Course" },
    { href: "/admin/tee-sets/new",  label: "➕ New Tee Set" }, // <-- replaces /admin/tees/new
    { href: "/admin/rounds/new",    label: "➕ New Round" },
    { href: "/admin/events",        label: "➕ New Event" },
  ];

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <Link
          href="/admin/events"
          className="text-sm px-3 py-1 rounded-lg border hover:bg-gray-50"
        >
          Manage Events →
        </Link>
      </header>

      {/* Management tiles */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-6 gap-4">
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

      {/* Quick actions */}
      <section className="rounded-2xl border bg-white">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold">Quick Actions</h2>
        </div>
        <div className="p-4 flex flex-wrap gap-2">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
            >
              {a.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Recent events snapshot */}
      <section className="rounded-2xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold">Recent Events</h2>
          <Link
            href="/admin/events"
            className="text-sm px-3 py-1 rounded-lg border hover:bg-gray-50"
          >
            Go to Events →
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

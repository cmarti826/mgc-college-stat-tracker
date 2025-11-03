// app/admin/page.tsx

import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { format } from "date-fns";
import { Calendar, Users, Flag, MapPin, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

interface CountResp {
  count: number | null;
}

interface Event {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  event_type: string | null;
  rounds_count: number;
  players_count: number;
}

interface DashboardData {
  events: Event[];
  counts: {
    teams: number;
    players: number;
    courses: number;
    teeSets: number;
    rounds: number;
  };
}

async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createServerSupabase();
  if (!supabase) throw new Error("Failed to initialize Supabase client");

  const [
    { data: events, error: evErr },
    { count: teamsCount },
    { count: playersCount },
    { count: coursesCount },
    { count: teeSetsCount },
    { count: roundsCount },
  ] = await Promise.all([
    supabase
      .from("v_admin_events")
      .select("id, name, start_date, end_date, event_type, rounds_count, players_count")
      .order("start_date", { ascending: false })
      .limit(5),
    supabase.from("teams").select("id", { count: "exact", head: true }),
    supabase.from("players").select("id", { count: "exact", head: true }),
    supabase.from("courses").select("id", { count: "exact", head: true }),
    supabase.from("tee_sets").select("id", { count: "exact", head: true }),
    supabase.from("scheduled_rounds").select("id", { count: "exact", head: true }),
  ]);

  if (evErr) throw evErr;

  return {
    events: events ?? [],
    counts: {
      teams: teamsCount ?? 0,
      players: playersCount ?? 0,
      courses: coursesCount ?? 0,
      teeSets: teeSetsCount ?? 0,
      rounds: roundsCount ?? 0,
    },
  };
}

export default async function AdminHomePage() {
  let data: DashboardData;
  try {
    data = await getDashboardData();
  } catch (err) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 font-medium">Failed to load dashboard data.</p>
        <p className="text-sm text-gray-500 mt-1">
          {(err as Error)?.message || "Please try again later."}
        </p>
      </div>
    );
  }

  const { events, counts } = data;

  const tiles = [
    { href: "/admin/players",   label: "Players",  count: counts.players,   icon: <Users className="h-5 w-5" /> },
    { href: "/admin/teams",     label: "Teams",    count: counts.teams,     icon: <Flag className="h-5 w-5" /> },
    { href: "/admin/courses",   label: "Courses",  count: counts.courses,   icon: <MapPin className="h-5 w-5" /> },
    { href: "/admin/tee-sets",  label: "Tee Sets", count: counts.teeSets,   icon: <span className="h-5 w-5 inline-flex items-center justify-center">⛳</span> },
    { href: "/admin/rounds",    label: "Rounds",   count: counts.rounds,    icon: <Calendar className="h-5 w-5" /> },
    { href: "/admin/events",    label: "Events",   count: null,             icon: <Trophy className="h-5 w-5" />, sub: "Manage tournaments" },
  ];

  const quickActions = [
    { href: "/admin/players/new",   label: "New Player" },
    { href: "/admin/teams/new",     label: "New Team" },
    { href: "/admin/courses/new",   label: "New Course" },
    { href: "/admin/tee-sets/new",  label: "New Tee Set" },
    { href: "/admin/rounds/new",    label: "New Round" },
    { href: "/admin/events/new",    label: "New Event" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">Manage all MGC data in one place</p>
        </div>
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--mgc-blue)] border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <Trophy className="h-4 w-4" />
          Manage Events
        </Link>
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="group block rounded-2xl border border-gray-200 bg-white p-5 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-[var(--mgc-blue)]/10 text-[var(--mgc-blue)] group-hover:bg-[var(--mgc-blue)]/20 transition-colors">
                {tile.icon}
              </div>
              {tile.count !== null && (
                <span className="text-2xl font-bold text-gray-900">
                  {tile.count.toLocaleString()}
                </span>
              )}
            </div>
            <div className="font-semibold text-gray-900">{tile.label}</div>
            {tile.sub ? (
              <div className="text-xs text-gray-500 mt-1">{tile.sub}</div>
            ) : tile.count !== null ? (
              <div className="text-xs text-gray-500 mt-1">total</div>
            ) : null}
          </Link>
        ))}
      </section>

      {/* Quick Actions */}
      <section className="card">
        <div className="card-header">
          <h2 className="card-title">Quick Actions</h2>
        </div>
        <div className="flex flex-wrap gap-2 p-4 pt-0">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[var(--mgc-blue)] transition-colors"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Events */}
      <section className="card overflow-hidden">
        <div className="card-header">
          <h2 className="card-title">Recent Events</h2>
          <Link
            href="/admin/events"
            className="text-sm font-medium text-[var(--mgc-blue)] hover:underline"
          >
            View all
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Trophy className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No events yet. Create your first tournament!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/admin/events/${event.id}`}
                className="block p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{event.name}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {format(new Date(event.start_date), "MMM d")} –{" "}
                      {format(new Date(event.end_date), "MMM d, yyyy")} •{" "}
                      {event.event_type || "Tournament"}
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div>{event.rounds_count} rounds</div>
                    <div>{event.players_count} players</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
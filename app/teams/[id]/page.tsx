// app/teams/[id]/page.tsx

import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

// Safely extract a string value from a relation (object, array, or null)
type Relation = Record<string, any> | Record<string, any>[] | null | undefined;
const rel = (value: Relation, key: "name" | "full_name"): string => {
  if (!value) return "—";
  if (Array.isArray(value)) return value[0]?.[key] ?? "—";
  return value[key] ?? "—";
};

export default async function TeamDetail({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase();
  const teamId = params.id;

  const [
    { data: team, error: teamError },
    { data: roster },
    { data: rounds, error: roundsError },
  ] = await Promise.all([
    supabase.from("mgc.teams").select("*").eq("id", teamId).single(),
    supabase
      .from("v_team_roster")
      .select("player_id, full_name, grad_year, role")
      .eq("team_id", teamId)
      .order("full_name", { ascending: true }),
    supabase
      .from("mgc.scheduled_rounds")
      .select(`
        id,
        date,
        players:player_id ( full_name ),
        courses:course_id ( name )
      `)
      .eq("team_id", teamId)
      .order("date", { ascending: false }),
  ]);

  if (teamError || !team) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 font-medium">Team not found.</p>
        <Link
          href="/teams"
          className="mt-4 inline-block text-sm text-blue-600 hover:underline"
        >
          ← Back to Teams
        </Link>
      </div>
    );
  }

  const hasRoster = roster && roster.length > 0;
  const hasRounds = rounds && rounds.length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {team.school ? `School: ${team.school}` : "No school specified"}
          </p>
        </div>
        <Link
          href="/teams"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Back to Teams
        </Link>
      </div>

      {/* Roster Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Roster</h2>
          <span className="text-sm text-gray-500">
            {hasRoster ? `${roster.length} player${roster.length === 1 ? "" : "s"}` : "No players"}
          </span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {hasRoster ? (
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grad Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {roster.map((member) => (
                  <tr key={member.player_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/players/${member.player_id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        {member.full_name || "Unnamed Player"}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {member.grad_year ?? "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 capitalize">
                      {member.role || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-10 text-gray-500">
              No players on this team yet.
            </div>
          )}
        </div>
      </section>

      {/* Rounds Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Team Rounds</h2>
          <span className="text-sm text-gray-500">
            {hasRounds ? `${rounds.length} round${rounds.length === 1 ? "" : "s"}` : "No rounds"}
          </span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {hasRounds ? (
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rounds.map((round) => (
                  <tr key={round.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/rounds/${round.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        {round.date ? format(new Date(round.date), "MMM d, yyyy") : "—"}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {rel(round.players, "full_name")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {rel(round.courses, "name")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-10 text-gray-500">
              No rounds scheduled for this team.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
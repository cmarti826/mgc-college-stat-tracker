// app/teams/page.tsx

import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const supabase = createBrowserSupabase();

  const [{ data: teams, error: teamsError }, { data: roster }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, school, created_at")
      .order("name", { ascending: true }),
    supabase.from("team_members").select("team_id, player_id"),
  ]);

  if (teamsError) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-lg">
        Failed to load teams: {teamsError.message}
      </div>
    );
  }

  // Build roster count map
  const rosterCounts = new Map<string, number>();
  (roster ?? []).forEach(({ team_id }) => {
    rosterCounts.set(team_id, (rosterCounts.get(team_id) ?? 0) + 1);
  });

  const hasTeams = teams && teams.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
        <Link
          href="/teams/new"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          Add Team
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {hasTeams ? (
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  School
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roster
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teams.map((team) => (
                <tr key={team.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/teams/${team.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                      {team.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {team.school || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {rosterCounts.get(team.id) ?? 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(team.created_at), "MMM d, yyyy")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No teams have been created yet.</p>
            <Link
              href="/teams/new"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Your First Team
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
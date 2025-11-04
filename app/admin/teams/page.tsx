// app/admin/teams/page.tsx
import { createServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import NavAdmin from "../NavAdmin";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function createTeam(formData: FormData) {
  "use server";
  const supabase = createServerSupabase();
  const name = String(formData.get("name") || "").trim();
  const school = String(formData.get("school") || "").trim() || null;

  if (!name) throw new Error("Team name is required.");

  const { error } = await supabase.from("teams").insert({ name, school });
  if (error) throw error;

  revalidatePath("/admin/teams");
}

async function deleteTeam(formData: FormData) {
  "use server";
  const supabase = createServerSupabase();
  const id = String(formData.get("id") || "");

  if (!id) throw new Error("Team ID is required.");

  const { error } = await supabase.from("teams").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/admin/teams");
}

export default async function AdminTeamsPage() {
  const supabase = createServerSupabase();

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, school, created_at")
    .order("name", { ascending: true });

  return (
    <div className="p-6 space-y-6">
      <NavAdmin />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Teams</h1>
        <button
          formAction={createTeam}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
        >
          + New Team
        </button>
      </div>

      {/* Create Form */}
      <form action={createTeam} className="space-y-3 rounded-2xl border bg-white p-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Team Name <span className="text-red-600">*</span>
          </label>
          <input
            name="name"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="MGC Varsity"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            School / Organization
          </label>
          <input
            name="school"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Midwest Golf College"
          />
        </div>
        <button
          type="submit"
          className="w-full px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
        >
          Create Team
        </button>
      </form>

      {/* Teams List */}
      <div className="space-y-3">
        {teams?.map((team) => (
          <div
            key={team.id}
            className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm"
          >
            <div>
              <div className="font-medium text-lg">{team.name}</div>
              {team.school && (
                <div className="text-sm text-gray-600">{team.school}</div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                Created {team.created_at ? new Date(team.created_at).toLocaleDateString() : "—"}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* VIEW ROSTER LINK */}
              <Link
                href={`/admin/teams/${team.id}/roster`}
                className="px-3 py-1.5 rounded-md border border-gray-300 text-sm font-medium hover:bg-gray-50 transition"
              >
                View Roster
              </Link>

              {/* DELETE BUTTON */}
              <form action={deleteTeam}>
                <input type="hidden" name="id" value={team.id} />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-md border border-red-300 text-red-700 text-sm font-medium hover:bg-red-50 transition"
                  onClick={(e) => {
                    if (!confirm(`Delete team "${team.name}"? This cannot be undone.`)) {
                      e.preventDefault();
                    }
                  }}
                >
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}

        {(!teams || teams.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            No teams yet. Create one above.
          </div>
        )}
      </div>
    </div>
  );
}
// app/admin/teams/page.tsx
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

/** SERVER ACTIONS **/
async function createTeam(formData: FormData) {
  "use server";
  const supabase = createClient();
  const name = (formData.get("name") as string)?.trim();
  const school = (formData.get("school") as string)?.trim() || null;
  if (!name) return;

  const { error } = await supabase.from("teams").insert({ name, school });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/teams");
}

async function updateTeam(formData: FormData) {
  "use server";
  const supabase = createClient();
  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();
  const school = (formData.get("school") as string)?.trim() || null;
  if (!id || !name) return;

  const { error } = await supabase.from("teams").update({ name, school }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/teams");
}

async function deleteTeam(formData: FormData) {
  "use server";
  const supabase = createClient();
  const id = formData.get("id") as string;
  if (!id) return;

  // Optional: guard against deleting teams that still have rounds
  const { count: roundCount } = await supabase
    .from("rounds")
    .select("id", { count: "exact", head: true })
    .eq("team_id", id);

  if ((roundCount ?? 0) > 0) {
    throw new Error("Cannot delete a team that has rounds. Move or delete those rounds first.");
  }

  const { error } = await supabase.from("teams").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/teams");
}

/** PAGE **/
export default async function AdminTeamsPage() {
  const supabase = createClient();
  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, name, school, created_at")
    .order("name", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Teams (Admin)</h1>
        <p className="text-sm text-neutral-600">
          Add, edit, delete teams. (Admins only)
        </p>
      </div>

      {/* CREATE */}
      <section className="space-y-2">
        <h2 className="font-medium">Add Team</h2>
        <form action={createTeam} className="bg-white border rounded-lg p-4 grid sm:grid-cols-3 gap-3">
          <label className="text-sm">
            <div className="text-neutral-700 mb-1">Team Name</div>
            <input name="name" required className="w-full border rounded px-2 py-1" placeholder="Team name" />
          </label>
          <label className="text-sm">
            <div className="text-neutral-700 mb-1">School (optional)</div>
            <input name="school" className="w-full border rounded px-2 py-1" placeholder="School" />
          </label>
          <div className="flex items-end">
            <button className="border rounded px-3 py-2 bg-neutral-900 text-white hover:bg-neutral-800">
              Create
            </button>
          </div>
        </form>
      </section>

      {/* LIST / EDIT / DELETE */}
      <section className="space-y-2">
        <h2 className="font-medium">Existing Teams</h2>
        <div className="rounded-lg border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">School</th>
                <th className="text-left p-3">Created</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {error && (
                <tr>
                  <td className="p-3 text-red-600" colSpan={4}>
                    {error.message}
                  </td>
                </tr>
              )}
              {(teams ?? []).map((t) => (
                <tr key={t.id} className="border-t align-top">
                  <td className="p-3">
                    <form action={updateTeam} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input type="hidden" name="id" value={t.id} />
                      <input
                        name="name"
                        defaultValue={t.name}
                        required
                        className="border rounded px-2 py-1 w-full sm:w-64"
                      />
                      <input
                        name="school"
                        defaultValue={t.school ?? ""}
                        className="border rounded px-2 py-1 w-full sm:w-48"
                        placeholder="School"
                      />
                      <button className="border rounded px-3 py-1 bg-neutral-900 text-white hover:bg-neutral-800">
                        Save
                      </button>
                    </form>
                  </td>
                  <td className="p-3 align-middle hidden sm:table-cell">{t.school ?? "—"}</td>
                  <td className="p-3 align-middle">
                    {t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-3 align-middle">
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/admin/teams/${t.id}/roster`}
                        className="border rounded px-3 py-1 hover:bg-neutral-50"
                        title="Manage roster"
                      >
                        Manage Roster
                      </a>
                      <form
                        action={deleteTeam}
                        onSubmit={(e) => {
                          if (!confirm(`Delete team "${t.name}"? This cannot be undone.`)) e.preventDefault();
                        }}
                      >
                        <input type="hidden" name="id" value={t.id} />
                        <button className="border rounded px-3 py-1 hover:bg-red-50 text-red-700 border-red-200">
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {(!teams || teams.length === 0) && (
                <tr><td className="p-3" colSpan={4}>No teams yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import NavAdmin from "../NavAdmin";

async function loadData() {
  const supabase = await createClient();
  const [{ data: teams }, { data: members }] = await Promise.all([
    supabase.from("teams").select("id, name, school, created_at").order("name"),
    supabase.from("team_members").select("id, team_id, player_id"),
  ]);
  const counts = new Map<string, number>();
  (members ?? []).forEach((m: any) => counts.set(m.team_id, (counts.get(m.team_id) ?? 0) + 1));
  return { teams: teams ?? [], counts };
}

async function createTeam(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const name = String(formData.get("name") || "").trim();
  const school = String(formData.get("school") || "").trim() || null;
  if (!name) throw new Error("Team name is required.");
  const { error } = await supabase.from("teams").insert({ name, school });
  if (error) throw error;
  revalidatePath("/admin/teams");
}

async function deleteTeam(teamId: string) {
  "use server";
  const supabase = await createClient();
  await supabase.from("team_members").delete().eq("team_id", teamId);
  const { error } = await supabase.from("teams").delete().eq("id", teamId);
  if (error) throw error;
  revalidatePath("/admin/teams");
}

export default async function AdminTeamsPage() {
  const { teams, counts } = await loadData();

  return (
    <div className="p-6 space-y-6">
      <NavAdmin />
      <h1 className="text-2xl font-bold">Manage Teams</h1>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border p-4 bg-white">
          <h2 className="font-semibold mb-3">Create Team</h2>
          <form action={createTeam} className="space-y-3">
            <div>
              <label className="block text-sm">Team Name</label>
              <input name="name" className="w-full border rounded p-2" required />
            </div>
            <div>
              <label className="block text-sm">School (optional)</label>
              <input name="school" className="w-full border rounded p-2" />
            </div>
            <button className="px-4 py-2 rounded-xl bg-blue-600 text-white">Create</button>
          </form>
        </div>

        <div className="rounded-2xl border p-0 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold">All Teams</div>
          <div className="divide-y">
            {teams.map((t: any) => (
              <div key={t.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.school ?? "—"} • {counts.get(t.id) ?? 0} players</div>
                </div>
                <form action={deleteTeam.bind(null, t.id)}>
                  <button className="text-red-600">Delete</button>
                </form>
              </div>
            ))}
            {teams.length === 0 && <div className="px-4 py-6 text-sm text-gray-500">No teams yet.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}

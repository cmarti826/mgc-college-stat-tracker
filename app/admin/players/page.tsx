import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import NavAdmin from "../NavAdmin";

async function loadData() {
  const supabase = await createClient();

  const [{ data: players }, { data: teams }, { data: links }] = await Promise.all([
    supabase.from("players").select("id, full_name, grad_year, created_at").order("created_at", { ascending: false }),
    supabase.from("teams").select("id, name").order("name"),
    supabase.from("team_members").select("id, team_id, player_id"),
  ]);

  return {
    players: players ?? [],
    teams: teams ?? [],
    teamByPlayer: new Map((links ?? []).map((tm: any) => [tm.player_id, tm.team_id])),
  };
}

async function createPlayer(formData: FormData) {
  "use server";
  const supabase = await createClient();

  const full_name = String(formData.get("full_name") || "").trim();
  const grad_year = formData.get("grad_year") ? Number(formData.get("grad_year")) : null;
  const team_id = String(formData.get("team_id") || "") || null;

  if (!full_name) throw new Error("Full name is required.");

  const { data: inserted, error } = await supabase.from("players").insert({ full_name, grad_year }).select("id").single();
  if (error) throw error;

  if (team_id) {
    const { error: linkErr } = await supabase.from("team_members").insert({ team_id, player_id: inserted.id });
    if (linkErr) throw linkErr;
  }

  revalidatePath("/admin/players");
}

async function deletePlayer(playerId: string) {
  "use server";
  const supabase = await createClient();
  await supabase.from("team_members").delete().eq("player_id", playerId);
  const { error } = await supabase.from("players").delete().eq("id", playerId);
  if (error) throw error;
  revalidatePath("/admin/players");
}

export default async function AdminPlayersPage() {
  const { players, teams, teamByPlayer } = await loadData();

  const teamName = (playerId: string) => {
    const tid = teamByPlayer.get(playerId);
    return teams.find((t: any) => t.id === tid)?.name ?? "—";
  };

  return (
    <div className="p-6 space-y-6">
      <NavAdmin />
      <h1 className="text-2xl font-bold">Manage Players</h1>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border p-4 bg-white">
          <h2 className="font-semibold mb-3">Create Player</h2>
          <form action={createPlayer} className="space-y-3">
            <div>
              <label className="block text-sm">Full Name</label>
              <input name="full_name" className="w-full border rounded p-2" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm">Grad Year</label>
                <input name="grad_year" type="number" min={1900} max={2100} className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block text-sm">Assign to Team (optional)</label>
                <select name="team_id" className="w-full border rounded p-2">
                  <option value="">—</option>
                  {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <button className="px-4 py-2 rounded-xl bg-blue-600 text-white">Create</button>
          </form>
        </div>

        <div className="rounded-2xl border p-0 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold">All Players</div>
          <div className="divide-y">
            {players.map((p: any) => (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.full_name}</div>
                  <div className="text-xs text-gray-500">Grad: {p.grad_year ?? "—"} • Team: {teamName(p.id)}</div>
                </div>
                <form action={deletePlayer.bind(null, p.id)}>
                  <button className="text-red-600">Delete</button>
                </form>
              </div>
            ))}
            {players.length === 0 && <div className="px-4 py-6 text-sm text-gray-500">No players yet.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}

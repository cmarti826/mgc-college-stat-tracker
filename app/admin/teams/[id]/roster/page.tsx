// app/admin/teams/[id]/roster/page.tsx
import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import Link from "next/link";

export const dynamic = "force-dynamic";

/* ----------------------- RELATION HELPERS ----------------------- */
type RelPlayer = { full_name?: string; grad_year?: number } | RelPlayer[] | null | undefined;
type RelProfile = { full_name?: string } | RelProfile[] | null | undefined;

function relString<T extends object>(x: T | T[] | null | undefined, key: keyof T): string | null {
  if (!x) return null;
  if (Array.isArray(x)) {
    const v = x[0]?.[key];
    return v != null ? String(v) : null;
  }
  const v = x[key];
  return v != null ? String(v) : null;
}

function playerName(x: RelPlayer): string | null {
  return relString(x as any, "full_name");
}

function profileName(x: RelProfile): string | null {
  return relString(x as any, "full_name");
}

/* ----------------------- SERVER ACTIONS ----------------------- */
async function addPlayerMember(formData: FormData) {
  "use server";
  const supabase = createServerSupabase();
  const teamId = formData.get("team_id") as string;
  const playerId = (formData.get("player_id") as string) || null;
  const role = (formData.get("role") as string) || "player";
  if (!teamId || !playerId) return;

  const { count } = await supabase
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId)
    .eq("player_id", playerId);

  if ((count ?? 0) === 0) {
    const { error } = await supabase
      .from("team_members")
      .insert({ team_id: teamId, player_id: playerId, role });
    if (error) throw new Error(error.message);
  }
  revalidatePath(`/admin/teams/${teamId}/roster`);
}

async function addUserMember(formData: FormData) {
  "use server";
  const supabase = createServerSupabase();
  const teamId = formData.get("team_id") as string;
  const userId = (formData.get("user_id") as string) || null;
  const role = (formData.get("role") as string) || "coach";
  if (!teamId || !userId) return;

  const { count } = await supabase
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId)
    .eq("user_id", userId);

  if ((count ?? 0) === 0) {
    const { error } = await supabase
      .from("team_members")
      .insert({ team_id: teamId, user_id: userId, role });
    if (error) throw new Error(error.message);
  }
  revalidatePath(`/admin/teams/${teamId}/roster`);
}

async function updateMemberRole(formData: FormData) {
  "use server";
  const supabase = createServerSupabase();
  const id = formData.get("id") as string;
  const teamId = formData.get("team_id") as string;
  const role = (formData.get("role") as string) || "player";
  if (!id || !teamId) return;

  const { error } = await supabase.from("team_members").update({ role }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/teams/${teamId}/roster`);
}

async function removeMember(formData: FormData) {
  "use server";
  const supabase = createServerSupabase();
  const id = formData.get("id") as string;
  const teamId = formData.get("team_id") as string;
  if (!id || !teamId) return;

  const { error } = await supabase.from("team_members").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/teams/${teamId}/roster`);
}

/* ----------------------- PAGE ----------------------- */
export default async function TeamRosterAdmin({
  params,
}: {
  params: { id: string };
}) {
  const teamId = params.id;
  const supabase = createServerSupabase();

  const [{ data: team }, { data: roster }, { data: players }, { data: profiles }] =
    await Promise.all([
      supabase.from("mgc.teams").select("*").eq("id", teamId).single(),
      supabase
        .from("team_members")
        .select(`
          id, role, created_at,
          player_id,
          user_id,
          players:player_id ( full_name, grad_year ),
          user_profiles:user_id ( full_name )
        `)
        .eq("team_id", teamId)
        .order("created_at", { ascending: true }),
      supabase
        .from("mgc.players")
        .select("id, full_name, grad_year")
        .order("full_name", { ascending: true }),
      supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name", { ascending: true }),
    ]);

  if (!team) {
    return (
      <div className="text-red-600">
        Team not found. <Link className="underline" href="/admin/teams">Back to Teams</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Manage Roster — {team.name}</h1>
        <p className="text-sm text-neutral-600">
          Add/remove members and edit roles.{" "}
          <Link href="/admin/teams" className="underline">Back to Teams</Link>
        </p>
      </div>

      {/* ADD PLAYER */}
      <section className="space-y-2">
        <h2 className="font-medium">Add Player</h2>
        <form action={addPlayerMember} className="bg-white border rounded-lg p-4 grid sm:grid-cols-3 gap-3">
          <input type="hidden" name="team_id" value={teamId} />
          <label className="text-sm">
            <div className="text-neutral-700 mb-1">Player</div>
            <select name="player_id" className="w-full border rounded px-2 py-1" required>
              <option value="">Select player…</option>
              {(players ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name ?? "Unnamed"} {p.grad_year ? `(${p.grad_year})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <div className="text-neutral-700 mb-1">Role</div>
            <select name="role" className="w-full border rounded px-2 py-1" defaultValue="player">
              <option value="player">player</option>
              <option value="captain">captain</option>
            </select>
          </label>
          <div className="flex items-end">
            <button className="border rounded px-3 py-2 bg-neutral-900 text-white hover:bg-neutral-800">
              Add Player
            </button>
          </div>
        </form>
      </section>

      {/* ADD USER (coach/staff) */}
      <section className="space-y-2">
        <h2 className="font-medium">Add User (Coach/Staff)</h2>
        <form action={addUserMember} className="bg-white border rounded-lg p-4 grid sm:grid-cols-3 gap-3">
          <input type="hidden" name="team_id" value={teamId} />
          <label className="text-sm">
            <div className="text-neutral-700 mb-1">User</div>
            <select name="user_id" className="w-full border rounded px-2 py-1">
              <option value="">Select user…</option>
              {(profiles ?? []).map((u) => (
                <option key={u.id} value={u.id}>{u.full_name ?? u.id}</option>
              ))}
            </select>
            <div className="text-xs text-neutral-500 mt-1">
              If a user isn’t listed, they must sign up first (so a profile row exists).
            </div>
          </label>
          <label className="text-sm">
            <div className="text-neutral-700 mb-1">Role</div>
            <select name="role" className="w-full border rounded px-2 py-1" defaultValue="coach">
              <option value="coach">coach</option>
              <option value="manager">manager</option>
              <option value="staff">staff</option>
            </select>
          </label>
          <div className="flex items-end">
            <button className="border rounded px-3 py-2 bg-neutral-900 text-white hover:bg-neutral-800">
              Add User
            </button>
          </div>
        </form>
      </section>

      {/* ROSTER TABLE */}
      <section className="space-y-2">
        <h2 className="font-medium">Current Roster</h2>
        <div className="rounded-lg border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left p-3">Member</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3">Since</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(roster ?? []).map((m) => {
                const isPlayer = !!m.player_id;
                const name = isPlayer
                  ? playerName(m.players as RelPlayer) ?? String(m.player_id)
                  : profileName(m.user_profiles as RelProfile) ?? String(m.user_id);

                return (
                  <tr key={m.id} className="border-t">
                    <td className="p-3">{name}</td>
                    <td className="p-3">{isPlayer ? "Player" : "User"}</td>
                    <td className="p-3">
                      <form action={updateMemberRole} className="flex gap-2 items-center">
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="team_id" value={teamId} />
                        <select name="role" defaultValue={m.role} className="border rounded px-2 py-1">
                          <option value="player">player</option>
                          <option value="captain">captain</option>
                          <option value="coach">coach</option>
                          <option value="manager">manager</option>
                          <option value="staff">staff</option>
                        </select>
                        <button className="border rounded px-2 py-1">Save</button>
                      </form>
                    </td>
                    <td className="p-3">{m.created_at ? new Date(m.created_at).toLocaleDateString() : "—"}</td>
                    <td className="p-3">
                      <form
                        action={removeMember}
                        onSubmit={(e) => {
                          if (!confirm(`Remove ${name} from ${team.name}?`)) e.preventDefault();
                        }}
                      >
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="team_id" value={teamId} />
                        <button className="border rounded px-3 py-1 hover:bg-red-50 text-red-700 border-red-200">
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {(!roster || roster.length === 0) && (
                <tr><td className="p-3" colSpan={5}>No members yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

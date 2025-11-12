// app/admin/players/new/page.tsx
import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NavAdmin from "../../NavAdmin";

export const dynamic = "force-dynamic";

async function createPlayer(formData: FormData) {
  "use server";
  const supabase = createServerSupabase();

  const full_name = String(formData.get("full_name") || "").trim();
  const grad_year_raw = formData.get("grad_year");
  const grad_year = grad_year_raw ? Number(grad_year_raw) : null;
  const team_id = formData.get("team_id") ? String(formData.get("team_id")).trim() : null;
  const email = String(formData.get("email") || "").trim();
  const password_raw = formData.get("password");
  const password = password_raw ? String(password_raw).trim() : undefined;

  // Split full name
  const parts = full_name.split(" ");
  const first_name = parts[0] || "";
  const last_name = parts.slice(1).join(" ") || "";

  if (!first_name || !last_name || !email) {
    throw new Error("First name, last name, and email are required.");
  }

  // Create auth user
  const { data: authUser, error: authError } = await supabase.auth.signUp({
    email,
    password: password ?? undefined,  // ← FIXED: undefined allowed
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (authError) throw authError;
  if (!authUser.user) throw new Error("Failed to create user.");

  // Create player
  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({
      first_name,
      last_name,
      email,
      grad_year,
    })
    .select("id")
    .single();

  if (playerError) throw playerError;

  // Link player to user
  const { error: linkError } = await supabase
    .from("user_players")
    .insert({ user_id: authUser.user.id, player_id: player.id });

  if (linkError) throw linkError;

  // Add to team if selected
  if (team_id) {
    const { error: teamError } = await supabase
      .from("team_members")
      .insert({
        team_id,
        player_id: player.id,
        role: "player",
      });
    if (teamError) throw teamError;
  }

  redirect("/admin/players");
}

async function loadTeams() {
  const supabase = createServerSupabase();
  const { data } = await supabase.from("teams").select("id, name").order("name");
  return data ?? [];
}

export default async function NewPlayerPage() {
  const teams = await loadTeams();

  return (
    <div className="p-6 space-y-6">
      <NavAdmin />
      <h1 className="text-2xl font-bold">Add New Player</h1>

      <form action={createPlayer} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <input
            name="full_name"
            className="w-full border rounded p-2"
            placeholder="Chad Test"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Graduation Year</label>
          <input
            name="grad_year"
            type="number"
            min="2000"
            max="2030"
            className="w-full border rounded p-2"
            placeholder="2028"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Team</label>
          <select name="team_id" className="w-full border rounded p-2">
            <option value="">No team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            name="email"
            type="email"
            className="w-full border rounded p-2"
            placeholder="cmarti826@gmail.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Temporary Password</label>
          <input
            name="password"
            type="text"
            className="w-full border rounded p-2"
            placeholder="Leave blank to auto-generate"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700"
        >
          Create Player
        </button>
      </form>
    </div>
  );
}
// app/admin/players/new/page.tsx
import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NavAdmin from "../../NavAdmin";

export const dynamic = "force-dynamic";

async function createPlayer(formData: FormData) {
  "use server";
  const supabase = createServerSupabase();

  const fullName = String(formData.get("full_name") || "").trim();
  const gradYearRaw = formData.get("grad_year");
  const gradYear = gradYearRaw ? Number(gradYearRaw) : null;
  const teamId = formData.get("team_id") ? String(formData.get("team_id")).trim() : null;
  const email = String(formData.get("email") || "").trim();
  const password = formData.get("password") ? String(formData.get("password")).trim() : null;

  if (!fullName || !email) {
    throw new Error("Full name and email are required.");
  }

  const [firstName, ...lastNameParts] = fullName.split(" ");
  const lastName = lastNameParts.join(" ") || firstName;

  // Only include password if provided
  const signUpPayload = {
    email,
    ...(password && { password }),  // ← FINAL FIX
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  };

  const { data: authData, error: authError } = await supabase.auth.signUp(signUpPayload);

  if (authError) throw authError;
  if (!authData.user) throw new Error("Failed to create user account.");

  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({
      first_name: firstName,
      last_name: lastName,
      email,
      grad_year: gradYear,
    })
    .select("id")
    .single();

  if (playerError) throw playerError;

  const { error: linkError } = await supabase
    .from("user_players")
    .insert({
      user_id: authData.user.id,
      player_id: player.id,
    });

  if (linkError) throw linkError;

  if (teamId) {
    await supabase.from("team_members").insert({
      team_id: teamId,
      player_id: player.id,
      role: "player",
    });
  }

  redirect("/admin/players");
}

async function getTeams() {
  const supabase = createServerSupabase();
  const { data } = await supabase.from("teams").select("id, name").order("name");
  return data ?? [];
}

export default async function NewPlayerPage() {
  const teams = await getTeams();

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
            placeholder="player@example.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Temporary Password (optional)</label>
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
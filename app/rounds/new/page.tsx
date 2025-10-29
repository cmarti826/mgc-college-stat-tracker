// app/rounds/new/page.tsx
import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import CourseTeePicker from "@/app/admin/rounds/CourseTeePicker";

export const dynamic = "force-dynamic";

// Server Action: Create Round
async function createRound(formData: FormData) {
  "use server";
  const supabase = createServerSupabase();

  const player_id  = String(formData.get("player_id") || "");
  const course_id  = String(formData.get("course_id") || "");
  const tee_set_id = String(formData.get("tee_set_id") || "");
  const round_date = String(formData.get("round_date") || "");
  const name       = String(formData.get("name") || "").trim() || null;
  const notes      = String(formData.get("notes") || "").trim() || null;

  if (!player_id || !course_id || !tee_set_id || !round_date) {
    throw new Error("Player, Course, Tee Set, and Date are required.");
  }

  const { error } = await supabase
    .from("mgc.scheduled_rounds")
    .insert({ player_id, course_id, tee_set_id, round_date, name, notes });

  if (error) throw error;

  revalidatePath("/rounds/new");
  redirect("/rounds");
}

// Load data for form
async function loadData() {
  const supabase = createServerSupabase();

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) redirect("/login?redirectTo=/rounds/new");

  const { data: link, error: linkErr } = await supabase
    .from("mgc.user_players")
    .select("player_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (linkErr) throw linkErr;

  const { data: courses, error: cErr } = await supabase
    .from("mgc.courses")
    .select("id,name")
    .order("name");
  if (cErr) throw cErr;

  const { data: teeSets, error: tErr } = await supabase
    .from("mgc.tee_sets")
    .select("id,name,course_id")
    .order("name");
  if (tErr) throw tErr;

  return {
    playerId: link?.player_id ?? null,
    courses: courses ?? [],
    teeSets: teeSets ?? [],
  };
}

// MAIN PAGE COMPONENT
export default async function NewRoundPage() {
  const { playerId, courses, teeSets } = await loadData();

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">New Round</h1>

      {!playerId && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Your account isn’t linked to a player yet. Ask an admin to link your user to a player in
          <code className="mx-1">user_players</code>.
        </div>
      )}

      <form action={createRound} className="space-y-3 rounded-2xl border bg-white p-4">
        <input type="hidden" name="player_id" value={playerId ?? ""} />

        <div className="grid grid-cols-2 gap-3">
          <CourseTeePicker
            courses={courses}
            tees={teeSets}
            initialCourseId={courses?.[0]?.id}
            fieldName="tee_set_id"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm">Date</label>
            <input type="date" name="round_date" className="w-full border rounded p-2" required />
          </div>
          <div>
            <label className="block text-sm">Name (optional)</label>
            <input name="name" className="w-full border rounded p-2" placeholder="Qualifying Rd 1" />
          </div>
        </div>

        <div>
          <label className="block text-sm">Notes</label>
          <textarea name="notes" className="w-full border rounded p-2" rows={2} />
        </div>

        <button
          className="px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-50"
          disabled={!playerId}
          title={!playerId ? "Your account must be linked to a player" : ""}
        >
          Create
        </button>
      </form>
    </div>
  );
}
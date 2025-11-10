// app/rounds/new/page.tsx
import { createServerSupabaseReadOnly, createServerSupabaseAction } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import CourseTeePicker from "@/app/admin/rounds/CourseTeePicker";

export const dynamic = "force-dynamic";

async function createRound(formData: FormData) {
  "use server";
  const supabase = createServerSupabaseAction();

  const player_id = String(formData.get("player_id") || "").trim();
  const course_id = String(formData.get("course_id") || "").trim();
  const tee_set_id = String(formData.get("tee_set_id") || "").trim();
  const round_date = String(formData.get("round_date") || "").trim();
  const name = String(formData.get("name") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!player_id || !course_id || !tee_set_id || !round_date) {
    throw new Error("Player, Course, Tee Set, and Date are required.");
  }

  const { data, error } = await supabase
    .from("scheduled_rounds")
    .insert({
      player_id,
      course_id,
      tee_set_id,
      round_date,
      name,
      notes,
      status: "scheduled",
      type: "PRACTICE",
    })
    .select("id")
    .single();

  if (error) throw error;

  revalidatePath("/rounds");
  redirect(`/rounds/${data.id}/shots`);
}

async function loadData() {
  const supabase = createServerSupabaseReadOnly();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    redirect("/(auth)/login?redirectTo=/rounds/new");
  }

  const { data: link } = await supabase
    .from("user_players")
    .select("player_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, name")
    .order("name");

  const { data: teeSets } = await supabase
    .from("tee_sets")
    .select("id, name, course_id, rating, slope, par")
    .order("name");

  return {
    playerId: link?.player_id ?? null,
    courses: courses ?? [],
    teeSets: teeSets ?? [],
  };
}

export default async function NewRoundPage() {
  const { playerId, courses, teeSets } = await loadData();

  if (!playerId) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">Player Not Linked</p>
          <p className="mt-1">
            Your account isn't linked to a player. Ask an admin to link you in{" "}
            <code className="font-mono bg-amber-100 px-1 rounded">user_players</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Round</h1>
        <p className="text-sm text-gray-600 mt-1">
          Schedule a new round and start entering shots.
        </p>
      </div>

      <form action={createRound} className="space-y-5 rounded-xl border bg-white p-5 shadow-sm">
        <input type="hidden" name="player_id" value={playerId} />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Course &amp; Tee
          </label>
          <CourseTeePicker
  courses={courses}
  tee_sets={teeSets}
  initialCourseId={courses[0]?.id ?? ""}   // ← RED GONE
  fieldName="tee_set_id"
/>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              name="round_date"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Round Name (optional)
            </label>
            <input
              name="name"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Qualifier Rd 1"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            name="notes"
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Windy, fast greens..."
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
          >
            Create Round &amp; Start Shots
          </button>
        </div>
      </form>
    </div>
  );
}
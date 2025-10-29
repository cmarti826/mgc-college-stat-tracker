// app/admin/rounds/new/page.tsx
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import NavAdmin from "../../NavAdmin";
import CourseTeePicker from "../CourseTeePicker";

export const dynamic = 'force-dynamic' // ← ADD THIS

async function createRound(formData: FormData) {
  "use server";
  const supabase = await createServerSupabase();
  const player_id = String(formData.get("player_id") || "");
  const course_id = String(formData.get("course_id") || "");
  const tee_id    = String(formData.get("tee_id") || "");
  const round_date= String(formData.get("round_date") || "");
  const name      = String(formData.get("name") || "").trim() || null;
  const notes     = String(formData.get("notes") || "").trim() || null;
  if (!player_id || !course_id || !tee_id || !round_date) throw new Error("Player, Course, Tee, and Date are required.");
  const { error } = await supabase.from("mgc.scheduled_rounds").insert({ player_id, course_id, tee_id, round_date, name, notes });
  if (error) throw error;
  revalidatePath("/admin/rounds");
}

export default async function AdminNewRoundPage() {
  const supabase = await createServerSupabase();
  const [{ data: players }, { data: courses }, { data: tees }] = await Promise.all([
    supabase.from("mgc.players").select("id, full_name").order("full_name"),
    supabase.from("mgc.courses").select("id, name").order("name"),
    supabase.from("mgc.v_tees_simple").select("id, name, course_id").order("name"),
  ]);

  return (
    <div className="p-6 space-y-6">
      <NavAdmin />
      <h1 className="text-2xl font-bold">New Round</h1>
      <form action={createRound} className="space-y-3 rounded-2xl border bg-white p-4 max-w-2xl">
        <div>
          <label className="block text-sm">Player</label>
          <select name="player_id" className="w-full border rounded p-2" required>
            <option value="">Select player…</option>
            {(players ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <CourseTeePicker courses={courses ?? []} tees={tees ?? []} initialCourseId={courses?.[0]?.id} />
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
        <button className="px-4 py-2 rounded-xl bg-blue-600 text-white">Create</button>
      </form>
    </div>
  );
}

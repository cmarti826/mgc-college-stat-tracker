// app/admin/rounds/page.tsx
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import NavAdmin from "../NavAdmin";
import Link from "next/link";
import CourseTeePicker from "./CourseTeePicker";

async function loadData() {
  const supabase = await createClient();
  const [
    { data: players },
    { data: courses },
    { data: tees },
    { data: rounds },
  ] = await Promise.all([
    supabase.from("players").select("id, full_name").order("full_name"),
    supabase.from("courses").select("id, name").order("name"),
    supabase.from("v_tees_simple").select("id, name, course_id").order("name"),
    supabase.from("rounds").select("id, name, player_id, course_id, tee_id, round_date, date, created_at, event_id").order("created_at", { ascending: false }).limit(50),
  ]);
  return { players: players ?? [], courses: courses ?? [], tees: tees ?? [], rounds: rounds ?? [] };
}

async function createRound(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const player_id = String(formData.get("player_id") || "");
  const course_id = String(formData.get("course_id") || "");
  const tee_id    = String(formData.get("tee_id") || "");
  const round_date= String(formData.get("round_date") || "");
  const name      = String(formData.get("name") || "").trim() || null;
  const notes     = String(formData.get("notes") || "").trim() || null;
  if (!player_id || !course_id || !tee_id || !round_date) throw new Error("Player, Course, Tee, and Date are required.");
  const { error } = await supabase.from("rounds").insert({ player_id, course_id, tee_id, round_date, name, notes });
  if (error) throw error;
  revalidatePath("/admin/rounds");
}

async function deleteRound(roundId: string) {
  "use server";
  const supabase = await createClient();
  await supabase.from("event_rounds").delete().eq("round_id", roundId);
  const { error } = await supabase.from("rounds").delete().eq("id", roundId);
  if (error) throw error;
  revalidatePath("/admin/rounds");
}

export default async function AdminRoundsPage() {
  const { players, courses, tees, rounds } = await loadData();
  const playerName = (pid: string) => players.find((p: any) => p.id === pid)?.full_name ?? pid;
  const courseName = (cid: string) => courses.find((c: any) => c.id === cid)?.name ?? cid;
  const teeName    = (tid: string) => tees.find((t: any) => t.id === tid)?.name ?? tid;

  return (
    <div className="p-6 space-y-6">
      <NavAdmin />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Rounds</h1>
        <Link href="/admin/rounds/new" className="px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm">New Round</Link>
      </div>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border p-4 bg-white">
          <h2 className="font-semibold mb-3">Quick Create</h2>
          <form action={createRound} className="space-y-3">
            <div>
              <label className="block text-sm">Player</label>
              <select name="player_id" className="w-full border rounded p-2" required>
                <option value="">Select player…</option>
                {players.map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <CourseTeePicker courses={courses} tees={tees} initialCourseId={courses[0]?.id} />
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

        <div className="rounded-2xl border p-0 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold">Recent Rounds</div>
          <div className="divide-y">
            {rounds.map((r: any) => (
              <div key={r.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.name ?? "Round"}</div>
                  <div className="text-xs text-gray-500">
                    {r.round_date ?? r.date ?? "—"} • {playerName(r.player_id)} • {courseName(r.course_id)} • {teeName(r.tee_id)}
                    {r.event_id ? " • linked to event" : ""}
                  </div>
                </div>
                <form action={deleteRound.bind(null, r.id)}>
                  <button className="text-red-600">Delete</button>
                </form>
              </div>
            ))}
            {rounds.length === 0 && <div className="px-4 py-6 text-sm text-gray-500">No rounds yet.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}

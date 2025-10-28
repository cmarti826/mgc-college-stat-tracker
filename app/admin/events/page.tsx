import { revalidatePath } from "next/cache";
import Link from "next/link";
import NavAdmin from "../NavAdmin";
import { createServerSupabase } from "@/lib/supabase/server";

async function getInit() {
  const supabase = await createServerSupabase();

  const [{ data: events, error: eErr }, { data: courses }, { data: teams }] = await Promise.all([
    supabase.from("v_admin_events").select("*").order("start_date", { ascending: false }),
    supabase.from("courses").select("id, name").order("name"),
    supabase.from("teams").select("id, name").order("name"),
  ]);
  if (eErr) throw eErr;

  return { events: events ?? [], courses: courses ?? [], teams: teams ?? [] };
}

async function createEvent(formData: FormData) {
  "use server";
  const supabase = await createServerSupabase();

  const name = String(formData.get("name") || "").trim();
  const start_date = String(formData.get("start_date") || "");
  const end_date = String(formData.get("end_date") || "");
  const course_id = String(formData.get("course_id") || "");
  const team_id = String(formData.get("team_id") || "");

  // sanitize event_type against DB CHECK (TOURNAMENT | QUALIFYING | PRACTICE)
  const rawType = String(formData.get("event_type") || "").trim().toUpperCase();
  const allowed = new Set(["TOURNAMENT", "QUALIFYING", "PRACTICE"]);
  const event_type = allowed.has(rawType) ? rawType : undefined; // omit column to use DB default

  if (!name || !start_date || !end_date || !course_id || !team_id) {
    throw new Error("Name, dates, course, and team are required.");
  }

  const { data: { user } } = await supabase.auth.getUser();

  const payload: any = {
    name, start_date, end_date, course_id, team_id, created_by: user?.id ?? null,
  };
  if (event_type !== undefined) payload.event_type = event_type;

  const { error } = await supabase.from("events").insert(payload);
  if (error) throw error;

  revalidatePath("/admin/events");
}

export default async function AdminEventsPage() {
  const { events, courses, teams } = await getInit();

  return (
    <div className="p-6 space-y-6">
      <NavAdmin />
      <h1 className="text-2xl font-bold">Events</h1>

      <section className="grid md:grid-cols-2 gap-6">
        {/* Create */}
        <div className="rounded-2xl border p-4 bg-white">
          <h2 className="font-semibold mb-3">Create Event</h2>
          <form action={createEvent} className="space-y-3">
            <div>
              <label className="block text-sm">Name</label>
              <input name="name" className="w-full border rounded p-2" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm">Type</label>
                <select name="event_type" className="w-full border rounded p-2">
                  <option value="">(default: TOURNAMENT)</option>
                  <option value="TOURNAMENT">TOURNAMENT</option>
                  <option value="QUALIFYING">QUALIFYING</option>
                  <option value="PRACTICE">PRACTICE</option>
                </select>
              </div>
              <div>
                <label className="block text-sm">Course</label>
                <select name="course_id" className="w-full border rounded p-2" required>
                  <option value="">Select course…</option>
                  {courses.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm">Start Date</label>
                <input type="date" name="start_date" className="w-full border rounded p-2" required />
              </div>
              <div>
                <label className="block text-sm">End Date</label>
                <input type="date" name="end_date" className="w-full border rounded p-2" required />
              </div>
              <div>
                <label className="block text-sm">Team</label>
                <select name="team_id" className="w-full border rounded p-2" required>
                  <option value="">Select team…</option>
                  {teams.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <button className="px-4 py-2 rounded-xl bg-blue-600 text-white">Create</button>
          </form>
        </div>

        {/* List */}
        <div className="rounded-2xl border p-0 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold">All Events</div>
          <div className="divide-y">
            {events.map((e: any) => (
              <Link key={e.id} href={`/admin/events/${e.id}`} className="block px-4 py-3 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{e.name}</div>
                    <div className="text-xs text-gray-500">
                      {e.start_date} → {e.end_date} • {e.event_type || "—"}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {e.rounds_count} rounds • {e.players_count} players
                  </div>
                </div>
              </Link>
            ))}
            {events.length === 0 && (
              <div className="px-4 py-6 text-sm text-gray-500">No events yet.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

import { revalidatePath } from "next/cache";
import NavAdmin from "../../NavAdmin";
import { createServerSupabase } from "@/lib/supabase/server";

async function fetchAll(id: string) {
  const supabase = await createServerSupabase();

  const { data: event, error: e1 } = await supabase.from("events").select("*").eq("id", id).single();
  if (e1) throw e1;

  const [{ data: courses }, { data: teams }] = await Promise.all([
    supabase.from("mgc.courses").select("id, name").order("name"),
    supabase.from("mgc.teams").select("id, name").order("name"),
  ]);

  // Players filtered by event.team_id if set
  let players: any[] = [];
  if (event?.team_id) {
    const { data } = await supabase
      .from("mgc.players").select("id, first_name, last_name, team_id")
      .eq("team_id", event.team_id).order("last_name");
    players = data ?? [];
  } else {
    const { data } = await supabase
      .from("mgc.players").select("id, first_name, last_name, team_id")
      .order("last_name");
    players = data ?? [];
  }

  const { data: roster } = await supabase
    .from("event_players")
    .select("id, player_id, players(first_name, last_name)")
    .eq("event_id", id)
    .order("created_at");

  const { data: linked } = await supabase
    .from("event_rounds")
    .select(`
      id, round_id, round_number, day,
      rounds!inner(id, player_id, name, round_date, date, course_id, tee_id)
    `)
    .eq("event_id", id)
    .order("day", { ascending: true });

  // Eligible rounds to link: unlinked, within dates, same team (if set)
  let q = supabase
    .from("mgc.scheduled_rounds")
    .select("id, player_id, name, round_date, date, course_id, tee_id, team_id, event_id")
    .is("event_id", null)
    .order("round_date", { ascending: true });

  if (event?.start_date) q = q.gte("round_date", event.start_date);
  if (event?.end_date)   q = q.lte("round_date", event.end_date);
  if (event?.team_id)    q = q.eq("team_id", event.team_id);

  const { data: eligible } = await q;

  const [{ data: tees }, { data: courseList }] = await Promise.all([
    supabase.from("tees").select("id, name, course_id"),
    supabase.from("mgc.courses").select("id, name"),
  ]);

  return {
    event,
    courses: courses ?? [],
    teams: teams ?? [],
    players,
    roster: roster ?? [],
    linked: linked ?? [],
    eligible: eligible ?? [],
    tees: tees ?? [],
    courseList: courseList ?? [],
  };
}

async function updateEvent(id: string, formData: FormData) {
  "use server";
  const supabase = await createServerSupabase();

  const name = String(formData.get("name") || "").trim();
  const start_date = String(formData.get("start_date") || "");
  const end_date = String(formData.get("end_date") || "");
  const course_id = String(formData.get("course_id") || "");
  const team_id = String(formData.get("team_id") || "");

  // sanitize event_type; omit if invalid/blank
  const rawType = String(formData.get("event_type") || "").trim().toUpperCase();
  const allowed = new Set(["TOURNAMENT", "QUALIFYING", "PRACTICE"]);

  const patch: any = { name, start_date, end_date, course_id, team_id };
  if (allowed.has(rawType)) patch.event_type = rawType;

  const { error } = await supabase.from("events").update(patch).eq("id", id);
  if (error) throw error;

  revalidatePath(`/admin/events/${id}`);
}

async function deleteEvent(id: string) {
  "use server";
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/events");
}

async function addEventPlayer(id: string, formData: FormData) {
  "use server";
  const supabase = await createServerSupabase();
  const player_id = String(formData.get("player_id") || "");
  if (!player_id) throw new Error("Player is required.");
  const { error } = await supabase.from("event_players").insert({ event_id: id, player_id });
  if (error) throw error;
  revalidatePath(`/admin/events/${id}`);
}

async function removeEventPlayer(id: string, epId: string) {
  "use server";
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("event_players").delete().eq("id", epId);
  if (error) throw error;
  revalidatePath(`/admin/events/${id}`);
}

async function linkRound(eventId: string, formData: FormData) {
  "use server";
  const supabase = await createServerSupabase();
  const round_id = String(formData.get("round_id") || "");
  const round_number = formData.get("round_number") ? Number(formData.get("round_number")) : null;
  const day = String(formData.get("day") || "") || null;

  if (!round_id) throw new Error("Select a round to link.");

  const { error } = await supabase
    .from("event_rounds")
    .insert({ event_id: eventId, round_id, round_number, day });

  if (error) throw error;
  revalidatePath(`/admin/events/${eventId}`);
}

async function unlinkRound(eventId: string, eventRoundId: string) {
  "use server";
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("event_rounds").delete().eq("id", eventRoundId);
  if (error) throw error;
  revalidatePath(`/admin/events/${eventId}`);
}

export default async function AdminEventDetail({ params }: { params: { id: string } }) {
  const { id } = params;
  const { event, courses, teams, players, roster, linked, eligible, tees, courseList } = await fetchAll(id);

  const courseName = (cid: string | null | undefined) =>
    courseList.find((c: any) => c.id === cid)?.name ?? "—";
  const teeName = (tid: string | null | undefined) =>
    tees.find((t: any) => t.id === tid)?.name ?? "—";

  return (
    <div className="p-6 space-y-6">
      <NavAdmin />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{event.name}</h1>
        <form action={deleteEvent.bind(null, id)}>
          <button className="px-3 py-2 rounded-lg border text-red-600 hover:bg-red-50" type="submit">
            Delete Event
          </button>
        </form>
      </div>

      <section className="grid md:grid-cols-2 gap-6">
        {/* Edit */}
        <div className="rounded-2xl border p-4 bg-white">
          <h2 className="font-semibold mb-3">Edit Event</h2>
          <form action={updateEvent.bind(null, id)} className="space-y-3">
            <div>
              <label className="block text-sm">Name</label>
              <input name="name" defaultValue={event.name} className="w-full border rounded p-2" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm">Type</label>
                <select
                  name="event_type"
                  defaultValue={event.event_type ?? ""}
                  className="w-full border rounded p-2"
                >
                  <option value="">(leave unchanged or default)</option>
                  <option value="TOURNAMENT">TOURNAMENT</option>
                  <option value="QUALIFYING">QUALIFYING</option>
                  <option value="PRACTICE">PRACTICE</option>
                </select>
              </div>
              <div>
                <label className="block text-sm">Course</label>
                <select name="course_id" defaultValue={event.course_id ?? ""} className="w-full border rounded p-2">
                  {courses?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm">Start Date</label>
                <input type="date" name="start_date" defaultValue={event.start_date ?? ""} className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block text-sm">End Date</label>
                <input type="date" name="end_date" defaultValue={event.end_date ?? ""} className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block text-sm">Team</label>
                <select name="team_id" defaultValue={event.team_id ?? ""} className="w-full border rounded p-2">
                  {teams?.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <button className="px-4 py-2 rounded-xl bg-blue-600 text-white">Save</button>
          </form>
        </div>

        {/* Roster */}
        <div className="rounded-2xl border p-4 bg-white">
          <h2 className="font-semibold mb-3">Event Roster</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {roster.map((ep: any) => (
              <form key={ep.id} action={removeEventPlayer.bind(null, id, ep.id)}>
                <button className="px-3 py-1 rounded-full border">
                  {(ep.players?.first_name ?? "") + " " + (ep.players?.last_name ?? "")}
                  <span className="ml-2 text-red-600">×</span>
                </button>
              </form>
            ))}
            {roster.length === 0 && <div className="text-sm text-gray-500">No players added.</div>}
          </div>

          <form action={addEventPlayer.bind(null, id)} className="flex gap-2">
            <select name="player_id" className="border rounded p-2 flex-1">
              {players.map((p: any) => (
                <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}</option>
              ))}
            </select>
            <button className="px-3 py-2 rounded-lg border bg-white">Add Player</button>
          </form>
          <p className="text-xs text-gray-500 mt-2">List is filtered to the event’s team if set.</p>
        </div>
      </section>

      {/* Linked rounds */}
      <section className="rounded-2xl border p-4 bg-white">
        <h2 className="font-semibold mb-3">Linked Rounds</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Day</th>
                <th className="py-2 pr-3">Round Date</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Course</th>
                <th className="py-2 pr-3">Tee</th>
                <th className="py-2 pr-3">Player</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {linked.map((er: any) => (
                <tr key={er.id} className="border-b">
                  <td className="py-2 pr-3">{er.round_number ?? "—"}</td>
                  <td className="py-2 pr-3">{er.day ?? "—"}</td>
                  <td className="py-2 pr-3">{er.rounds?.round_date ?? er.rounds?.date ?? "—"}</td>
                  <td className="py-2 pr-3">{er.rounds?.name ?? "—"}</td>
                  <td className="py-2 pr-3">{courseName(er.rounds?.course_id)}</td>
                  <td className="py-2 pr-3">{teeName(er.rounds?.tee_id)}</td>
                  <td className="py-2 pr-3">{er.rounds?.player_id ?? "—"}</td>
                  <td className="py-2 pr-3">
                    <form action={unlinkRound.bind(null, id, er.id)}>
                      <button className="text-red-600">Unlink</button>
                    </form>
                  </td>
                </tr>
              ))}
              {linked.length === 0 && (
                <tr><td colSpan={8} className="py-6 text-gray-500">No rounds linked yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <h3 className="font-medium mb-2">Link Existing Round</h3>
          <form action={linkRound.bind(null, id)} className="grid md:grid-cols-6 gap-3">
            <div className="md:col-span-3">
              <label className="block text-xs">Round</label>
              <select name="round_id" className="w-full border rounded p-2" required>
                {eligible.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {(r.round_date ?? r.date) ?? ""} • {r.name ?? "Round"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs">Round #</label>
              <input type="number" name="round_number" className="w-full border rounded p-2" min={1} />
            </div>
            <div>
              <label className="block text-xs">Day</label>
              <input type="date" name="day" className="w-full border rounded p-2" />
            </div>
            <div className="md:col-span-6">
              <button className="px-4 py-2 rounded-xl bg-blue-600 text-white">Link Round</button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

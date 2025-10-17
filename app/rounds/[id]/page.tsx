// app/rounds/[id]/page.tsx
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import Link from "next/link";

export const dynamic = "force-dynamic";

/* ----------------------- RELATION HELPERS ----------------------- */
type RelObj = Record<string, any> | Record<string, any>[] | null | undefined;
function rel(x: RelObj, key: string, fallback = "—"): string {
  if (!x) return fallback;
  if (Array.isArray(x)) return x[0]?.[key] != null ? String(x[0][key]) : fallback;
  return x[key] != null ? String(x[key]) : fallback;
}

/* ----------------------- SERVER ACTIONS ------------------------ */
async function updateRound(formData: FormData) {
  "use server";
  const supabase = createClient();

  const id = String(formData.get("id") || "");
  if (!id) return;

  const name = (formData.get("name") as string | null)?.trim() || null;
  const date = (formData.get("date") as string | null) || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  const { error } = await supabase
    .from("rounds")
    .update({ name, date, notes })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath(`/rounds/${id}`);
}

async function addShot(formData: FormData) {
  "use server";
  const supabase = createClient();

  const round_id = String(formData.get("round_id") || "");
  const hole_number = Number(formData.get("hole_number") || 0);
  const putt = formData.get("putt") === "on";
  const penalty_strokes = Number(formData.get("penalty_strokes") || 0);
  const start_lie = (formData.get("start_lie") as string) || null;
  const end_lie = (formData.get("end_lie") as string) || null;
  const start_dist_feet = formData.get("start_dist_feet") ? Number(formData.get("start_dist_feet")) : null;
  const end_dist_feet = formData.get("end_dist_feet") ? Number(formData.get("end_dist_feet")) : null;
  const club = (formData.get("club") as string) || null;
  const note = (formData.get("note") as string) || null;
  const holed = formData.get("holed") === "on";

  if (!round_id || !hole_number) return;

  // Get round to inherit player_id (optional) and sanity
  const { data: rnd } = await supabase
    .from("rounds")
    .select("id, player_id")
    .eq("id", round_id)
    .single();

  // Compute next shot_number for this hole in this round
  const { data: maxShot } = await supabase
    .from("shots")
    .select("shot_number")
    .eq("round_id", round_id)
    .eq("hole_number", hole_number)
    .order("shot_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextShotNumber = (maxShot?.shot_number ?? 0) + 1;

  const { error } = await supabase.from("shots").insert({
    round_id,
    hole_number,
    shot_number: nextShotNumber,
    putt,                         // REQUIRED (bool, not null)
    penalty_strokes,              // REQUIRED (int, not null)
    player_id: rnd?.player_id ?? null,
    start_lie,
    end_lie,
    start_dist_feet,
    end_dist_feet,
    club,
    note,
    holed,
    // Optional convenience flags (if your schema uses them)
    // start_dist_yards: null,
    // end_dist_yards: null,
    // start_distance: null,
    // end_distance: null,
    // penalty: penalty_strokes > 0,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/rounds/${round_id}`);
}

async function deleteShot(formData: FormData) {
  "use server";
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  const round_id = String(formData.get("round_id") || "");
  if (!id || !round_id) return;

  const { error } = await supabase.from("shots").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/rounds/${round_id}`);
}

/* ----------------------------- PAGE ---------------------------- */
export default async function RoundDetail({
  params,
}: {
  params: { id: string };
}) {
  const roundId = params.id;
  const supabase = createClient();

  const [{ data: round, error: roundErr }, { data: shots, error: shotsErr }] =
    await Promise.all([
      supabase
        .from("rounds")
        .select(`
          id, name, date, notes,
          players:player_id ( full_name ),
          teams:team_id ( name ),
          courses:course_id ( name ),
          tees:tee_id ( name )
        `)
        .eq("id", roundId)
        .single(),
      supabase
        .from("shots")
        .select(`
          id, hole_number, shot_number, putt, penalty_strokes,
          club, note, holed,
          start_lie, end_lie,
          start_dist_feet, end_dist_feet
        `)
        .eq("round_id", roundId)
        .order("hole_number", { ascending: true })
        .order("shot_number", { ascending: true }),
    ]);

  if (roundErr || !round) {
    return (
      <div className="text-red-600">
        {roundErr?.message ?? "Round not found."}
      </div>
    );
  }

  // Group shots by hole for display
  const byHole = new Map<number, typeof shots>();
  (shots ?? []).forEach((s) => {
    const arr = byHole.get(s.hole_number) ?? [];
    arr.push(s);
    byHole.set(s.hole_number, arr);
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{round.name ?? `Round ${round.id.slice(0, 8)}`}</h1>
          <p className="text-sm text-neutral-600">
            {round.date ? new Date(round.date).toLocaleDateString() : "—"} ·{" "}
            Player: {rel(round.players as RelObj, "full_name")} · Team: {rel(round.teams as RelObj, "name")} · Course: {rel(round.courses as RelObj, "name")} · Tee: {rel(round.tees as RelObj, "name")}
          </p>
        </div>
        <Link href="/rounds" className="underline text-sm">Back to Rounds</Link>
      </div>

      {/* Edit Round */}
      <section className="space-y-2">
        <h2 className="font-medium">Edit Round</h2>
        <form action={updateRound} className="bg-white border rounded-lg p-4 grid sm:grid-cols-3 gap-3">
          <input type="hidden" name="id" value={roundId} />
          <label className="text-sm">
            <div className="text-neutral-700 mb-1">Name</div>
            <input
              name="name"
              defaultValue={round.name ?? ""}
              className="w-full border rounded px-2 py-1"
              placeholder="Optional round name"
            />
          </label>
          <label className="text-sm">
            <div className="text-neutral-700 mb-1">Date</div>
            <input
              type="date"
              name="date"
              defaultValue={round.date ? new Date(round.date).toISOString().slice(0, 10) : ""}
              className="w-full border rounded px-2 py-1"
            />
          </label>
          <label className="sm:col-span-3 text-sm">
            <div className="text-neutral-700 mb-1">Notes</div>
            <textarea
              name="notes"
              defaultValue={round.notes ?? ""}
              className="w-full border rounded px-2 py-2"
              rows={3}
              placeholder="Any notes about this round…"
            />
          </label>
          <div className="sm:col-span-3">
            <button className="border rounded px-3 py-2 bg-neutral-900 text-white hover:bg-neutral-800">
              Save Changes
            </button>
          </div>
        </form>
      </section>

      {/* Add Shot */}
      <section className="space-y-2">
        <h2 className="font-medium">Add Shot</h2>
        <form action={addShot} className="bg-white border rounded-lg p-4 grid sm:grid-cols-6 gap-3">
          <input type="hidden" name="round_id" value={roundId} />
          <label className="text-sm sm:col-span-2">
            <div className="text-neutral-700 mb-1">Hole</div>
            <select name="hole_number" required className="w-full border rounded px-2 py-1">
              <option value="">Select hole…</option>
              {Array.from({ length: 18 }).map((_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <div className="text-neutral-700 mb-1">Putt?</div>
            <input type="checkbox" name="putt" className="h-4 w-4" />
          </label>

          <label className="text-sm">
            <div className="text-neutral-700 mb-1">Penalty Strokes</div>
            <input
              type="number"
              name="penalty_strokes"
              min={0}
              defaultValue={0}
              className="w-full border rounded px-2 py-1"
            />
          </label>

          <label className="text-sm">
            <div className="text-neutral-700 mb-1">Start Lie</div>
            <select name="start_lie" className="w-full border rounded px-2 py-1">
              <option value="">—</option>
              <option value="Tee">Tee</option>
              <option value="Fairway">Fairway</option>
              <option value="Rough">Rough</option>
              <option value="Sand">Sand</option>
              <option value="Recovery">Recovery</option>
              <option value="Green">Green</option>
              <option value="Penalty">Penalty</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <label className="text-sm">
            <div className="text-neutral-700 mb-1">End Lie</div>
            <select name="end_lie" className="w-full border rounded px-2 py-1">
              <option value="">—</option>
              <option value="Fairway">Fairway</option>
              <option value="Rough">Rough</option>
              <option value="Sand">Sand</option>
              <option value="Green">Green</option>
              <option value="Hole">Hole</option>
              <option value="Penalty">Penalty</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <label className="text-sm">
            <div className="text-neutral-700 mb-1">Club</div>
            <input name="club" className="w-full border rounded px-2 py-1" placeholder="e.g. 7i, PW, Driver" />
          </label>

          <label className="text-sm">
            <div className="text-neutral-700 mb-1">Start Dist (ft)</div>
            <input type="number" name="start_dist_feet" min={0} step="0.1" className="w-full border rounded px-2 py-1" />
          </label>

          <label className="text-sm">
            <div className="text-neutral-700 mb-1">End Dist (ft)</div>
            <input type="number" name="end_dist_feet" min={0} step="0.1" className="w-full border rounded px-2 py-1" />
          </label>

          <label className="text-sm">
            <div className="text-neutral-700 mb-1">Holed?</div>
            <input type="checkbox" name="holed" className="h-4 w-4" />
          </label>

          <label className="text-sm sm:col-span-3">
            <div className="text-neutral-700 mb-1">Note</div>
            <input name="note" className="w-full border rounded px-2 py-1" placeholder="Optional note…" />
          </label>

          <div className="sm:col-span-6">
            <button className="border rounded px-3 py-2 bg-neutral-900 text-white hover:bg-neutral-800">
              Add Shot
            </button>
          </div>
        </form>

        <p className="text-xs text-neutral-500">
          Shot number is set automatically per hole (next available).
        </p>
      </section>

      {/* Shots List */}
      <section className="space-y-2">
        <h2 className="font-medium">Shots</h2>
        <div className="space-y-4">
          {Array.from({ length: 18 }).map((_, i) => {
            const hole = i + 1;
            const items = byHole.get(hole) ?? [];
            return (
              <div key={hole} className="rounded-lg border bg-white overflow-hidden">
                <div className="px-4 py-2 bg-neutral-50 font-medium">Hole {hole}</div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="p-3">#</th>
                      <th className="p-3">Putt</th>
                      <th className="p-3">Penalty</th>
                      <th className="p-3">Start Lie</th>
                      <th className="p-3">End Lie</th>
                      <th className="p-3">Start (ft)</th>
                      <th className="p-3">End (ft)</th>
                      <th className="p-3">Club</th>
                      <th className="p-3">Note</th>
                      <th className="p-3">Holed</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 && (
                      <tr><td className="p-3" colSpan={11}>No shots yet.</td></tr>
                    )}
                    {items.map((s) => (
                      <tr key={s.id} className="border-t">
                        <td className="p-3">{s.shot_number}</td>
                        <td className="p-3">{s.putt ? "Yes" : "No"}</td>
                        <td className="p-3">{s.penalty_strokes ?? 0}</td>
                        <td className="p-3">{s.start_lie ?? "—"}</td>
                        <td className="p-3">{s.end_lie ?? "—"}</td>
                        <td className="p-3">{s.start_dist_feet ?? "—"}</td>
                        <td className="p-3">{s.end_dist_feet ?? "—"}</td>
                        <td className="p-3">{s.club ?? "—"}</td>
                        <td className="p-3">{s.note ?? "—"}</td>
                        <td className="p-3">{s.holed ? "Yes" : "No"}</td>
                        <td className="p-3">
                          <form
                            action={deleteShot}
                            onSubmit={(e) => {
                              if (!confirm(`Delete shot #${s.shot_number} on hole ${hole}?`)) e.preventDefault();
                            }}
                          >
                            <input type="hidden" name="id" value={s.id} />
                            <input type="hidden" name="round_id" value={roundId} />
                            <button className="border rounded px-2 py-1 hover:bg-red-50 text-red-700 border-red-200">
                              Delete
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

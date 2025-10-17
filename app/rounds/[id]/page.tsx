import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import AddShotForm from "@/components/AddShotForm";

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

  const { error } = await supabase.from("rounds").update({ name, date, notes }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/rounds/${id}`);
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
export default async function RoundDetail({ params }: { params: { id: string } }) {
  const roundId = params.id;
  const supabase = createClient();

  const [
    { data: round, error: roundErr },
    { data: shots },
    { data: scores },
  ] = await Promise.all([
    supabase
      .from("rounds")
      .select(`
        id, name, date, notes,
        player_id, team_id, course_id, tee_id,
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
        start_dist_feet, end_dist_feet,
        start_dist_yards, end_dist_yards
      `)
      .eq("round_id", roundId)
      .order("hole_number", { ascending: true })
      .order("shot_number", { ascending: true }),
    supabase
      .from("scores")
      .select(`
        id, user_id, hole_number, strokes, putts, fir, gir, up_down, sand_save, penalties,
        sg_ott, sg_app, sg_arg, sg_putt, notes
      `)
      .eq("round_id", roundId)
      .order("hole_number", { ascending: true }),
  ]);

  if (roundErr || !round) {
    return <div className="text-red-600">{roundErr?.message ?? "Round not found."}</div>;
  }

  // Yardages for 1..18 from tee_set_holes if tee_id refers to tee_sets; fallback to holes.yards
  const [{ data: teeHoles }, { data: courseHoles }] = await Promise.all([
    supabase.from("tee_set_holes").select("hole_number, yardage").eq("tee_set_id", round.tee_id).order("hole_number"),
    supabase.from("holes").select("number, yards").eq("course_id", round.course_id).order("number"),
  ]);

  const yardages: (number | null)[] = Array.from({ length: 18 }, (_, i) => {
    const y = teeHoles?.find((t) => t.hole_number === i + 1)?.yardage ?? null;
    if (y != null) return Number(y);
    const fallback = courseHoles?.find((h) => h.number === i + 1)?.yards ?? null;
    return fallback != null ? Number(fallback) : null;
  });

  // Build "last shot on each hole" snapshot to drive defaults
  type ShotRow = NonNullable<typeof shots>[number];
  const lastShotByHole: Record<
    number,
    | {
        end_lie: string | null;
        end_dist_yards: number | null;
        end_dist_feet: number | null;
        shot_number: number;
      }
    | undefined
  > = {};
  (shots ?? []).forEach((s) => {
    const prev = lastShotByHole[s.hole_number];
    if (!prev || s.shot_number > prev.shot_number) {
      lastShotByHole[s.hole_number] = {
        end_lie: s.end_lie ?? null,
        end_dist_yards: (s.end_dist_yards as any) ?? null,
        end_dist_feet: (s.end_dist_feet as any) ?? null,
        shot_number: s.shot_number,
      };
    }
  });

  // Group shots by hole for the table
  const shotsByHole = new Map<number, ShotRow[]>();
  (shots ?? []).forEach((s) => {
    const arr = shotsByHole.get(s.hole_number) ?? [];
    arr.push(s);
    shotsByHole.set(s.hole_number, arr);
  });

  // Map first score row per hole (if multiple scorers exist)
  type ScoreRow = NonNullable<typeof scores>[number];
  const scoreByHole = new Map<number, ScoreRow>();
  (scores ?? []).forEach((row) => {
    if (!scoreByHole.has(row.hole_number)) scoreByHole.set(row.hole_number, row);
  });

  // Totals (scores)
  const totals = (scores ?? []).reduce(
    (acc, r) => {
      acc.strokes += r.strokes ?? 0;
      acc.putts += r.putts ?? 0;
      acc.penalties += r.penalties ?? 0;
      acc.sg_ott += Number(r.sg_ott ?? 0);
      acc.sg_app += Number(r.sg_app ?? 0);
      acc.sg_arg += Number(r.sg_arg ?? 0);
      acc.sg_putt += Number(r.sg_putt ?? 0);
      return acc;
    },
    { strokes: 0, putts: 0, penalties: 0, sg_ott: 0, sg_app: 0, sg_arg: 0, sg_putt: 0 }
  );

  const fmtDist = (val: number | null | undefined) => (val == null ? "—" : Number(val).toString());

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{round.name ?? `Round ${round.id.slice(0, 8)}`}</h1>
          <p className="text-sm text-neutral-600">
            {round.date ? new Date(round.date).toLocaleDateString() : "—"} ·{" "}
            Player: {rel(round.players as RelObj, "full_name")} · Team: {rel(round.teams as RelObj, "name")} · Course:{" "}
            {rel(round.courses as RelObj, "name")} · Tee: {rel(round.tees as RelObj, "name")}
          </p>
        </div>
        <Link href="/rounds" className="underline text-sm">
          Back to Rounds
        </Link>
      </div>

      {/* Edit Round */}
      <section className="space-y-2">
        <h2 className="font-medium">Edit Round</h2>
        <form action={updateRound} className="bg-white border rounded-lg p-4 grid sm:grid-cols-3 gap-3">
          <input type="hidden" name="id" value={roundId} />
          <label className="text-sm">
            <div className="text-neutral-700 mb-1">Name</div>
            <input name="name" defaultValue={round.name ?? ""} className="w-full border rounded px-2 py-1" placeholder="Optional round name" />
          </label>
          <label className="text-sm">
            <div className="text-neutral-700 mb-1">Date</div>
            <input type="date" name="date" defaultValue={round.date ? new Date(round.date).toISOString().slice(0, 10) : ""} className="w-full border rounded px-2 py-1" />
          </label>
          <label className="sm:col-span-3 text-sm">
            <div className="text-neutral-700 mb-1">Notes</div>
            <textarea name="notes" defaultValue={round.notes ?? ""} className="w-full border rounded px-2 py-2" rows={3} placeholder="Any notes about this round…" />
          </label>
          <div className="sm:col-span-3">
            <button className="border rounded px-3 py-2 bg-neutral-900 text-white hover:bg-neutral-800">Save Changes</button>
          </div>
        </form>
      </section>

      {/* Scores & Stats */}
      <section className="space-y-2">
        <h2 className="font-medium">Scores & Stats</h2>

        <div className="rounded-lg border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left p-3">Hole</th>
                <th className="text-left p-3">Strokes</th>
                <th className="text-left p-3">Putts</th>
                <th className="text-left p-3">FIR</th>
                <th className="text-left p-3">GIR</th>
                <th className="text-left p-3">Up &amp; Down</th>
                <th className="text-left p-3">Sand Save</th>
                <th className="text-left p-3">Penalties</th>
                <th className="text-left p-3">SG OTT</th>
                <th className="text-left p-3">SG APP</th>
                <th className="text-left p-3">SG ARG</th>
                <th className="text-left p-3">SG PUTT</th>
                <th className="text-left p-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 18 }).map((_, idx) => {
                const hole = idx + 1;
                const r = scoreByHole.get(hole);
                return (
                  <tr key={hole} className="border-t">
                    <td className="p-3">{hole}</td>
                    <td className="p-3">{r?.strokes ?? "—"}</td>
                    <td className="p-3">{r?.putts ?? "—"}</td>
                    <td className="p-3">{r?.fir === true ? "✓" : r?.fir === false ? "✗" : "—"}</td>
                    <td className="p-3">{r?.gir === true ? "✓" : r?.gir === false ? "✗" : "—"}</td>
                    <td className="p-3">{r?.up_down === true ? "✓" : r?.up_down === false ? "✗" : "—"}</td>
                    <td className="p-3">{r?.sand_save === true ? "✓" : r?.sand_save === false ? "✗" : "—"}</td>
                    <td className="p-3">{r?.penalties ?? "—"}</td>
                    <td className="p-3">{r?.sg_ott ?? "—"}</td>
                    <td className="p-3">{r?.sg_app ?? "—"}</td>
                    <td className="p-3">{r?.sg_arg ?? "—"}</td>
                    <td className="p-3">{r?.sg_putt ?? "—"}</td>
                    <td className="p-3">{r?.notes ?? "—"}</td>
                  </tr>
                );
              })}
              <tr className="border-t bg-neutral-50 font-medium">
                <td className="p-3">Totals</td>
                <td className="p-3">{totals.strokes || "—"}</td>
                <td className="p-3">{totals.putts || "—"}</td>
                <td className="p-3">—</td><td className="p-3">—</td><td className="p-3">—</td><td className="p-3">—</td>
                <td className="p-3">{totals.penalties || "—"}</td>
                <td className="p-3">{totals.sg_ott.toFixed(2)}</td>
                <td className="p-3">{totals.sg_app.toFixed(2)}</td>
                <td className="p-3">{totals.sg_arg.toFixed(2)}</td>
                <td className="p-3">{totals.sg_putt.toFixed(2)}</td>
                <td className="p-3">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Add Shot (smart defaults from tee yardage or last shot) */}
      <section className="space-y-2">
        <h2 className="font-medium">Add Shot</h2>

        <AddShotForm
          roundId={roundId}
          yardages={yardages}
          lastShotByHole={lastShotByHole}
        />

        <p className="text-xs text-neutral-500">
          If a hole has no shots yet, start distance defaults to tee yardage. Otherwise, it uses the previous shot’s end distance and lie.
        </p>
      </section>

      {/* Shots List */}
      <section className="space-y-2">
        <h2 className="font-medium">Shots</h2>
        <div className="space-y-4">
          {Array.from({ length: 18 }).map((_, i) => {
            const hole = i + 1;
            const items = shotsByHole.get(hole) ?? [];
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
                      <th className="p-3">Start (yd / ft)</th>
                      <th className="p-3">End (yd / ft)</th>
                      <th className="p-3">Club</th>
                      <th className="p-3">Note</th>
                      <th className="p-3">Holed</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 && <tr><td className="p-3" colSpan={11}>No shots yet.</td></tr>}
                    {items.map((s) => {
                      const startPref = s.start_lie === "Green" ? `${fmtDist(s.start_dist_feet)} ft` : `${fmtDist(s.start_dist_yards)} yd`;
                      const endPref = (s.end_lie === "Green" || s.end_lie === "Hole") ? `${fmtDist(s.end_dist_feet)} ft` : `${fmtDist(s.end_dist_yards)} yd`;
                      return (
                        <tr key={s.id} className="border-t">
                          <td className="p-3">{s.shot_number}</td>
                          <td className="p-3">{s.putt ? "Yes" : "No"}</td>
                          <td className="p-3">{s.penalty_strokes ?? 0}</td>
                          <td className="p-3">{s.start_lie ?? "—"}</td>
                          <td className="p-3">{s.end_lie ?? "—"}</td>
                          <td className="p-3">
                            <div className="flex flex-col">
                              <span className="font-medium">{startPref}</span>
                              <span className="text-xs text-neutral-500">
                                {s.start_lie === "Green" ? `${fmtDist(s.start_dist_yards)} yd` : `${fmtDist(s.start_dist_feet)} ft`}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col">
                              <span className="font-medium">{endPref}</span>
                              <span className="text-xs text-neutral-500">
                                {s.end_lie === "Green" || s.end_lie === "Hole" ? `${fmtDist(s.end_dist_yards)} yd` : `${fmtDist(s.end_dist_feet)} ft`}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">{s.club ?? "—"}</td>
                          <td className="p-3">{s.note ?? "—"}</td>
                          <td className="p-3">{s.holed ? "Yes" : "No"}</td>
                          <td className="p-3">
                            <form action={deleteShot} onSubmit={(e) => { if (!confirm(`Delete shot #${s.shot_number} on hole ${hole}?`)) e.preventDefault(); }}>
                              <input type="hidden" name="id" value={s.id} />
                              <input type="hidden" name="round_id" value={roundId} />
                              <button className="border rounded px-2 py-1 hover:bg-red-50 text-red-700 border-red-200">Delete</button>
                            </form>
                          </td>
                        </tr>
                      );
                    })}
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

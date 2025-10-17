// app/rounds/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Shot = {
  id: string;
  round_id: string;
  hole?: number | null;
  hole_number?: number | null;
  hole_id?: string | null;
  shot_number?: number | null;
  start_lie?: string | null;
  end_lie?: string | null;
  start_distance?: number | null;
  end_distance?: number | null;
  club?: string | null;
  penalty?: boolean | number | null;
  strokes_gained?: number | null;
};

type RoundRow = {
  id: string;
  player_id?: string | null;
  course_id?: string | null;
  tee_set_id?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  played_at?: string | null;
  status?: string | null;
  course?: { name?: string | null } | null;
  player?: { name?: string | null; full_name?: string | null } | null;
  tee_set?: { name?: string | null } | null;
};

type HoleAgg = {
  hole: number;
  strokes: number;
  putts: number;
  penalties: number;
  sg: number;
};

function normalizeHoleNumber(s: Shot): number | null {
  if (typeof s.hole === "number") return s.hole || null;
  if (typeof s.hole_number === "number") return s.hole_number || null;
  return null; // if only hole_id is stored, we’ll need a join later
}

function coercePenalty(v: Shot["penalty"]): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  return false;
}

function isPutt(s: Shot): boolean {
  if (s.start_lie?.toLowerCase() === "green") return true;
  // Heuristics in case lie wasn’t stored consistently:
  const sd = s.start_distance ?? undefined;
  const ed = s.end_distance ?? undefined;
  if (typeof sd === "number" && sd <= 10) return true; // <= 10 ft
  if (typeof sd === "number" && typeof ed === "number" && sd <= 15 && ed <= 15) return true;
  return false;
}

function aggregateByHole(shots: Shot[]) {
  const nums = new Set<number>();
  for (const s of shots) {
    const h = normalizeHoleNumber(s);
    if (h && h > 0) nums.add(h);
  }

  const maxHole = nums.size ? Math.max(...nums) : 18;
  const minHole = nums.size ? Math.min(...nums) : 1;

  const idx: Record<number, HoleAgg> = {};
  for (let h = minHole; h <= maxHole; h++) {
    idx[h] = { hole: h, strokes: 0, putts: 0, penalties: 0, sg: 0 };
  }

  for (const s of shots) {
    const h = normalizeHoleNumber(s);
    if (!h || !idx[h]) continue;
    idx[h].strokes += 1;
    if (isPutt(s)) idx[h].putts += 1;
    if (coercePenalty(s.penalty)) idx[h].penalties += 1;
    idx[h].sg += s.strokes_gained ?? 0;
  }

  const holes = Object.values(idx).sort((a, b) => a.hole - b.hole);
  const totals = holes.reduce(
    (a, h) => ({
      hole: 0,
      strokes: a.strokes + h.strokes,
      putts: a.putts + h.putts,
      penalties: a.penalties + h.penalties,
      sg: a.sg + h.sg,
    }),
    { hole: 0, strokes: 0, putts: 0, penalties: 0, sg: 0 }
  );

  return { holes, totals };
}

function sumRange(holes: HoleAgg[], start: number, end: number) {
  const slice = holes.filter((h) => h.hole >= start && h.hole <= end);
  return slice.reduce(
    (a, h) => ({
      strokes: a.strokes + h.strokes,
      putts: a.putts + h.putts,
      penalties: a.penalties + h.penalties,
      sg: a.sg + h.sg,
    }),
    { strokes: 0, putts: 0, penalties: 0, sg: 0 }
  );
}

async function fetchRoundAndShots(id: string) {
  const supabase = await createClient();

  const { data: round, error: roundErr } = await supabase
    .from("rounds")
    .select(
      `
      id, player_id, course_id, tee_set_id,
      started_at, completed_at, created_at, played_at, status,
      course:courses(name),
      player:players(name, full_name),
      tee_set:tee_sets(name)
      `
    )
    .eq("id", id)
    .single();

  if (roundErr || !round) {
    return { round: null as any, shots: [] as Shot[], err: roundErr ?? new Error("Round not found") };
  }

  const { data: shots, error: shotsErr } = await supabase
    .from("shots")
    .select(
      `
      id, round_id,
      hole, hole_number, hole_id,
      shot_number,
      start_lie, end_lie,
      start_distance, end_distance,
      club, penalty, strokes_gained
      `
    )
    .eq("round_id", id)
    .order("hole_number", { ascending: true, nullsFirst: false })
    .order("shot_number", { ascending: true, nullsFirst: false });

  if (shotsErr) return { round, shots: [], err: shotsErr };

  return { round: round as RoundRow, shots: (shots ?? []) as Shot[], err: null };
}

function TitleBar({ round }: { round: RoundRow }) {
  const date =
    round.played_at ??
    round.started_at ??
    round.created_at ??
    round.completed_at ??
    null;

  const playerName = round.player?.full_name ?? round.player?.name ?? "Player";
  const courseName = round.course?.name ?? "Course";
  const teeName = round.tee_set?.name ? ` • ${round.tee_set?.name}` : "";

  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold">Round Summary</h1>
      <div className="text-sm text-muted-foreground">
        <span>{playerName}</span> • <span>{courseName}</span>
        {teeName} {date ? ` • ${new Date(date).toLocaleDateString()}` : ""}
      </div>
    </div>
  );
}

export default async function RoundPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { round, shots, err } = await fetchRoundAndShots(id);
  if (err || !round) notFound();

  const { holes, totals } = aggregateByHole(shots);
  const front = sumRange(holes, 1, 9);
  const back = sumRange(holes, 10, 18);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between">
        <TitleBar round={round as RoundRow} />
        <Link
          href={`/rounds/${id}/edit`}
          className="inline-flex items-center rounded-xl border px-3 py-2 text-sm hover:bg-accent"
        >
          Edit Round / Shots
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm border-separate border-spacing-y-1">
          <thead>
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="px-2 py-1">Hole</th>
              <th className="px-2 py-1 text-right">Strokes</th>
              <th className="px-2 py-1 text-right">Putts</th>
              <th className="px-2 py-1 text-right">Pen</th>
              <th className="px-2 py-1 text-right">SG (hole)</th>
            </tr>
          </thead>
          <tbody>
            {holes.map((h) => (
              <tr key={h.hole} className="bg-card rounded-lg">
                <td className="px-2 py-2 font-medium">{h.hole}</td>
                <td className="px-2 py-2 text-right">{h.strokes || ""}</td>
                <td className="px-2 py-2 text-right">{h.putts || ""}</td>
                <td className="px-2 py-2 text-right">{h.penalties || ""}</td>
                <td className="px-2 py-2 text-right">
                  {h.sg ? h.sg.toFixed(2) : ""}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t">
              <td className="px-2 py-2 font-semibold">Front 9</td>
              <td className="px-2 py-2 text-right">{front.strokes || "—"}</td>
              <td className="px-2 py-2 text-right">{front.putts || "—"}</td>
              <td className="px-2 py-2 text-right">{front.penalties || "—"}</td>
              <td className="px-2 py-2 text-right">
                {front.sg ? front.sg.toFixed(2) : "—"}
              </td>
            </tr>
            <tr>
              <td className="px-2 py-2 font-semibold">Back 9</td>
              <td className="px-2 py-2 text-right">{back.strokes || "—"}</td>
              <td className="px-2 py-2 text-right">{back.putts || "—"}</td>
              <td className="px-2 py-2 text-right">{back.penalties || "—"}</td>
              <td className="px-2 py-2 text-right">
                {back.sg ? back.sg.toFixed(2) : "—"}
              </td>
            </tr>
            <tr>
              <td className="px-2 py-2 font-semibold">Total</td>
              <td className="px-2 py-2 text-right">{totals.strokes || "—"}</td>
              <td className="px-2 py-2 text-right">{totals.putts || "—"}</td>
              <td className="px-2 py-2 text-right">{totals.penalties || "—"}</td>
              <td className="px-2 py-2 text-right">
                {totals.sg ? totals.sg.toFixed(2) : "—"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Raw shots list (debug/verification) */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Shots (debug)</h2>
        <div className="rounded-xl border">
          <div className="grid grid-cols-12 text-xs uppercase text-muted-foreground border-b">
            <div className="p-2 col-span-1">Hole</div>
            <div className="p-2 col-span-1">#</div>
            <div className="p-2 col-span-2">Start</div>
            <div className="p-2 col-span-2">End</div>
            <div className="p-2 col-span-2">Distances</div>
            <div className="p-2 col-span-2">Penalty</div>
            <div className="p-2 col-span-2">SG</div>
          </div>
          {shots.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">
              No shots recorded for this round yet.
            </div>
          ) : (
            shots.map((s) => {
              const hole = normalizeHoleNumber(s) ?? "—";
              const startUnit =
                s.start_lie?.toLowerCase() === "green" ? "ft" : "yds";
              const endUnit =
                s.end_lie?.toLowerCase() === "green" ? "ft" : "yds";
              return (
                <div key={s.id} className="grid grid-cols-12 border-b last:border-none">
                  <div className="p-2 col-span-1">{hole}</div>
                  <div className="p-2 col-span-1">{s.shot_number ?? ""}</div>
                  <div className="p-2 col-span-2">
                    {s.start_lie ?? ""}{" "}
                    {s.start_distance != null ? `(${s.start_distance} ${startUnit})` : ""}
                  </div>
                  <div className="p-2 col-span-2">
                    {s.end_lie ?? ""}{" "}
                    {s.end_distance != null ? `(${s.end_distance} ${endUnit})` : ""}
                  </div>
                  <div className="p-2 col-span-2">
                    {s.start_distance != null ? `${s.start_distance}` : ""} →{" "}
                    {s.end_distance != null ? `${s.end_distance}` : ""}
                  </div>
                  <div className="p-2 col-span-2">
                    {coercePenalty(s.penalty) ? "Yes" : ""}
                  </div>
                  <div className="p-2 col-span-2">
                    {s.strokes_gained != null ? s.strokes_gained.toFixed(2) : ""}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

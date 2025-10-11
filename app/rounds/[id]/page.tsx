import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const fmt = (d: number | null) => (d == null ? "—" : d === 0 ? "E" : d > 0 ? `+${d}` : `${d}`);
const one = <T,>(v: T | T[] | null | undefined): T | null => (!v ? null : Array.isArray(v) ? v[0] ?? null : v);

export default async function RoundSummaryPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { id } = params;

  const { data: round, error: rErr } = await supabase
    .from("rounds")
    .select(`
      id, date,
      player:players(*),
      course:courses(id, name),
      tee:tees(id, name, rating, slope, par)
    `)
    .eq("id", id)
    .single();

  if (rErr || !round) {
    return (
      <div className="mx-auto max-w-[1100px] p-6">
        <h1 className="text-2xl font-semibold">Round not found</h1>
        <p className="text-gray-600 mt-2">{rErr?.message ?? "We couldn't load that round."}</p>
        <div className="mt-6"><Link href="/rounds" className="underline">Back to rounds</Link></div>
      </div>
    );
  }

  const player = one<any>(round.player);
  const course = one<{ id: string; name: string }>(round.course);
  const tee = one<{ id: string; name: string; rating: number | null; slope: number | null; par: number | null }>(round.tee);
  const playerName = player?.full_name ?? player?.name ?? player?.display_name ?? "Unknown Player";

  const { data: holes } = await supabase
    .from("round_holes")
    .select("hole_number, par, yards, strokes, putts, fir, gir, up_down, sand_save, penalty")
    .eq("round_id", id)
    .order("hole_number");

  const hs = (holes ?? []) as any[];
  const sum = (xs: Array<number | null | undefined>) => xs.reduce((t, n) => t + (n ?? 0), 0);
  const by = (a: number, b: number) => hs.filter((h) => h.hole_number >= a && h.hole_number <= b);

  const front = by(1, 9), back = by(10, 18);
  const parTotal = sum(hs.map((h) => h.par));
  const strokesTotal = sum(hs.map((h) => h.strokes));
  const puttsTotal = sum(hs.map((h) => h.putts));
  const frontDelta = sum(front.map((h) => (h.strokes ?? 0) - (h.par ?? 0)));
  const backDelta = sum(back.map((h) => (h.strokes ?? 0) - (h.par ?? 0)));
  const totalDelta = strokesTotal - parTotal;

  const firOpp = hs.filter((h) => h.par === 4 || h.par === 5).length;
  const firYes = hs.filter((h) => (h.par === 4 || h.par === 5) && h.fir).length;
  const girYes = hs.filter((h) => h.gir).length;

  const dateStr = round.date
    ? new Date(round.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : "";

  return (
    <div className="mx-auto max-w-[1100px] p-6 space-y-8">
      <div className="rounded-2xl border p-5 shadow-sm bg-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{playerName}</h1>
            <div className="text-gray-600 mt-1">{course?.name ?? "Unknown Course"} — {tee?.name ?? "Tee"}</div>
            <div className="text-gray-600">{dateStr}</div>
            <div className="text-gray-500 text-sm mt-1">
              {tee?.rating ? `Rating ${tee.rating}` : ""}{tee?.slope ? ` • Slope ${tee.slope}` : ""}{tee?.par ? ` • Par ${tee.par}` : ""}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/rounds/${id}/edit`} className="rounded-2xl border px-4 py-2 hover:shadow">Edit</Link>
            <Link href="/rounds" className="rounded-2xl border px-4 py-2 hover:shadow">All Rounds</Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Total" value={strokesTotal || "—"} sub={fmt(totalDelta)} />
        <Stat label="Front 9" value={sum(front.map((h) => h.strokes ?? 0)) || "—"} sub={fmt(frontDelta)} />
        <Stat label="Back 9" value={sum(back.map((h) => h.strokes ?? 0)) || "—"} sub={fmt(backDelta)} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Kpi label="Putts" value={puttsTotal} />
        <Kpi label="FIR" value={`${firOpp ? Math.round((firYes / firOpp) * 100) : 0}%`} helper={`${firYes}/${firOpp}`} />
        <Kpi label="GIR" value={`${hs.length ? Math.round((girYes / hs.length) * 100) : 0}%`} helper={`${girYes}/18`} />
        <Kpi label="Up & Downs" value={hs.filter((h) => h.up_down).length} />
        <Kpi label="Sand Saves" value={hs.filter((h) => h.sand_save).length} />
        <Kpi label="Penalties" value={hs.filter((h) => h.penalty).length} />
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-2xl border p-5 shadow-sm bg-white">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold">{value}</div>
      {sub ? <div className="text-gray-600 mt-1">{sub}</div> : null}
    </div>
  );
}
function Kpi({ label, value, helper }: { label: string; value: number | string; helper?: string }) {
  return (
    <div className="rounded-2xl border p-4 bg-white">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {helper ? <div className="text-xs text-gray-500 mt-1">{helper}</div> : null}
    </div>
  );
}

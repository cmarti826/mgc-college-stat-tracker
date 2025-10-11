// app/rounds/[id]/page.tsx
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const fmtToPar = (d: number | null) => (d == null ? "—" : d === 0 ? "E" : d > 0 ? `+${d}` : `${d}`);
const one = <T,>(v: T | T[] | null | undefined): T | null =>
  !v ? null : Array.isArray(v) ? v[0] ?? null : v;

export default async function RoundSummaryPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { id } = params;

  // Round + related
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
        <div className="mt-6">
          <Link href="/rounds" className="underline">
            Back to rounds
          </Link>
        </div>
      </div>
    );
  }

  const player = one<any>(round.player);
  const course = one<{ id: string; name: string }>(round.course);
  const tee = one<{ id: string; name: string; rating: number | null; slope: number | null; par: number | null }>(
    round.tee
  );
  const playerName = player?.full_name ?? player?.name ?? player?.display_name ?? "Unknown Player";

  // Holes
  const { data: holes } = await supabase
    .from("round_holes")
    .select(
      "hole_number, par, yards, strokes, putts, fir, gir, up_down, sand_save, penalty"
    )
    .eq("round_id", id)
    .order("hole_number");

  type HoleRow = {
    hole_number: number;
    par: number | null;
    yards: number | null;
    strokes: number | null;
    putts: number | null;
    fir: boolean | null;
    gir: boolean | null;
    up_down: boolean | null;
    sand_save: boolean | null;
    penalty: boolean | null;
  };

  const hs = (holes ?? []) as HoleRow[];

  // --- helpers (typed to avoid the TS error you saw) ---
  const sum = (xs: Array<number | null | undefined>): number =>
    xs.reduce<number>((acc, n) => acc + (n ?? 0), 0);

  const by = (a: number, b: number) => hs.filter((h) => h.hole_number >= a && h.hole_number <= b);

  const front = by(1, 9);
  const back = by(10, 18);

  const parTotal = sum(hs.map((h) => h.par));
  const strokesTotal = sum(hs.map((h) => h.strokes));
  const puttsTotal = sum(hs.map((h) => h.putts));

  const frontPar = sum(front.map((h) => h.par));
  const backPar = sum(back.map((h) => h.par));
  const frontStrokes = sum(front.map((h) => h.strokes));
  const backStrokes = sum(back.map((h) => h.strokes));

  const frontDelta = frontStrokes - frontPar;
  const backDelta = backStrokes - backPar;
  const totalDelta = strokesTotal - (frontPar + backPar);

  const firOpp = hs.filter((h) => h.par === 4 || h.par === 5).length;
  const firYes = hs.filter((h) => (h.par === 4 || h.par === 5) && h.fir).length;
  const girYes = hs.filter((h) => h.gir).length;

  const dateStr = round.date
    ? new Date(round.date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <div className="mx-auto max-w-[1100px] p-6 space-y-8">
      {/* Header */}
      <div className="rounded-2xl border p-5 shadow-sm bg-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{playerName}</h1>
            <div className="text-gray-600 mt-1">
              {(course?.name ?? "Unknown Course")} — {(tee?.name ?? "Tee")}
            </div>
            <div className="text-gray-600">{dateStr}</div>
            <div className="text-gray-500 text-sm mt-1">
              {tee?.rating ? `Rating ${tee.rating}` : ""}
              {tee?.slope ? ` • Slope ${tee.slope}` : ""}
              {tee?.par ? ` • Par ${tee.par}` : ""}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/rounds/${id}/edit`} className="rounded-2xl border px-4 py-2 hover:shadow">
              Edit
            </Link>
            <Link href="/rounds" className="rounded-2xl border px-4 py-2 hover:shadow">
              All Rounds
            </Link>
          </div>
        </div>
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total" value={strokesTotal || "—"} sub={fmtToPar(totalDelta)} />
        <StatCard label="Front 9" value={frontStrokes || "—"} sub={fmtToPar(frontDelta)} />
        <StatCard label="Back 9" value={backStrokes || "—"} sub={fmtToPar(backDelta)} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Kpi label="Putts" value={puttsTotal} />
        <Kpi label="FIR" value={`${firOpp ? Math.round((firYes / firOpp) * 100) : 0}%`} helper={`${firYes}/${firOpp}`} />
        <Kpi label="GIR" value={`${hs.length ? Math.round((girYes / hs.length) * 100) : 0}%`} helper={`${girYes}/18`} />
        <Kpi label="Up & Downs" value={hs.filter((h) => h.up_down).length} />
        <Kpi label="Sand Saves" value={hs.filter((h) => h.sand_save).length} />
        <Kpi label="Penalties" value={hs.filter((h) => h.penalty).length} />
      </div>

      {/* Holes */}
      <div className="overflow-x-auto rounded-2xl border">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <Th>#</Th>
              <Th>Par</Th>
              <Th>Yards</Th>
              <Th>Strokes</Th>
              <Th>± Par</Th>
              <Th>Putts</Th>
              <Th>FIR</Th>
              <Th>GIR</Th>
              <Th>Up&Down</Th>
              <Th>Sand</Th>
              <Th>Penalty</Th>
            </tr>
          </thead>
          <tbody>
            {hs.map((h) => {
              const delta =
                h.strokes != null && h.par != null ? h.strokes - h.par : null;
              return (
                <tr key={h.hole_number} className="border-t">
                  <Td>{h.hole_number}</Td>
                  <Td>{h.par ?? "—"}</Td>
                  <Td>{h.yards ?? "—"}</Td>
                  <Td>{h.strokes ?? "—"}</Td>
                  <Td
                    className={
                      delta != null
                        ? delta < 0
                          ? "text-green-600"
                          : delta > 0
                          ? "text-red-600"
                          : ""
                        : ""
                    }
                  >
                    {fmtToPar(delta)}
                  </Td>
                  <Td>{h.putts ?? "—"}</Td>
                  <Td>{h.par === 4 || h.par === 5 ? (h.fir ? "✓" : "—") : "—"}</Td>
                  <Td>{h.gir ? "✓" : "—"}</Td>
                  <Td>{h.up_down ? "✓" : "—"}</Td>
                  <Td>{h.sand_save ? "✓" : "—"}</Td>
                  <Td>{h.penalty ? "✓" : "—"}</Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
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

function Th({ children }: { children: React.ReactNode }) {
  return <th className="p-3 text-left font-medium text-gray-700">{children}</th>;
}
function Td({ children, className = "", colSpan }: { children: React.ReactNode; className?: string; colSpan?: number }) {
  return (
    <td className={`p-3 ${className}`} colSpan={colSpan}>
      {children}
    </td>
  );
}

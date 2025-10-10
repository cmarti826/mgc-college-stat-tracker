// app/rounds/[id]/page.tsx
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

function fmtScoreToPar(delta: number | null) {
  if (delta === null) return "—";
  if (delta === 0) return "E";
  return delta > 0 ? `+${delta}` : `${delta}`;
}

export default async function RoundSummaryPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const roundId = params.id;

  // Fetch round header info
  const { data: round, error: roundErr } = await supabase
    .from("rounds")
    .select(
      `
      id, played_on, notes,
      player:players(id, first_name, last_name, grad_year),
      course:courses(id, name),
      tee:tee_sets(id, name, rating, slope, par)
    `
    )
    .eq("id", roundId)
    .single();

  if (roundErr || !round) {
    return (
      <div className="mx-auto max-w-[1100px] p-6">
        <h1 className="text-2xl font-semibold">Round not found</h1>
        <p className="text-gray-600 mt-2">{roundErr?.message ?? "We couldn't load that round."}</p>
        <div className="mt-6">
          <Link href="/rounds" className="underline">Back to rounds</Link>
        </div>
      </div>
    );
  }

  // Fetch holes
  const { data: holes } = await supabase
    .from("round_holes")
    .select("hole_number, par, yards, strokes, putts, fir, gir, up_down, sand_save, penalty")
    .eq("round_id", roundId)
    .order("hole_number");

  const holeList = holes ?? [];

  // Derive stats
  const byNine = (start: number, end: number) =>
    holeList.filter((h) => h.hole_number >= start && h.hole_number <= end);
  const front = byNine(1, 9);
  const back = byNine(10, 18);

  const sum = (arr: Array<number | null | undefined>) =>
    arr.reduce((t: number, n) => t + (n ?? 0), 0);

  const parFront = sum(front.map((h) => h.par));
  const parBack = sum(back.map((h) => h.par));
  const parTotal = parFront + parBack;

  const strokesFront = sum(front.map((h) => h.strokes));
  const strokesBack = sum(back.map((h) => h.strokes));
  const strokesTotal = strokesFront + strokesBack;

  const puttsTotal = sum(holeList.map((h) => h.putts));

  const firOpp = holeList.filter((h) => h.par === 4 || h.par === 5).length;
  const firYes = holeList.filter((h) => (h.par === 4 || h.par === 5) && h.fir === true).length;
  const firPct = firOpp ? Math.round((firYes / firOpp) * 100) : 0;

  const girYes = holeList.filter((h) => h.gir === true).length;
  const girPct = holeList.length ? Math.round((girYes / holeList.length) * 100) : 0;

  const udYes = holeList.filter((h) => h.up_down === true).length;
  const ssYes = holeList.filter((h) => h.sand_save === true).length;
  const penYes = holeList.filter((h) => h.penalty === true).length;

  // If any strokes missing, score-to-par is partial; otherwise total
  const anyMissing = holeList.some((h) => h.strokes == null);
  const scoreToPar = anyMissing ? null : strokesTotal - parTotal;
  const frontToPar = anyMissing ? null : strokesFront - parFront;
  const backToPar = anyMissing ? null : strokesBack - parBack;

  const dateStr = round.played_on
    ? new Date(round.played_on).toLocaleDateString(undefined, {
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
            <h1 className="text-2xl font-semibold">
              {round.player?.first_name} {round.player?.last_name}
            </h1>
            <div className="text-gray-600 mt-1">
              {round.course?.name} — {round.tee?.name}
            </div>
            <div className="text-gray-600">{dateStr}</div>
            <div className="text-gray-500 text-sm mt-1">
              {round.tee?.rating ? `Rating ${round.tee.rating}` : ""}
              {round.tee?.slope ? ` • Slope ${round.tee.slope}` : ""}
              {round.tee?.par ? ` • Par ${round.tee.par}` : ""}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/rounds/${roundId}/edit`} className="rounded-2xl border px-4 py-2 hover:shadow">
              Edit
            </Link>
            <Link href="/rounds" className="rounded-2xl border px-4 py-2 hover:shadow">
              All Rounds
            </Link>
          </div>
        </div>
        {round.notes && <p className="mt-3 text-gray-700 whitespace-pre-wrap">{round.notes}</p>}
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total" value={strokesTotal || "—"} sub={fmtScoreToPar(scoreToPar)} />
        <StatCard label="Front 9" value={strokesFront || "—"} sub={fmtScoreToPar(frontToPar)} />
        <StatCard label="Back 9" value={strokesBack || "—"} sub={fmtScoreToPar(backToPar)} />
      </div>

      {/* Scorecards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Scorecard title="Front 9" holes={front} />
        <Scorecard title="Back 9" holes={back} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Kpi label="Putts" value={puttsTotal} />
        <Kpi label="FIR" value={`${firPct}%`} helper={`${firYes}/${firOpp}`} />
        <Kpi label="GIR" value={`${girPct}%`} helper={`${girYes}/18`} />
        <Kpi label="Up & Downs" value={udYes} />
        <Kpi label="Sand Saves" value={ssYes} />
        <Kpi label="Penalties" value={penYes} />
      </div>

      {/* Table: All Holes */}
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
            {holeList.map((h) => {
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
                    {fmtScoreToPar(delta)}
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
          <tfoot className="bg-gray-50">
            <tr>
              <Td colSpan={3} className="font-medium">
                Totals
              </Td>
              <Td className="font-semibold">{strokesTotal || "—"}</Td>
              <Td className="font-semibold">{fmtScoreToPar(scoreToPar)}</Td>
              <Td className="font-semibold">{puttsTotal}</Td>
              <Td className="font-semibold">{`${firYes}/${firOpp}`}</Td>
              <Td className="font-semibold">{`${girYes}/18`}</Td>
              <Td className="font-semibold">{udYes}</Td>
              <Td className="font-semibold">{ssYes}</Td>
              <Td className="font-semibold">{penYes}</Td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Placeholder: Strokes Gained
          If you already have a SG view/table, tell me the name + columns and I’ll render it here. */}
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

function Td({
  children,
  className = "",
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td className={`p-3 ${className}`} colSpan={colSpan}>
      {children}
    </td>
  );
}

function Scorecard({ title, holes }: { title: string; holes: any[] }) {
  const sum = (arr: Array<number | null | undefined>) =>
    arr.reduce((t: number, n) => t + (n ?? 0), 0);

  const par = sum(holes.map((h) => h.par));
  const strokes = sum(holes.map((h) => h.strokes));
  const delta = holes.some((h) => h.strokes == null) ? null : strokes - par;

  return (
    <div className="rounded-2xl border shadow-sm bg-white">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-gray-600">
          {strokes || "—"} ({fmtScoreToPar(delta)})
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[520px] w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <Th></Th>
              {holes.map((h) => (
                <Th key={`h-${h.hole_number}`}>{h.hole_number}</Th>
              ))}
              <Th>Total</Th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <Td className="font-medium">Par</Td>
              {holes.map((h) => (
                <Td key={`p-${h.hole_number}`}>{h.par ?? "—"}</Td>
              ))}
              <Td className="font-semibold">{par}</Td>
            </tr>
            <tr className="border-t">
              <Td className="font-medium">Strokes</Td>
              {holes.map((h) => (
                <Td key={`s-${h.hole_number}`}>{h.strokes ?? "—"}</Td>
              ))}
              <Td className="font-semibold">{strokes || "—"}</Td>
            </tr>
            <tr className="border-t">
              <Td className="font-medium">± Par</Td>
              {holes.map((h) => {
                const d =
                  h.strokes != null && h.par != null ? h.strokes - h.par : null;
                const cls =
                  d != null ? (d < 0 ? "text-green-600" : d > 0 ? "text-red-600" : "") : "";
                return (
                  <Td key={`d-${h.hole_number}`} className={cls}>
                    {fmtScoreToPar(d)}
                  </Td>
                );
              })}
              <Td className="font-semibold">{fmtScoreToPar(delta)}</Td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

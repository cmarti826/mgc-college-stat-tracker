// app/rounds/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type HoleAgg = {
  hole_number: number;
  strokes: number | null;
  putts: number | null;
  penalty_strokes: number | null;
  sg_total: number | null;
};

function sum<T extends keyof HoleAgg>(rows: HoleAgg[], key: T) {
  return rows.reduce((acc, r) => acc + (Number(r[key] ?? 0) || 0), 0);
}

// Safely read either an embedded object or single-element array
function firstOr<T>(val: T | T[] | null | undefined): T | null {
  if (Array.isArray(val)) return (val[0] ?? null) as T | null;
  return (val as T) ?? null;
}

export default async function RoundSummaryPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const roundId = params.id;

  // Get round info
  const { data: round, error: roundErr } = await supabase
    .from("rounds")
    .select(
      `
        id, date, type, status, notes,
        player_id, team_id, course_id, tee_set_id,
        player:players(full_name),
        course:courses(name),
        tee_set:tee_sets(name)
      `
    )
    .eq("id", roundId)
    .maybeSingle();

  if (roundErr) throw new Error(`Failed to load round: ${roundErr.message}`);
  if (!round) return notFound();

  // Handle array vs object results
  const playerEmb = firstOr<{ full_name?: string }>(round.player);
  const courseEmb = firstOr<{ name?: string }>(round.course);
  const teeEmb = firstOr<{ name?: string }>(round.tee_set);

  const playerName = playerEmb?.full_name ?? "Player";
  const courseName = courseEmb?.name ?? "Course";
  const teeName = teeEmb?.name ?? "Tee";

  // Totals for header
  const { data: totals } = await supabase
    .from("v_round_totals")
    .select(
      `
        round_id, strokes, putts, penalty_strokes,
        sg_total, sg_ott, sg_app, sg_arg, sg_putt
      `
    )
    .eq("round_id", roundId)
    .maybeSingle();

  // Hole-by-hole
  const { data: holes, error: holesErr } = await supabase
    .from("v_hole_totals")
    .select(
      `
        hole_number,
        strokes, putts, penalty_strokes,
        sg_total
      `
    )
    .eq("round_id", roundId)
    .order("hole_number", { ascending: true });

  if (holesErr) throw new Error(`Failed to load hole totals: ${holesErr.message}`);

  const holeRows: HoleAgg[] = (holes ?? []).map((h) => ({
    hole_number: h.hole_number,
    strokes: h.strokes,
    putts: h.putts,
    penalty_strokes: h.penalty_strokes,
    sg_total: h.sg_total,
  }));

  const front = holeRows.filter((h) => h.hole_number <= 9);
  const back = holeRows.filter((h) => h.hole_number >= 10);

  const frontSum = {
    strokes: sum(front, "strokes"),
    putts: sum(front, "putts"),
    pens: sum(front, "penalty_strokes"),
    sg: sum(front, "sg_total"),
  };
  const backSum = {
    strokes: sum(back, "strokes"),
    putts: sum(back, "putts"),
    pens: sum(back, "penalty_strokes"),
    sg: sum(back, "sg_total"),
  };
  const allSum = {
    strokes: sum(holeRows, "strokes"),
    putts: sum(holeRows, "putts"),
    pens: sum(holeRows, "penalty_strokes"),
    sg: sum(holeRows, "sg_total"),
  };

  // ✅ Precompute using nullish coalescing only
  const strokesValue: number | string = (totals?.strokes ?? allSum.strokes) ?? "—";
  const puttsValue: number | string = (totals?.putts ?? allSum.putts) ?? "—";
  const penaltiesValue: number | string =
    (totals?.penalty_strokes ?? allSum.pens) ?? "—";
  const sgValue: string | number =
    typeof (totals?.sg_total ?? allSum.sg) === "number"
      ? (totals?.sg_total ?? allSum.sg).toFixed(2)
      : "—";

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {playerName} — {courseName} ({teeName})
          </h1>
          <p className="text-gray-600">
            Date: {String(round.date)} · Type: {String(round.type)} · Status:{" "}
            {String(round.status)}
          </p>
          {round.notes ? <p className="mt-1 text-gray-700">{round.notes}</p> : null}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/rounds/${roundId}/shots`}
            className="rounded border px-3 py-2 hover:shadow"
          >
            Edit Shots
          </Link>
          <Link
            href={`/rounds`}
            className="rounded border px-3 py-2 hover:shadow"
          >
            All Rounds
          </Link>
        </div>
      </div>

      {/* Quick cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card label="Strokes" value={strokesValue} />
        <Card label="Putts" value={puttsValue} />
        <Card label="Penalties" value={penaltiesValue} />
        <Card label="Strokes Gained" value={sgValue} />
      </div>

      {/* Hole-by-hole */}
      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <Th>Hole</Th>
              <Th className="text-right">Strokes</Th>
              <Th className="text-right">Putts</Th>
              <Th className="text-right">Pen</Th>
              <Th className="text-right">SG</Th>
            </tr>
          </thead>
          <tbody>
            {holeRows.map((h) => (
              <tr key={h.hole_number} className="border-t">
                <Td>{h.hole_number}</Td>
                <Td className="text-right">{h.strokes ?? "—"}</Td>
                <Td className="text-right">{h.putts ?? "—"}</Td>
                <Td className="text-right">{h.penalty_strokes ?? "—"}</Td>
                <Td className="text-right">
                  {typeof h.sg_total === "number" ? h.sg_total.toFixed(2) : "—"}
                </Td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr className="border-t">
              <Td className="font-semibold">Front 9</Td>
              <Td className="text-right">{frontSum.strokes || "—"}</Td>
              <Td className="text-right">{frontSum.putts || "—"}</Td>
              <Td className="text-right">{frontSum.pens || "—"}</Td>
              <Td className="text-right">
                {frontSum.sg ? frontSum.sg.toFixed(2) : "—"}
              </Td>
            </tr>
            <tr>
              <Td className="font-semibold">Back 9</Td>
              <Td className="text-right">{backSum.strokes || "—"}</Td>
              <Td className="text-right">{backSum.putts || "—"}</Td>
              <Td className="text-right">{backSum.pens || "—"}</Td>
              <Td className="text-right">
                {backSum.sg ? backSum.sg.toFixed(2) : "—"}
              </Td>
            </tr>
            <tr className="border-t-2">
              <Td className="font-semibold">Total</Td>
              <Td className="text-right">{allSum.strokes || "—"}</Td>
              <Td className="text-right">{allSum.putts || "—"}</Td>
              <Td className="text-right">{allSum.pens || "—"}</Td>
              <Td className="text-right">
                {allSum.sg ? allSum.sg.toFixed(2) : "—"}
              </Td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// UI helpers
function Card({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-xs uppercase text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <th className={`px-2 py-2 text-left ${className}`}>{children}</th>;
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-2 py-2 ${className}`}>{children}</td>;
}

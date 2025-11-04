// app/rounds/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabase } from "lib/supabase/server";
import { format } from "date-fns";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type HoleAgg = {
  hole_number: number;
  strokes: number | null;
  putts: number | null;
  penalty_strokes: number | null;
  sg_total: number | null;
};

function sum<T extends keyof HoleAgg>(rows: HoleAgg[], key: T): number {
  return rows.reduce((acc, r) => acc + (Number(r[key] ?? 0) || 0), 0);
}

export default async function RoundSummaryPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerSupabase();
  const roundId = params.id;

  const { data: round, error: roundErr } = await supabase
    .from("scheduled_rounds")
    .select("id, round_date, type, status, notes, player_id, course_id, tee_set_id")
    .eq("id", roundId)
    .single();

  if (roundErr || !round) {
    console.error("Round fetch error:", roundErr);
    notFound();
  }

  const [
    { data: player },
    { data: course },
    { data: tee },
  ] = await Promise.all([
    round.player_id
      ? supabase.from("players").select("full_name").eq("id", round.player_id).single()
      : Promise.resolve({ data: null } as any),
    round.course_id
      ? supabase.from("courses").select("name").eq("id", round.course_id).single()
      : Promise.resolve({ data: null } as any),
    round.tee_set_id
      ? supabase.from("tee_sets").select("name").eq("id", round.tee_set_id).single()
      : Promise.resolve({ data: null } as any),
  ]);

  const playerName = player?.full_name ?? "Unknown Player";
  const courseName = course?.name ?? "Unknown Course";
  const teeName = tee?.name ?? "Unknown Tee";

  const { data: totals, error: totalsErr } = await supabase
    .from("v_round_totals")
    .select("strokes, putts, penalty_strokes, sg_total, sg_ott, sg_app, sg_arg, sg_putt")
    .eq("round_id", roundId)
    .single();

  if (totalsErr) console.error("Totals view error:", totalsErr);

  const { data: holes, error: holesErr } = await supabase
    .from("v_hole_totals")
    .select("hole_number, strokes, putts, penalty_strokes, sg_total")
    .eq("round_id", roundId)
    .order("hole_number", { ascending: true });

  if (holesErr) console.error("Hole totals error:", holesErr);

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

  const strokesValue = totals?.strokes ?? allSum.strokes ?? "—";
  const puttsValue = totals?.putts ?? allSum.putts ?? "—";
  const penaltiesValue = totals?.penalty_strokes ?? allSum.pens ?? "—";
  const sgNum = totals?.sg_total ?? allSum.sg;
  const sgValue = typeof sgNum === "number" ? sgNum.toFixed(2) : "—";

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {playerName} — {courseName} ({teeName})
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {round.round_date ? format(new Date(round.round_date), "MMMM d, yyyy") : "—"} ·{" "}
            {round.type} · {round.status}
          </p>
          {round.notes && (
            <p className="mt-2 text-sm text-gray-700 italic">{round.notes}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/rounds/${roundId}/shots`}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:shadow transition"
          >
            Edit Shots
          </Link>
          <Link
            href="/rounds"
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:shadow transition"
          >
            All Rounds
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card label="Strokes" value={strokesValue} />
        <Card label="Putts" value={puttsValue} />
        <Card label="Penalties" value={penaltiesValue} />
        <Card label="SG Total" value={sgValue} />
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700 border-b">
              <tr>
                <Th>Hole</Th>
                <Th className="text-right">Strokes</Th>
                <Th className="text-right">Putts</Th>
                <Th className="text-right">Pen</Th>
                <Th className="text-right">SG</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {holeRows.map((h) => (
                <tr key={h.hole_number} className="hover:bg-gray-50 transition">
                  <Td className="font-medium">{h.hole_number}</Td>
                  <Td className="text-right">{h.strokes ?? "—"}</Td>
                  <Td className="text-right">{h.putts ?? "—"}</Td>
                  <Td className="text-right">{h.penalty_strokes ?? "—"}</Td>
                  <Td className="text-right">
                    {h.sg_total !== null ? h.sg_total.toFixed(2) : "—"}
                  </Td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold border-t">
                <Td>Front 9</Td>
                <Td className="text-right">{frontSum.strokes || "—"}</Td>
                <Td className="text-right">{frontSum.putts || "—"}</Td>
                <Td className="text-right">{frontSum.pens || "—"}</Td>
                <Td className="text-right">
                  {frontSum.sg ? frontSum.sg.toFixed(2) : "—"}
                </Td>
              </tr>
              <tr className="bg-gray-50 font-semibold">
                <Td>Back 9</Td>
                <Td className="text-right">{backSum.strokes || "—"}</Td>
                <Td className="text-right">{backSum.putts || "—"}</Td>
                <Td className="text-right">{backSum.pens || "—"}</Td>
                <Td className="text-right">
                  {backSum.sg ? backSum.sg.toFixed(2) : "—"}
                </Td>
              </tr>
              <tr className="bg-indigo-50 font-bold border-t-2">
                <Td>Total</Td>
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
    </div>
  );
}

function Card({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl border p-4 shadow-sm">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 text-sm ${className}`}>{children}</td>;
}
// app/rounds/[id]/page.tsx
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

// Make sure we don't serve cached data (SG totals should reflect DB right away)
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { params: { id: string } };

export default async function RoundSummaryPage({ params }: Params) {
  const roundId = params.id; // <-- matches [id] in the folder name
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  // 1) Try fast MV totals first (v2)
  const { data: mvTotals, error: mvErr } = await supabase
    .from("mv_round_sg_totals_v2")
    .select("*")
    .eq("round_id", roundId)
    .maybeSingle();

  // 2) Fallback to live calc if MV row missing
  const needFallback = !mvTotals && !mvErr;
  const { data: fallbackTotals } = needFallback
    ? await supabase
        .from("v_round_sg_totals_fallback_v2")
        .select("*")
        .eq("round_id", roundId)
        .maybeSingle()
    : { data: null };

  const totals = mvTotals ?? fallbackTotals ?? null;

  // 3) Per-shot SG (v2)
  const { data: shots, error: shotsErr } = await supabase
    .from("v_shots_sg_v2")
    .select(
      [
        "id",
        "hole",
        "start_lie",
        "end_lie",
        "start_lie_cat",
        "end_lie_cat",
        "start_lie_txt",
        "end_lie_txt",
        "d_start",
        "d_end",
        "phase",
        "exp_before",
        "exp_after",
        "sg_shot",
        "penalty",
        "holed",
      ].join(",")
    )
    .eq("round_id", roundId)
    .order("hole", { ascending: true });

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Round Summary</h1>
        {/* Optional: refresh MV after you edit shots */}
        <form action={refreshRoundTotalsAction.bind(null, roundId)}>
          <button
            type="submit"
            className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Refresh SG
          </button>
        </form>
      </div>

      {/* Top tiles */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Tile label="OTT" value={totals?.sg_ott} />
        <Tile label="APP" value={totals?.sg_app} />
        <Tile label="ARG" value={totals?.sg_arg} />
        <Tile label="PUTT" value={totals?.sg_putt} />
        <Tile label="TOTAL" value={totals?.sg_total} />
      </section>

      {/* Per-shot table */}
      <section>
        <h2 className="text-xl font-medium mb-3">Shots (SG)</h2>
        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <Th>Hole</Th>
                <Th>Phase</Th>
                <Th>Start Lie</Th>
                <Th>End Lie</Th>
                <Th className="text-right">dStart</Th>
                <Th className="text-right">dEnd</Th>
                <Th className="text-right">SG</Th>
                <Th>Penalty</Th>
                <Th>Holed</Th>
              </tr>
            </thead>
            <tbody>
              {(shots ?? []).map((s) => (
                <tr key={s.id} className="border-t">
                  <Td>{s.hole ?? "-"}</Td>
                  <Td>{s.phase}</Td>
                  <Td>{s.start_lie_cat ?? s.start_lie}</Td>
                  <Td>{s.end_lie_cat ?? s.end_lie}</Td>
                  <Td className="text-right">{fmtNum(s.d_start)}</Td>
                  <Td className="text-right">{fmtNum(s.d_end)}</Td>
                  <Td className="text-right font-medium">{fmtNum(s.sg_shot)}</Td>
                  <Td>{s.penalty ? "Y" : ""}</Td>
                  <Td>{s.holed ? "Y" : ""}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Optional debug messages */}
        {(mvErr || shotsErr) && (
          <pre className="mt-3 text-xs text-red-600">
            {mvErr ? `MV error: ${JSON.stringify(mvErr, null, 2)}\n` : ""}
            {shotsErr ? `Shots error: ${JSON.stringify(shotsErr, null, 2)}` : ""}
          </pre>
        )}
      </section>
    </main>
  );
}

// ----- Server Action (Next 13.4+): refresh the MV then re-render -----
async function refreshRoundTotalsAction(roundId: string) {
  "use server";
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  // Optional: you can scope refresh by round in future; for now it refreshes whole MV.
  await supabase.rpc("refresh_mv_round_sg_totals_v2");
  // Nothing else needed; returning from a server action causes a re-render.
}

// ----- UI bits -----
function Tile({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{fmtNum(value)}</div>
    </div>
  );
}
function Th({ children, className = "" }: any) {
  return <th className={`px-3 py-2 text-left font-medium ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: any) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}
function fmtNum(n: any) {
  if (n === null || n === undefined) return "—";
  const num = typeof n === "number" ? n : parseFloat(n);
  if (Number.isNaN(num)) return "—";
  return num.toFixed(2);
}

// app/rounds/[id]/page.tsx
import { createClient } from '@/lib/supabase/server';


export const dynamic = "force-dynamic";

export default async function RoundDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const roundId = params.id;

  const [{ data: round }, { data: holes }, { data: scores }] = await Promise.all([
    supabase
      .from("rounds")
      .select(`
        id, date, status, type, notes,
        players:player_id(full_name),
        teams:team_id(name),
        courses:course_id(name),
        tees:tee_id(name)
      `)
      .eq("id", roundId)
      .single(),
    supabase
      .from("round_holes")
      .select("hole_number, par, yardage, strokes, putts, fir, gir, up_down, sand_save, penalty")
      .eq("round_id", roundId)
      .order("hole_number", { ascending: true }),
    supabase
      .from("scores")
      .select("hole_number, strokes, putts, fir, gir, up_down, sand_save, penalties, sg_ott, sg_app, sg_arg, sg_putt")
      .eq("round_id", roundId)
      .order("hole_number", { ascending: true }),
  ]);

  if (!round) return <div className="text-red-600">Round not found.</div>;

  const holesMap = new Map<number, any>();
  (holes ?? []).forEach((h) => holesMap.set(h.hole_number, h));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          {round.players?.full_name ?? "Player"} — {new Date(round.date).toLocaleDateString()}
        </h1>
        <p className="text-sm text-neutral-600">
          Team: {round.teams?.name ?? "-"} • Course: {round.courses?.name ?? "-"} • Tee: {round.tees?.name ?? "-"}
        </p>
        <p className="text-sm text-neutral-600">
          Status: {round.status} • Type: {round.type}
        </p>
        {round.notes && <p className="mt-2 text-sm">{round.notes}</p>}
      </div>

      <section className="space-y-2">
        <h2 className="font-medium">Per-Hole</h2>
        <div className="rounded-lg border bg-white overflow-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left p-3">Hole</th>
                <th className="text-left p-3">Par</th>
                <th className="text-left p-3">Yards</th>
                <th className="text-left p-3">Strokes</th>
                <th className="text-left p-3">Putts</th>
                <th className="text-left p-3">FIR</th>
                <th className="text-left p-3">GIR</th>
                <th className="text-left p-3">Up&Down</th>
                <th className="text-left p-3">Sand Save</th>
                <th className="text-left p-3">Penalty</th>
                <th className="text-left p-3">SG OTT</th>
                <th className="text-left p-3">SG APP</th>
                <th className="text-left p-3">SG ARG</th>
                <th className="text-left p-3">SG PUTT</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 18 }).map((_, i) => {
                const n = i + 1;
                const h = holesMap.get(n);
                const s = (scores ?? []).find((x) => x.hole_number === n);
                return (
                  <tr key={n} className="border-t">
                    <td className="p-3">{n}</td>
                    <td className="p-3">{h?.par ?? "-"}</td>
                    <td className="p-3">{h?.yardage ?? "-"}</td>
                    <td className="p-3">{h?.strokes ?? s?.strokes ?? "-"}</td>
                    <td className="p-3">{h?.putts ?? s?.putts ?? "-"}</td>
                    <td className="p-3">{(h?.fir ?? s?.fir) ? "✓" : ""}</td>
                    <td className="p-3">{(h?.gir ?? s?.gir) ? "✓" : ""}</td>
                    <td className="p-3">{(h?.up_down ?? s?.up_down) ? "✓" : ""}</td>
                    <td className="p-3">{(h?.sand_save ?? s?.sand_save) ? "✓" : ""}</td>
                    <td className="p-3">{(h?.penalty ?? (s?.penalties ? s.penalties > 0 : false)) ? "•" : ""}</td>
                    <td className="p-3">{s?.sg_ott ?? "-"}</td>
                    <td className="p-3">{s?.sg_app ?? "-"}</td>
                    <td className="p-3">{s?.sg_arg ?? "-"}</td>
                    <td className="p-3">{s?.sg_putt ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
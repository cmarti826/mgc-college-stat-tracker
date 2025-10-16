// app/rounds/[id]/shots/page.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ShotEditor from "@/app/rounds/_components/ShotEditor";

type HeaderInfo = {
  player_name: string;
  course_name: string;
  tee_name: string;
  round_date: string;
};

// DB row shape (subset)
type ShotRowDB = {
  id: string;
  round_id: string;
  hole_number: number;
  shot_number: number;
  club: string | null;
  start_lie: "TEE" | "FAIRWAY" | "ROUGH" | "SAND" | "RECOVERY" | "GREEN" | null;
  end_lie: "TEE" | "FAIRWAY" | "ROUGH" | "SAND" | "RECOVERY" | "GREEN" | null;
  start_dist_yards: number | null;
  start_dist_feet: number | null;
  end_dist_yards: number | null;
  end_dist_feet: number | null;
  start_x: number | null;
  start_y: number | null;
  end_x: number | null;
  end_y: number | null;
  putt: boolean | null;
  penalty_strokes: number | null;
};

// UI Lie that ShotEditor expects (TitleCase)
type LieUI = "Tee" | "Fairway" | "Rough" | "Sand" | "Recovery" | "Green";

// What ShotEditor expects for each row (it needs `lie` and `result_lie`)
type ShotRowUI = {
  hole_number: number;
  shot_order: number;
  club?: string | null;

  lie: LieUI;
  result_lie: LieUI;

  // keep explicit start_/end_ too (your editor likely reads these)
  start_lie: LieUI;
  end_lie: LieUI;

  start_dist_yards?: number | null;
  start_dist_feet?: number | null;
  end_dist_yards?: number | null;
  end_dist_feet?: number | null;

  start_x?: number | null;
  start_y?: number | null;
  end_x?: number | null;
  end_y?: number | null;

  putt?: boolean | null;
  penalty_strokes?: number | null;
};

function enumToTitle(l: ShotRowDB["start_lie"]): LieUI {
  switch (l) {
    case "TEE": return "Tee";
    case "FAIRWAY": return "Fairway";
    case "ROUGH": return "Rough";
    case "SAND": return "Sand";
    case "RECOVERY": return "Recovery";
    case "GREEN": return "Green";
    default: return "Fairway";
  }
}

export default async function ShotsPage({ params }: { params: { id: string } }) {
  const roundId = params.id;
  const supabase = createClient();

  // Load round
  const { data: round, error: roundErr } = await supabase
    .from("rounds")
    .select("id, player_id, course_id, tee_id, date")
    .eq("id", roundId)
    .maybeSingle();

  if (roundErr) throw new Error(`Failed to load round: ${roundErr.message}`);
  if (!round) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-xl font-semibold">Round not found</h1>
        <Link href="/rounds" className="text-blue-600 underline">Back to rounds</Link>
      </div>
    );
  }

  // Header info
  const [{ data: player }, { data: course }, { data: tee }] = await Promise.all([
    supabase.from("players").select("full_name").eq("id", round.player_id).maybeSingle(),
    supabase.from("courses").select("name").eq("id", round.course_id).maybeSingle(),
    supabase.from("tees").select("name").eq("id", round.tee_id).maybeSingle(),
  ]);

  const header: HeaderInfo = {
    player_name: player?.full_name ?? "Player",
    course_name: course?.name ?? "Course",
    tee_name: tee?.name ?? "Tee",
    round_date: (round.date as string) ?? "",
  };

  // Shots
  const { data: shots, error: shotsErr } = await supabase
    .from("shots")
    .select(`
      id, round_id, hole_number, shot_number,
      club,
      start_lie, end_lie,
      start_dist_yards, start_dist_feet,
      end_dist_yards, end_dist_feet,
      start_x, start_y, end_x, end_y,
      putt, penalty_strokes
    `)
    .eq("round_id", roundId)
    .order("hole_number", { ascending: true })
    .order("shot_number", { ascending: true });

  if (shotsErr) throw new Error(`Failed to load shots: ${shotsErr.message}`);

  const initialShots: ShotRowUI[] = (shots ?? []).map((s: ShotRowDB) => {
    const sl = enumToTitle(s.start_lie);
    const el = enumToTitle(s.end_lie);
    return {
      hole_number: s.hole_number,
      shot_order: s.shot_number,
      club: s.club ?? null,

      // ShotEditor requires these TitleCase fields
      lie: sl,
      result_lie: el,

      // Also pass explicit start_/end_ (TitleCase)
      start_lie: sl,
      end_lie: el,

      start_dist_yards: sl === "Green" ? null : s.start_dist_yards,
      start_dist_feet:  sl === "Green" ? s.start_dist_feet : null,
      end_dist_yards:   el === "Green" ? null : s.end_dist_yards,
      end_dist_feet:    el === "Green" ? s.end_dist_feet : null,

      start_x: s.start_x ?? null,
      start_y: s.start_y ?? null,
      end_x: s.end_x ?? null,
      end_y: s.end_y ?? null,

      putt: s.putt ?? (sl === "Green"),
      penalty_strokes: s.penalty_strokes ?? 0,
    };
  });

  return (
    <div className="mx-auto max-w-[1100px] p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {header.player_name} — {header.course_name} ({header.tee_name})
          </h1>
          <p className="text-gray-600">Date: {header.round_date}</p>
        </div>
        <Link href={`/rounds/${roundId}`} className="rounded border px-4 py-2 hover:shadow">
          Round Summary
        </Link>
      </div>

      <ShotEditor roundId={roundId} header={header} initialShots={initialShots} />
    </div>
  );
}

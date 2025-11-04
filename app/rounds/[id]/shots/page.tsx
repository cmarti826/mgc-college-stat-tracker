// app/rounds/[id]/shots/page.tsx
import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ShotEditor from "@/app/rounds/_components/ShotEditor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type HeaderInfo = {
  player_name: string;
  course_name: string;
  tee_name: string;
  round_date: string;
};

type DBShot = {
  id: string;
  round_id: string;
  hole_number: number | null;
  shot_number: number | null;
  start_lie: "tee" | "fairway" | "rough" | "sand" | "recovery" | "other" | "green" | "penalty" | null;
  end_lie: "fairway" | "rough" | "sand" | "green" | "hole" | "penalty" | "other" | null;
  start_dist_yards: number | null;
  start_dist_feet: number | null;
  end_dist_yards: number | null;
  end_dist_feet: number | null;
  start_x: number | null;
  start_y: number | null;
  end_x: number | null;
  end_y: number | null;
  club: string | null;
  note: string | null;
  putt: boolean | null;
  penalty_strokes: number | null;
};

type LieUI = "Tee" | "Fairway" | "Rough" | "Sand" | "Recovery" | "Green" | "Penalty" | "Other";

const toUI = (lie: DBShot["start_lie"] | DBShot["end_lie"]): LieUI => {
  if (!lie) return "Other";
  const map: Record<string, LieUI> = {
    tee: "Tee",
    fairway: "Fairway",
    rough: "Rough",
    sand: "Sand",
    recovery: "Recovery",
    green: "Green",
    penalty: "Penalty",
    hole: "Other",
    other: "Other",
  };
  return map[lie] ?? "Other";
};

export default async function ShotsPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase();
  const roundId = params.id;

  // 1. Fetch round
  const { data: round, error: roundErr } = await supabase
    .from("scheduled_rounds")
    .select("id, player_id, course_id, tee_set_id, round_date")
    .eq("id", roundId)
    .single();

  if (roundErr || !round) {
    console.error("Round fetch error:", roundErr);
    notFound();
  }

  // 2. Fetch header names
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

  const header: HeaderInfo = {
    player_name: player?.full_name ?? "Unknown Player",
    course_name: course?.name ?? "Unknown Course",
    tee_name: tee?.name ?? "Unknown Tee",
    round_date: round.round_date ? new Date(round.round_date).toLocaleDateString() : "—",
  };

  // 3. Fetch shots
  const { data: shots, error: shotsErr } = await supabase
    .from("shots")
    .select(`
      id,
      hole_number,
      shot_number,
      start_lie,
      end_lie,
      start_dist_yards,
      start_dist_feet,
      end_dist_yards,
      end_dist_feet,
      start_x,
      start_y,
      end_x,
      end_y,
      club,
      note,
      putt,
      penalty_strokes
    `)
    .eq("round_id", roundId)
    .order("hole_number", { ascending: true })
    .order("shot_number", { ascending: true });

  if (shotsErr) {
    console.error("Shots fetch error:", shotsErr);
  }

  // 4. Convert to ShotEditor format
  const initialShots = (shots ?? [])
    .filter((s): s is Required<Pick<DBShot, "hole_number" | "shot_number">> & DBShot =>
      s.hole_number !== null && s.shot_number !== null
    )
    .map((s) => ({
      id: s.id,
      hole_number: s.hole_number!,
      shot_order: s.shot_number!,
      club: s.club ?? undefined,
      note: s.note ?? undefined,
      lie: toUI(s.start_lie),
      result_lie: toUI(s.end_lie),
      distance_to_hole_m: null,
      result_distance_to_hole_m: null,
      putt: s.putt,
      penalty_strokes: s.penalty_strokes,
    }));

  return (
    <div className="mx-auto max-w-[1100px] p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {header.player_name} — {header.course_name} ({header.tee_name})
          </h1>
          <p className="text-sm text-gray-600 mt-1">Date: {header.round_date}</p>
        </div>
        <Link
          href={`/rounds/${roundId}`}
          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:shadow transition"
        >
          Round Summary
        </Link>
      </div>

      <ShotEditor
        roundId={roundId}
        header={header}
        initialShots={initialShots}
      />
    </div>
  );
}
// app/rounds/[id]/shots/page.tsx
import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
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
  end_lie: "tee" | "fairway" | "rough" | "sand" | "recovery" | "other" | "green" | "penalty" | null;
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
type UISHot = {
  id?: string;
  hole_number: number;
  shot_order: number; // UI name -> DB shot_number
  club?: string | null;
  note?: string | null;
  lie: LieUI;
  result_lie: LieUI;
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

const toUI = (lie: DBShot["start_lie"]): LieUI =>
  lie === "tee" ? "Tee"
  : lie === "fairway" ? "Fairway"
  : lie === "rough" ? "Rough"
  : lie === "sand" ? "Sand"
  : lie === "recovery" ? "Recovery"
  : lie === "green" ? "Green"
  : lie === "penalty" ? "Penalty"
  : "Other";

export default async function ShotsPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase();
  const roundId = params.id;

  // Round (canonical cols only)
  const { data: round } = await supabase
    .from("mgc.scheduled_rounds")
    .select("id, player_id, course_id, tee_set_id, date")
    .eq("id", roundId)
    .maybeSingle();

  if (!round) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-xl font-semibold">Round not found</h1>
        <Link href="/rounds" className="text-blue-600 underline">Back to rounds</Link>
      </div>
    );
  }

  // Header names (by ID)
  const [{ data: player }, { data: course }, { data: tee }] = await Promise.all([
    round.player_id
      ? supabase.from("mgc.players").select("full_name").eq("id", round.player_id).maybeSingle()
      : Promise.resolve({ data: null } as any),
    round.course_id
      ? supabase.from("mgc.courses").select("name").eq("id", round.course_id).maybeSingle()
      : Promise.resolve({ data: null } as any),
    round.tee_set_id
      ? supabase.from("mgc.tee_sets").select("name").eq("id", round.tee_set_id).maybeSingle()
      : Promise.resolve({ data: null } as any),
  ]);

  const header: HeaderInfo = {
    player_name: player?.full_name ?? "Player",
    course_name: course?.name ?? "Course",
    tee_name: tee?.name ?? "Tee",
    round_date: (round.date as string) ?? "",
  };

  // Shots
  const { data: shots } = await supabase
    .from("mgc.shots")
    .select(`
      id, round_id, hole_number, shot_number,
      start_lie, end_lie,
      start_dist_yards, start_dist_feet,
      end_dist_yards, end_dist_feet,
      start_x, start_y, end_x, end_y,
      club, note, putt, penalty_strokes
    `)
    .eq("round_id", roundId)
    .order("hole_number", { ascending: true })
    .order("shot_number", { ascending: true });

  const initialShots: UISHot[] = (shots ?? [])
    .filter((s): s is DBShot => !!s.hole_number && !!s.shot_number)
    .map((s) => {
      const start = toUI(s.start_lie);
      const end = toUI(s.end_lie);
      return {
        id: s.id,
        hole_number: s.hole_number!,
        shot_order: s.shot_number!,
        club: s.club ?? undefined,
        note: s.note ?? undefined,
        lie: start,
        result_lie: end,
        start_lie: start,
        end_lie: end,
        start_dist_yards: s.start_dist_yards,
        start_dist_feet: s.start_dist_feet,
        end_dist_yards: s.end_dist_yards,
        end_dist_feet: s.end_dist_feet,
        start_x: s.start_x,
        start_y: s.start_y,
        end_x: s.end_x,
        end_y: s.end_y,
        putt: s.putt,
        penalty_strokes: s.penalty_strokes,
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

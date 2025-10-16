// app/rounds/[id]/shots/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ShotEditor from "@/app/rounds/_components/ShotEditor";

// HeaderInfo expected by ShotEditor
export type HeaderInfo = {
  player_name: string;
  course_name: string;
  tee_name: string;
  round_date: string;
};

type PageProps = {
  params: { id: string };
};

export default async function ShotsPage({ params }: PageProps) {
  const supabase = createClient();
  const roundId = params.id;

  // 1) Fetch round header info (player/course/tee names + date)
  const { data: round, error: roundErr } = await supabase
    .from("rounds")
    .select(
      `
        id,
        date,
        player:players(full_name),
        course:courses(name),
        tee:tees(name)
      `
    )
    .eq("id", roundId)
    .maybeSingle();

  if (roundErr) throw roundErr;
  if (!round) return notFound();

  const playerName =
    (round as any).player?.full_name ?? "Player";
  const courseName =
    (round as any).course?.name ?? "Course";
  const teeName =
    (round as any).tee?.name ?? "Tee";
  const dateStr = round.date
    ? new Date(round.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const header: HeaderInfo = {
    player_name: playerName,
    course_name: courseName,
    tee_name: teeName,
    round_date: dateStr,
  };

  // 2) Fetch existing shots for this round
  //    (ShotEditor accepts this array; keep fields aligned with your Shot type)
// app/rounds/[id]/shots/page.tsx  (only the shots query + mapping shown)
const { data: shots, error: shotsErr } = await supabase
  .from("shots")
  .select(`
    id, round_id, hole_number, shot_number,
    club, start_lie, end_lie, lie, result_lie,
    start_dist_yards, end_dist_yards,
    start_dist_feet,  end_dist_feet,
    start_x, start_y, end_x, end_y,
    putt, penalty_strokes
  `)
  .eq("round_id", roundId)
  .order("hole_number", { ascending: true })
  .order("shot_number", { ascending: true });

if (shotsErr) throw shotsErr;

<ShotEditor
  roundId={roundId}
  header={header}
  initialShots={(shots ?? []).map((s: any) => ({
    ...s,
    shot_order: s.shot_number, // UI sequence
    // For convenience, expose a single distance field the editor can bind:
    start_distance_ui:
      s.start_lie === "Green" ? s.start_dist_feet : s.start_dist_yards,
    end_distance_ui:
      s.end_lie === "Green" ? s.end_dist_feet : s.end_dist_yards,
  }))}
/>

    </div>
  );
}

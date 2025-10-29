// ==========================
// File: app/rounds/[id]/edit/page.tsx
// ==========================
import { createServerSupabase } from "@/lib/supabase/server";
import RoundEntry from "../../_components/RoundEntry";

interface Props { params: { id: string } }

export default async function EditRoundPage({ params }: Props) {
  const supabase = createServerSupabase();
  const roundId = params.id;

  const [{ data: players }, { data: courses }, { data: teeSets }, { data: round }, { data: holes }] = await Promise.all([
    supabase.from("mgc.players").select("id, first_name, last_name, grad_year").order("last_name"),
    supabase.from("mgc.courses").select("id, name").order("name"),
    supabase.from("mgc.tee_sets").select("id, course_id, name, rating, slope, par").order("name"),
    supabase.from("mgc.scheduled_rounds").select("id, player_id, course_id, tee_set_id, event_id, played_on, notes").eq("id", roundId).single(),
    supabase.from("round_holes").select("hole_number, par, yards, strokes, putts, fir, gir, up_down, sand_save, penalty").eq("round_id", roundId).order("hole_number"),
  ]);

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <RoundEntry
        mode="edit"
        initialRound={{ round: round ?? null, holes: holes ?? [] }}
        players={players ?? []}
        courses={courses ?? []}
        teeSets={teeSets ?? []}
      />
    </div>
  );
}
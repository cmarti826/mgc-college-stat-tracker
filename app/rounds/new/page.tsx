// ==========================
// File: app/rounds/new/page.tsx
// ==========================
import { createClient } from "@/lib/supabase/server";
import RoundEntry from "../_components/RoundEntry";

export default async function NewRoundPage() {
  const supabase = createClient();

  // Fetch minimal data needed to render selectors
  const [{ data: players }, { data: courses }, { data: teeSets }] = await Promise.all([
    supabase.from("players").select("id, first_name, last_name, grad_year").order("last_name"),
    supabase.from("courses").select("id, name").order("name"),
    supabase.from("tee_sets").select("id, course_id, name, rating, slope, par").order("name"),
  ]);

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <RoundEntry
        mode="create"
        initialRound={null}
        players={players ?? []}
        courses={courses ?? []}
        teeSets={teeSets ?? []}
      />
    </div>
  );
}
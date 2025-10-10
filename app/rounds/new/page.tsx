// app/rounds/new/page.tsx
import { createClient } from "@/lib/supabase/server";
import RoundEntry from "../_components/RoundEntry";

export const dynamic = "force-dynamic"; // avoid caching while building

export default async function NewRoundPage() {
  const supabase = createClient();

  // Fetch minimal data needed to render selectors (players: select("*") so missing columns don't break)
  const [playersRes, coursesRes, teeSetsRes] = await Promise.all([
    supabase.from("players").select("*").order("id"),
    supabase.from("courses").select("id, name").order("name"),
    supabase.from("tee_sets").select("id, course_id, name, rating, slope, par").order("name"),
  ]);

  const players = playersRes.data ?? [];
  const courses = coursesRes.data ?? [];
  const teeSets = teeSetsRes.data ?? [];

  const anyError = playersRes.error || coursesRes.error || teeSetsRes.error;

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8 space-y-4">
      <h1 className="text-2xl font-semibold">New Round</h1>

      {anyError ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">
          <div className="font-medium">Couldn’t load setup data.</div>
          <ul className="text-sm mt-2 list-disc pl-5 space-y-1">
            {playersRes.error && <li>Players: {playersRes.error.message}</li>}
            {coursesRes.error && <li>Courses: {coursesRes.error.message}</li>}
            {teeSetsRes.error && <li>Tee Sets: {teeSetsRes.error.message}</li>}
          </ul>
        </div>
      ) : null}

      <RoundEntry
        mode="create"
        initialRound={null}
        players={players}
        courses={courses}
        teeSets={teeSets}
      />
    </div>
  );
}

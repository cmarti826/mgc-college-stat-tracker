// app/rounds/new/page.tsx
import { createServerSupabase } from "@/lib/supabase/server";
import RoundEntry from "../_components/RoundEntry";

export const dynamic = "force-dynamic"; // avoid caching while building

export default async function NewRoundPage() {
  const supabase = createServerSupabase();

  // Fetch minimal data needed to render selectors
  const [playersRes, coursesRes, teeSetsRes] = await Promise.all([
    supabase.from("mgc.players").select("id, first_name, last_name, grad_year").order("last_name"),
    supabase.from("mgc.courses").select("id, name").order("name"),
    supabase.from("mgc.tee_sets").select("id, course_id, name, rating, slope, par").order("name"),
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
          <div className="text-sm mt-3 text-red-900/80">
            If you’re using Supabase RLS, make sure `select` is allowed for anonymous or the
            logged-in user on <code>players</code>, <code>courses</code>, and <code>tee_sets</code>.
          </div>
        </div>
      ) : null}

      {!anyError && players.length === 0 && courses.length === 0 && teeSets.length === 0 ? (
        <div className="rounded-xl border p-4 bg-yellow-50 border-yellow-300 text-yellow-900">
          No seed data found yet. Add at least one player, course, and tee set.
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

// app/rounds/new/page.tsx
import { createClient } from "@/lib/supabase/server";
import RoundEntry from "../_components/RoundEntry";

export const dynamic = "force-dynamic";

type TeeUi = {
  id: string;
  course_id: string;
  name: string;
  rating: number | null;
  slope: number | null;
  par: number | null;
};

async function loadTees(supabase: ReturnType<typeof createClient>): Promise<{
  tees: TeeUi[];
  errorMsg?: string;
}> {
  // Try "tees" first
  const t1 = await supabase
    .from("tees")
    .select("id, course_id, name, rating, slope, par")
    .order("name");

  if (!t1.error) {
    return { tees: (t1.data ?? []) as TeeUi[] };
  }

  // If "tees" doesn't exist, try "tee_sets"
  const t2 = await supabase
    .from("tee_sets")
    .select("id, course_id, name, rating, slope, par")
    .order("name");

  if (!t2.error) {
    return { tees: (t2.data ?? []) as TeeUi[] };
  }

  // If both fail, return the first error (usually "table not found")
  return { tees: [], errorMsg: t1.error?.message || t2.error?.message || "Unknown error loading tees" };
}

export default async function NewRoundPage() {
  const supabase = createClient();

  const [playersRes, coursesRes] = await Promise.all([
    // Use * so we work with full_name or any other fields
    supabase.from("players").select("*").order("id"),
    supabase.from("courses").select("id, name").order("name"),
  ]);

  const { tees, errorMsg: teesErr } = await loadTees(supabase);

  const players = playersRes.data ?? [];
  const courses = coursesRes.data ?? [];
  const teeSets = tees; // prop name can stay teeSets

  const anyError = playersRes.error || coursesRes.error || teesErr;

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8 space-y-4">
      <h1 className="text-2xl font-semibold">New Round</h1>

      {anyError ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">
          <div className="font-medium">Couldn’t load setup data.</div>
          <ul className="text-sm mt-2 list-disc pl-5 space-y-1">
            {playersRes.error && <li>Players: {playersRes.error.message}</li>}
            {coursesRes.error && <li>Courses: {coursesRes.error.message}</li>}
            {teesErr && <li>Tees: {teesErr}</li>}
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

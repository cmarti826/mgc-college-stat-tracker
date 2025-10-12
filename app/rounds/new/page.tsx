// app/rounds/new/page.tsx
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import RoundEntry from "../_components/RoundEntry";

type Player = { id: string; full_name: string | null };
type Course = { id: string; name: string };
type Tee = {
  id: string;
  name: string;
  course_id: string | null;
  rating: number | null;
  slope: number | null;
  par: number | null;
};

export default async function NewRoundPage() {
  const supabase = createClient();

  const [
    { data: players, error: pErr },
    { data: courses, error: cErr },
    { data: tees, error: tErr },
  ] = await Promise.all([
    supabase.from("players").select("id, full_name").order("full_name", { ascending: true }),
    supabase.from("courses").select("id, name").order("name", { ascending: true }),
    supabase.from("tees").select("id, name, course_id, rating, slope, par").order("name", { ascending: true }),
  ]);

  const loadError = pErr?.message || cErr?.message || tErr?.message;

  const hasPlayers = (players?.length ?? 0) > 0;
  const hasCourses = (courses?.length ?? 0) > 0;
  const hasTees = (tees?.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-[1100px] p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New Round</h1>
        <Link href="/rounds" className="rounded-xl border px-4 py-2 hover:shadow">
          All Rounds
        </Link>
      </div>

      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          Couldn’t load dropdown data: {loadError}
        </div>
      )}

      {!hasPlayers || !hasCourses || !hasTees ? (
        <div className="rounded-xl border p-5 bg-white">
          <p className="text-gray-800 mb-3">
            You need a player, a course, and a tee before entering a round.
          </p>
          <ul className="list-disc pl-5 text-gray-700 space-y-1">
            {!hasPlayers && <li>Add at least one player (table: <code>players</code>).</li>}
            {!hasCourses && <li>Add at least one course (table: <code>courses</code>).</li>}
            {!hasTees && <li>Add at least one tee (table: <code>tees</code>, linked to a course).</li>}
          </ul>
          <p className="text-gray-600 mt-3">
            Add rows in the Supabase table editor (or run the seed), then refresh.
          </p>
        </div>
      ) : (
        <RoundEntry
          mode="create"
          initialRound={null}
          players={(players as Player[]).map((p) => ({
            id: p.id,
            full_name: p.full_name ?? "Unnamed Player",
          }))}
          courses={(courses as Course[])}
          teeSets={(tees as Tee[])}   {/* <- correct prop name */}
        />
      )}
    </div>
  );
}

// app/rounds/new/loading.tsx

import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RoundEntry from "../_components/RoundEntry";

export const dynamic = "force-dynamic";

type Player = {
  id: string;
  first_name: string;
  last_name: string;
  grad_year?: number | null;
};

type Course = {
  id: string;
  name: string;
};

type TeeSet = {
  id: string;
  course_id: string;
  name: string;
  rating?: number | null;
  slope?: number | null;
  par?: number | null;
};

export default async function NewRoundPage() {
  const supabase = createServerSupabase();

  // 1. Auth check
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    redirect("/(auth)/login?redirectTo=/rounds/new");
  }

  // 2. Fetch player link
  const { data: userPlayer, error: linkErr } = await supabase
    .from("user_players")
    .select("player_id")
    .eq("user_id", user.id)
    .single();

  if (linkErr || !userPlayer) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-800">
          <p className="font-medium">Player Not Linked</p>
          <p className="mt-1">
            Your account isn't linked to a player. Ask an admin to link you in{" "}
            <code className="bg-amber-100 px-1 rounded font-mono">mgc.user_players</code>.
          </p>
        </div>
      </div>
    );
  }

  // 3. Fetch form data
  const [
    { data: players, error: pErr },
    { data: courses, error: cErr },
    { data: teeSets, error: tErr },
  ] = await Promise.all([
    supabase
      .from("players")
      .select("id, first_name, last_name, grad_year")
      .order("last_name", { ascending: true }),
    supabase
      .from("courses")
      .select("id, name")
      .order("name", { ascending: true }),
    supabase
      .from("tee_sets")
      .select("id, course_id, name, rating, slope, par")
      .order("name", { ascending: true }),
  ]);

  const anyError = pErr || cErr || tErr;

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Round</h1>
        <p className="text-sm text-gray-600 mt-1">
          Enter round details and hole-by-hole scores.
        </p>
      </div>

      {/* Error Alert */}
      {anyError && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-5 text-sm text-red-800">
          <p className="font-medium">Couldn’t load setup data</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            {pErr && <li>Players: {pErr.message}</li>}
            {cErr && <li>Courses: {cErr.message}</li>}
            {tErr && <li>Tee Sets: {tErr.message}</li>}
          </ul>
          <p className="mt-3 text-xs text-red-700">
            Check RLS policies on <code className="bg-red-100 px-1 rounded">mgc.players</code>,{" "}
            <code className="bg-red-100 px-1 rounded">mgc.courses</code>, and{" "}
            <code className="bg-red-100 px-1 rounded">mgc.tee_sets</code>.
          </p>
        </div>
      )}

      {/* Empty Data */}
      {players?.length === 0 && courses?.length === 0 && teeSets?.length === 0 && (
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-5 text-sm text-yellow-900">
          <p className="font-medium">No Data Found</p>
          <p className="mt-1">
            Add at least one player, course, and tee set to create a round.
          </p>
        </div>
      )}

      {/* Round Entry Form */}
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
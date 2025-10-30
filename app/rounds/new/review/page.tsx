// app/rounds/new/review/page.tsx

import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

type Round = {
  id: string;
  player_id: string;
  course_id: string;
  tee_set_id: string;
  round_date: string;
  name: string | null;
  notes: string | null;
  status: string;
  type: string;
  created_at: string;
};

type Player = { id: string; full_name: string };
type Course = { id: string; name: string };
type TeeSet = { id: string; name: string };

export default async function ReviewRound() {
  const supabase = createServerSupabase();

  // 1. Auth check
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    redirect("/(auth)/login?redirectTo=/rounds/new/review");
  }

  // 2. Get latest round for this user
  const { data: userPlayer, error: linkErr } = await supabase
    .from("mgc.user_players")
    .select("player_id")
    .eq("user_id", user.id)
    .single();

  if (linkErr || !userPlayer) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">No Player Linked</p>
          <p className="mt-1">
            Your account isn't linked to a player. Ask an admin to link you in{" "}
            <code className="bg-amber-100 px-1 rounded font-mono">user_players</code>.
          </p>
        </div>
      </div>
    );
  }

  const { data: round, error: roundErr } = await supabase
    .from("mgc.scheduled_rounds")
    .select(
      "id, player_id, course_id, tee_set_id, round_date, name, notes, status, type, created_at"
    )
    .eq("player_id", userPlayer.player_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (roundErr || !round) {
    console.error("Round fetch error:", roundErr);
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-xl border border-gray-300 bg-gray-50 p-8 text-center text-gray-600">
          <p className="text-lg font-medium">No recent round found.</p>
          <p className="mt-2">
            <a href="/rounds/new" className="text-blue-600 hover:underline">
              Create a new round
            </a>
          </p>
        </div>
      </div>
    );
  }

  // 3. Fetch related names
  const [
    { data: player },
    { data: course },
    { data: tee },
  ] = await Promise.all([
    supabase
      .from("mgc.players")
      .select("full_name")
      .eq("id", round.player_id)
      .single(),
    supabase
      .from("mgc.courses")
      .select("name")
      .eq("id", round.course_id)
      .single(),
    supabase
      .from("mgc.tee_sets")
      .select("name")
      .eq("id", round.tee_set_id)
      .single(),
  ]);

  const playerName = player?.full_name ?? "Unknown Player";
  const courseName = course?.name ?? "Unknown Course";
  const teeName = tee?.name ?? "Unknown Tee";

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Review Latest Round</h1>
        <a
          href={`/rounds/${round.id}/shots`}
          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:shadow transition"
        >
          Enter Shots
        </a>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <p className="text-sm font-medium text-gray-600">Player</p>
            <p className="text-lg font-semibold text-gray-900">{playerName}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Date</p>
            <p className="text-lg font-semibold text-gray-900">
              {format(new Date(round.round_date), "MMMM d, yyyy")}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Course</p>
            <p className="text-lg font-semibold text-gray-900">{courseName}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Tee</p>
            <p className="text-lg font-semibold text-gray-900">{teeName}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Type</p>
            <p className="text-lg font-semibold text-gray-900">{round.type}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Status</p>
            <p className="text-lg font-semibold text-gray-900">{round.status}</p>
          </div>
        </div>

        {round.name && (
          <div>
            <p className="text-sm font-medium text-gray-600">Round Name</p>
            <p className="text-base text-gray-800">{round.name}</p>
          </div>
        )}

        {round.notes && (
          <div>
            <p className="text-sm font-medium text-gray-600">Notes</p>
            <p className="text-base text-gray-800 italic">{round.notes}</p>
          </div>
        )}

        <div className="pt-4 border-t flex justify-end gap-3">
          <a
            href="/rounds/new"
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:shadow transition"
          >
            Create Another
          </a>
          <a
            href={`/rounds/${round.id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition"
          >
            View Summary
          </a>
        </div>
      </div>
    </div>
  );
}
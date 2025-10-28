"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function saveRoundWithHoles(formData: FormData) {
  const supabase = await createBrowserSupabase();

  const playerKey = String(formData.get("playerKey") ?? "");
  const courseKey = String(formData.get("courseKey") ?? "");
  const teeSetId  = String(formData.get("teeSetId") ?? "");
  const playedAt  = String(formData.get("playedAt") ?? ""); // YYYY-MM-DD
  const holesJson = String(formData.get("holesJson") ?? "[]");

  let holes: any[] = [];
  try {
    holes = JSON.parse(holesJson);
  } catch {
    throw new Error("Invalid holes payload");
  }

  const { data, error } = await supabase.rpc("create_round_with_holes", {
    p_player_key: playerKey,
    p_course_key: courseKey,
    p_tee_id: teeSetId,
    p_date: playedAt,
    p_holes: holes,
  });

  if (error) {
    throw new Error(error.message);
  }

  const roundId = data as string;
  revalidatePath(`/rounds/${roundId}`);
  redirect(`/rounds/${roundId}`); // or `/rounds/${roundId}/edit`
}

// app/rounds/new/actions.ts

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { z } from "zod";

// Zod schema for hole input (from client)
const HoleInput = z.object({
  hole_number: z.number().int().min(1).max(18),
  par: z.number().int().min(3).max(6),
  yards: z.number().int().positive().nullable().optional(),
  strokes: z.number().int().min(0).nullable().optional(),
  putts: z.number().int().min(0).nullable().optional(),
  fir: z.boolean().nullable().optional(),
  gir: z.boolean().nullable().optional(),
  up_down: z.boolean().nullable().optional(),
  sand_save: z.boolean().nullable().optional(),
  penalty: z.boolean().nullable().optional(),
});

const SaveRoundPayload = z.object({
  playerKey: z.string().min(1, "Player is required"),
  courseKey: z.string().min(1, "Course is required"),
  teeSetId: z.string().uuid("Invalid tee set ID"),
  playedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  holesJson: z.string(),
});

export async function saveRoundWithHoles(formData: FormData) {
  const supabase = createServerSupabase();

  // 1. Extract and validate
  const raw = {
    playerKey: String(formData.get("playerKey") ?? "").trim(),
    courseKey: String(formData.get("courseKey") ?? "").trim(),
    teeSetId: String(formData.get("teeSetId") ?? "").trim(),
    playedAt: String(formData.get("playedAt") ?? "").trim(),
    holesJson: String(formData.get("holesJson") ?? "[]"),
  };

  const parsed = SaveRoundPayload.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid form data";
    return { error: msg };
  }

  const { playerKey, courseKey, teeSetId, playedAt, holesJson } = parsed.data;

  // 2. Parse and validate holes
  let holes: any[] = [];
  try {
    const parsedHoles = JSON.parse(holesJson);
    if (!Array.isArray(parsedHoles)) throw new Error("holesJson must be an array");

    const validated = z.array(HoleInput).safeParse(parsedHoles);
    if (!validated.success) {
      const msg = validated.error.issues[0]?.message ?? "Invalid hole data";
      return { error: msg };
    }

    holes = validated.data.map((h) => ({
      hole_number: h.hole_number,
      par: h.par,
      yards: h.yards ?? null,
      strokes: h.strokes ?? null,
      putts: h.putts ?? null,
      fir: h.fir ?? null,
      gir: h.gir ?? null,
      up_down: h.up_down ?? null,
      sand_save: h.sand_save ?? null,
      penalty: h.penalty ?? null,
    }));
  } catch (err: any) {
    return { error: err.message || "Failed to parse holes" };
  }

  // 3. Call RPC
  const { data, error } = await supabase.rpc("mgc.create_round_with_holes", {
    p_player_key: playerKey,
    p_course_key: courseKey,
    p_tee_id: teeSetId,
    p_date: playedAt,
    p_holes: holes,
  });

  if (error) {
    console.error("create_round_with_holes error:", error);
    return { error: error.message };
  }

  const roundId = data as string;

  // 4. Revalidate & redirect
  revalidatePath("/rounds");
  revalidatePath(`/rounds/${roundId}`);
  redirect(`/rounds/${roundId}/shots`);
}
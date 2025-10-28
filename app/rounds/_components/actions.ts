"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { z } from "zod";

const HoleSchema = z.object({
  hole_number: z.number(),
  par: z.number().min(3).max(6),
  yards: z.number().nullable().optional(),
  strokes: z.number().nullable().optional(),
  putts: z.number().nullable().optional(),
  fir: z.boolean().nullable().optional(),
  gir: z.boolean().nullable().optional(),
  up_down: z.boolean().nullable().optional(),
  sand_save: z.boolean().nullable().optional(),
  penalty: z.boolean().nullable().optional(),
});

const RoundSchema = z.object({
  id: z.string().uuid().optional(),
  player_id: z.string(), // uuid OR name (RPC will resolve/create)
  course_id: z.string(), // uuid OR name (RPC will resolve or error)
  tee_id: z.string().uuid(), // must exist
  date: z.string(), // yyyy-mm-dd
  holes: z.array(HoleSchema).length(18),
});

export type RoundPayload = z.infer<typeof RoundSchema>;

export async function createRoundAction(payload: RoundPayload) {
  const supabase = createServerSupabase();

  const parsed = RoundSchema.safeParse(payload);
  if (!parsed.success) return { error: "Please complete player, course, tee, date and 18 holes." };

  const holes = payload.holes.map((h) => ({
    hole_number: h.hole_number,
    par: h.par,
    yards: h.yards ?? null,
    strokes: h.strokes ?? null,
    putts: h.putts ?? null,
    fir: h.par === 4 || h.par === 5 ? h.fir ?? null : null,
    gir: h.gir ?? null,
    up_down: h.up_down ?? null,
    sand_save: h.sand_save ?? null,
    penalty: h.penalty ?? null,
  }));

  const { data, error } = await supabase.rpc("create_round_with_holes", {
    p_player_key: payload.player_id,   // id OR name
    p_course_key: payload.course_id,   // id OR name
    p_tee_id: payload.tee_id,
    p_date: payload.date,
    p_holes: holes,
  });

  if (error) return { error: error.message };
  return { id: data as string };
}

export async function updateRoundAction(payload: RoundPayload) {
  const supabase = createServerSupabase();
  if (!payload.id) return { error: "Missing round id" };

  const holes = payload.holes.map((h) => ({
    hole_number: h.hole_number,
    par: h.par,
    yards: h.yards ?? null,
    strokes: h.strokes ?? null,
    putts: h.putts ?? null,
    fir: h.par === 4 || h.par === 5 ? h.fir ?? null : null,
    gir: h.gir ?? null,
    up_down: h.up_down ?? null,
    sand_save: h.sand_save ?? null,
    penalty: h.penalty ?? null,
  }));

  const { data, error } = await supabase.rpc("update_round_with_holes", {
    p_round_id: payload.id,
    p_player_key: payload.player_id,   // id OR name
    p_course_key: payload.course_id,   // id OR name
    p_tee_id: payload.tee_id,
    p_date: payload.date,
    p_holes: holes,
  });

  if (error) return { error: error.message };
  return { id: data as string };
}

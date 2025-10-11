"use server";

import { createClient } from "@/lib/supabase/server";
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
  player_id: z.string().uuid(),
  course_id: z.string().uuid(),
  tee_id: z.string().uuid(),
  date: z.string(), // yyyy-mm-dd
  notes: z.string().nullable().optional(),
  event_id: z.string().uuid().nullable().optional(),
  holes: z.array(HoleSchema).length(18),
});

export type RoundPayload = z.infer<typeof RoundSchema>;

export async function createRoundAction(payload: RoundPayload) {
  const supabase = createClient();
  const parsed = RoundSchema.safeParse(payload);
  if (!parsed.success) return { error: "Invalid round payload" };

  const { data: round, error } = await supabase
    .from("rounds")
    .insert({
      player_id: payload.player_id,
      course_id: payload.course_id,
      tee_id: payload.tee_id,
      date: payload.date,
      notes: payload.notes ?? null,
      event_id: payload.event_id ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const rows = payload.holes.map((h) => ({
    round_id: round!.id,
    hole_number: h.hole_number,
    par: h.par,
    yards: h.yards,
    strokes: h.strokes,
    putts: h.putts,
    fir: h.par === 4 || h.par === 5 ? h.fir : null,
    gir: h.gir,
    up_down: h.up_down,
    sand_save: h.sand_save,
    penalty: h.penalty,
  }));

  const { error: holesErr } = await supabase.from("round_holes").insert(rows);
  if (holesErr) return { error: holesErr.message };

  return { id: round!.id };
}

export async function updateRoundAction(payload: RoundPayload) {
  const supabase = createClient();
  if (!payload.id) return { error: "Missing round id" };

  const { error } = await supabase
    .from("rounds")
    .update({
      player_id: payload.player_id,
      course_id: payload.course_id,
      tee_id: payload.tee_id,
      date: payload.date,
      notes: payload.notes ?? null,
      event_id: payload.event_id ?? null,
    })
    .eq("id", payload.id);

  if (error) return { error: error.message };

  await supabase.from("round_holes").delete().eq("round_id", payload.id);

  const rows = payload.holes.map((h) => ({
    round_id: payload.id,
    hole_number: h.hole_number,
    par: h.par,
    yards: h.yards,
    strokes: h.strokes,
    putts: h.putts,
    fir: h.par === 4 || h.par === 5 ? h.fir : null,
    gir: h.gir,
    up_down: h.up_down,
    sand_save: h.sand_save,
    penalty: h.penalty,
  }));

  const { error: holesErr } = await supabase.from("round_holes").insert(rows);
  if (holesErr) return { error: holesErr.message };

  return { id: payload.id };
}

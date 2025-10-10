"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const HoleSchema = z.object({
  hole_number: z.number(),
  par: z.number().min(3).max(6),
  yards: z.number().optional().nullable(),
  strokes: z.number().optional().nullable(),
  putts: z.number().optional().nullable(),
  fir: z.boolean().optional().nullable(),
  gir: z.boolean().optional().nullable(),
  up_down: z.boolean().optional().nullable(),
  sand_save: z.boolean().optional().nullable(),
  penalty: z.boolean().optional().nullable(),
});

const RoundSchema = z.object({
  id: z.string().uuid().optional(),
  player_id: z.string().uuid(),
  course_id: z.string().uuid(),
  tee_id: z.string().uuid(),            // ← matches your schema
  played_on: z.string(),
  // Optional in payload, but we won't write unless you add columns:
  notes: z.string().optional().nullable(),
  event_id: z.string().uuid().nullable().optional(),
  holes: z.array(HoleSchema).length(18),
});

export type RoundPayload = z.infer<typeof RoundSchema>;

export async function createRoundAction(payload: RoundPayload) {
  const supabase = createClient();

  const parsed = RoundSchema.safeParse(payload);
  if (!parsed.success) return { error: "Invalid round payload" };

  // Only known-safe columns (no notes/event unless you add them)
  const roundRow: Record<string, any> = {
    player_id: payload.player_id,
    course_id: payload.course_id,
    tee_id: payload.tee_id,
    played_on: payload.played_on,
    // notes: payload.notes ?? null,
    // event_id: payload.event_id ?? null,
  };

  const { data: round, error } = await supabase
    .from("rounds")
    .insert(roundRow)
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

  const roundRow: Record<string, any> = {
    player_id: payload.player_id,
    course_id: payload.course_id,
    tee_id: payload.tee_id,
    played_on: payload.played_on,
    // notes: payload.notes ?? null,
    // event_id: payload.event_id ?? null,
  };

  const { error } = await supabase.from("rounds").update(roundRow).eq("id", payload.id);
  if (error) return { error: error.message };

  // Replace holes for this round
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

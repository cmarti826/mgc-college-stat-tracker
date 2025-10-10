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
  tee_id: z.string().uuid(),
  // UI sends a date string; backend maps it to the right column (date OR played_on)
  date: z.string(),
  // Optional in payload; we skip writing unless you add these columns
  notes: z.string().optional().nullable(),
  event_id: z.string().uuid().nullable().optional(),
  holes: z.array(HoleSchema).length(18),
});

export type RoundPayload = z.infer<typeof RoundSchema>;

// Helper: insert round tolerant to column name
async function insertRoundTolerant(
  supabase: ReturnType<typeof createClient>,
  payload: RoundPayload
): Promise<{ id?: string; error?: string }> {
  // First attempt: assume column is `date`
  const baseRow: Record<string, any> = {
    player_id: payload.player_id,
    course_id: payload.course_id,
    tee_id: payload.tee_id,
  };

  // Try writing with `date`
  let { data, error } = await supabase
    .from("rounds")
    .insert({ ...baseRow, date: payload.date })
    .select("id")
    .single();

  if (error && /column .*date.* does not exist|schema cache/i.test(error.message)) {
    // Retry with `played_on`
    const retry = await supabase
      .from("rounds")
      .insert({ ...baseRow, played_on: payload.date })
      .select("id")
      .single();

    if (retry.error) return { error: retry.error.message };
    return { id: retry.data?.id };
  }

  if (error) return { error: error.message };
  return { id: data?.id };
}

// Helper: update round tolerant to column name
async function updateRoundTolerant(
  supabase: ReturnType<typeof createClient>,
  payload: RoundPayload
): Promise<{ error?: string }> {
  const baseRow: Record<string, any> = {
    player_id: payload.player_id,
    course_id: payload.course_id,
    tee_id: payload.tee_id,
  };

  // Try with `date`
  let { error } = await supabase
    .from("rounds")
    .update({ ...baseRow, date: payload.date })
    .eq("id", payload.id as string);

  if (error && /column .*date.* does not exist|schema cache/i.test(error.message)) {
    // Retry with `played_on`
    const retry = await supabase
      .from("rounds")
      .update({ ...baseRow, played_on: payload.date })
      .eq("id", payload.id as string);

    if (retry.error) return { error: retry.error.message };
    return {};
  }

  if (error) return { error: error.message };
  return {};
}

export async function createRoundAction(payload: RoundPayload) {
  const supabase = createClient();

  const parsed = RoundSchema.safeParse(payload);
  if (!parsed.success) return { error: "Invalid round payload" };

  const ins = await insertRoundTolerant(supabase, payload);
  if (ins.error || !ins.id) return { error: ins.error ?? "Failed to create round" };

  // Now insert 18 holes
  const rows = payload.holes.map((h) => ({
    round_id: ins.id!,
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

  return { id: ins.id };
}

export async function updateRoundAction(payload: RoundPayload) {
  const supabase = createClient();
  if (!payload.id) return { error: "Missing round id" };

  const upd = await updateRoundTolerant(supabase, payload);
  if (upd.error) return { error: upd.error };

  // Replace holes
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

// app/rounds/_components/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

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

/**
 * NOTE: we allow ids OR names as strings for player/course/tee.
 * - player_id: uuid OR player's full_name
 * - course_id: must be uuid (we only validate), but if a name is passed we try to resolve by name
 * - tee_id: must be uuid (validate)
 */
const RoundSchema = z.object({
  id: z.string().uuid().optional(),
  player_id: z.string(), // uuid OR full_name
  course_id: z.string(), // prefer uuid; will try name lookup if not uuid
  tee_id: z.string(),    // must resolve to an existing tee id
  date: z.string(),      // yyyy-mm-dd
  holes: z.array(HoleSchema).length(18),
});

export type RoundPayload = z.infer<typeof RoundSchema>;

async function resolvePlayerId(
  supabase: ReturnType<typeof createClient>,
  key: string
): Promise<{ id?: string; error?: string }> {
  if (isUuid(key)) {
    const { data, error } = await supabase.from("players").select("id").eq("id", key).maybeSingle();
    if (error) return { error: `Player: ${error.message}` };
    if (!data) return { error: `Player not found (id ${key})` };
    return { id: data.id };
  }

  // treat as name; try to find
  const { data: found, error: findErr } = await supabase
    .from("players")
    .select("id")
    .ilike("full_name", key)
    .limit(1)
    .maybeSingle();
  if (findErr) return { error: `Player lookup failed: ${findErr.message}` };
  if (found) return { id: found.id };

  // create if missing
  const { data: created, error: insErr } = await supabase
    .from("players")
    .insert({ full_name: key, grad_year: null })
    .select("id")
    .single();
  if (insErr) return { error: `Player create failed: ${insErr.message}` };
  return { id: created!.id };
}

async function resolveCourseId(
  supabase: ReturnType<typeof createClient>,
  key: string
): Promise<{ id?: string; error?: string }> {
  if (isUuid(key)) {
    const { data, error } = await supabase.from("courses").select("id").eq("id", key).maybeSingle();
    if (error) return { error: `Course: ${error.message}` };
    if (!data) return { error: `Course not found (id ${key})` };
    return { id: data.id };
  }
  // fallback: try by name
  const { data, error } = await supabase
    .from("courses")
    .select("id")
    .ilike("name", key)
    .limit(1)
    .maybeSingle();
  if (error) return { error: `Course lookup failed: ${error.message}` };
  if (!data) return { error: `Course not found by name "${key}"` };
  return { id: data.id };
}

async function ensureTeeId(
  supabase: ReturnType<typeof createClient>,
  key: string
): Promise<{ id?: string; error?: string }> {
  if (!isUuid(key)) return { error: `Tee: invalid id (${key})` };
  const { data, error } = await supabase.from("tees").select("id").eq("id", key).maybeSingle();
  if (error) return { error: `Tee: ${error.message}` };
  if (!data) return { error: `Tee not found (id ${key})` };
  return { id: data.id };
}

export async function createRoundAction(payload: RoundPayload) {
  const supabase = createClient();

  const parsed = RoundSchema.safeParse(payload);
  if (!parsed.success) return { error: "Please complete player, course, tee, date and 18 holes." };

  // Resolve/validate keys
  const p = await resolvePlayerId(supabase, payload.player_id);
  if (p.error) return { error: p.error };

  const c = await resolveCourseId(supabase, payload.course_id);
  if (c.error) return { error: c.error };

  const t = await ensureTeeId(supabase, payload.tee_id);
  if (t.error) return { error: t.error };

  // Insert round
  const { data: round, error } = await supabase
    .from("rounds")
    .insert({
      player_id: p.id!,
      course_id: c.id!,
      tee_id: t.id!,
      date: payload.date,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Insert holes
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

  const p = await resolvePlayerId(supabase, payload.player_id);
  if (p.error) return { error: p.error };

  const c = await resolveCourseId(supabase, payload.course_id);
  if (c.error) return { error: c.error };

  const t = await ensureTeeId(supabase, payload.tee_id);
  if (t.error) return { error: t.error };

  const { error } = await supabase
    .from("rounds")
    .update({
      player_id: p.id!,
      course_id: c.id!,
      tee_id: t.id!,
      date: payload.date,
    })
    .eq("id", payload.id);

  if (error) return { error: error.message };

  await supabase.from("round_holes").delete().eq("round_id", payload.id);

  const rows = payload.holes.map((h) => ({
    round_id: payload.id!,
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

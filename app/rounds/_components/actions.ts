// app/rounds/_components/actions.ts (drop-in)
"use server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const Hole = z.object({
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
const Round = z.object({
  id: z.string().uuid().optional(),
  player_id: z.string().uuid(),
  course_id: z.string().uuid(),
  tee_id: z.string().uuid(),
  date: z.string(), // yyyy-mm-dd
  holes: z.array(Hole).length(18),
});
type RoundPayload = z.infer<typeof Round>;

async function mustExist(supabase: any, table: "players"|"courses"|"tees", id: string, label: string) {
  const { data, error } = await supabase.from(table).select("id").eq("id", id).maybeSingle();
  if (error) return `${label}: ${error.message}`;
  if (!data) return `${label} not found (id ${id})`;
  return null;
}

export async function createRoundAction(p: RoundPayload) {
  const supabase = createClient();
  const parsed = Round.safeParse(p);
  if (!parsed.success) return { error: "Please complete player, course, tee, date and 18 holes." };

  for (const [t,id,label] of [["players",p.player_id,"Player"],["courses",p.course_id,"Course"],["tees",p.tee_id,"Tee"]] as const) {
    const err = await mustExist(supabase, t as any, id, label);
    if (err) return { error: err };
  }

  let { data: round, error } = await supabase
    .from("rounds")
    .insert({ player_id: p.player_id, course_id: p.course_id, tee_id: p.tee_id, date: p.date })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const rows = p.holes.map(h => ({
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

export async function updateRoundAction(p: RoundPayload) {
  const supabase = createClient();
  if (!p.id) return { error: "Missing round id" };

  for (const [t,id,label] of [["players",p.player_id,"Player"],["courses",p.course_id,"Course"],["tees",p.tee_id,"Tee"]] as const) {
    const err = await mustExist(supabase, t as any, id, label);
    if (err) return { error: err };
  }

  const { error } = await supabase
    .from("rounds")
    .update({ player_id: p.player_id, course_id: p.course_id, tee_id: p.tee_id, date: p.date })
    .eq("id", p.id);
  if (error) return { error: error.message };

  await supabase.from("round_holes").delete().eq("round_id", p.id);
  const rows = p.holes.map(h => ({
    round_id: p.id,
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

  return { id: p.id };
}

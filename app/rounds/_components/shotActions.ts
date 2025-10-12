"use server";

import { createClient } from "@/lib/supabase/server";
import { ShotArray, type ShotInputType } from "./shotSchema";

export async function getRoundHeader(roundId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("rounds")
    .select(`
      id, date,
      player:players(*),
      course:courses(id, name),
      tee:tees(id, name, rating, slope, par)
    `)
    .eq("id", roundId)
    .single();
  if (error) return { error: error.message };
  return { data };
}

export async function getShots(roundId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("shots")
    .select("id, round_id, hole_number, shot_order, club, lie, distance_to_hole_m, start_x, start_y, end_x, end_y, result_lie, result_distance_to_hole_m, putt, penalty_strokes")
    .eq("round_id", roundId)
    .order("hole_number", { ascending: true })
    .order("shot_order", { ascending: true });
  if (error) return { error: error.message };
  return { data: data ?? [] };
}

/** Replace all shots for a round with the provided set. Orders are normalized to 1..N per hole. */
export async function saveShots(roundId: string, shots: ShotInputType[]) {
  const supabase = createClient();

  const parsed = ShotArray.safeParse(shots);
  if (!parsed.success) return { error: "Invalid shots payload" };

  // Normalize shot_order per hole
  const byHole = new Map<number, ShotInputType[]>();
  for (const s of shots) {
    if (!byHole.has(s.hole_number)) byHole.set(s.hole_number, []);
    byHole.get(s.hole_number)!.push(s);
  }
  const normalized: ShotInputType[] = [];
  for (const [, arr] of byHole.entries()) {
    const sorted = arr
      .slice()
      .sort((a, b) => a.shot_order - b.shot_order)
      .map((s, idx) => ({ ...s, shot_order: idx + 1 }));
    normalized.push(...sorted);
  }

  // Replace strategy
  const { error: delErr } = await supabase.from("shots").delete().eq("round_id", roundId);
  if (delErr) return { error: delErr.message };

  const rows = normalized.map((s) => ({
    round_id: roundId,
    hole_number: s.hole_number,
    shot_order: s.shot_order,
    club: s.club ?? null,
    lie: s.lie,
    distance_to_hole_m: s.distance_to_hole_m ?? null,
    start_x: s.start_x ?? null,
    start_y: s.start_y ?? null,
    end_x: s.end_x ?? null,
    end_y: s.end_y ?? null,
    result_lie: s.result_lie ?? null,
    result_distance_to_hole_m: s.result_distance_to_hole_m ?? null,
    putt: !!s.putt,
    penalty_strokes: s.penalty_strokes ?? 0,
  }));

  if (rows.length) {
    const { error: insErr } = await supabase.from("shots").insert(rows);
    if (insErr) return { error: insErr.message };
  }

  return { ok: true };
}

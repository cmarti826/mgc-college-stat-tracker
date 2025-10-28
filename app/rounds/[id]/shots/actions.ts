// app/rounds/[id]/shots/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type LieUI = "Tee" | "Fairway" | "Rough" | "Sand" | "Recovery" | "Other" | "Green" | "Penalty";
const toDbLie = (ui?: LieUI | null) =>
  (ui ?? "Other").toLowerCase() as
    | "tee"
    | "fairway"
    | "rough"
    | "sand"
    | "recovery"
    | "other"
    | "green"
    | "penalty";

export type UpsertShot = {
  id?: string;
  round_id: string;
  hole_number: number;
  shot_order: number; // UI -> DB shot_number
  start_lie?: LieUI | null;
  end_lie?: LieUI | null;
  start_dist_yards?: number | null;
  start_dist_feet?: number | null;
  end_dist_yards?: number | null;
  end_dist_feet?: number | null;
  start_x?: number | null;
  start_y?: number | null;
  end_x?: number | null;
  end_y?: number | null;
  club?: string | null;
  note?: string | null;
  putt?: boolean | null;
  penalty_strokes?: number | null;
};

export async function upsertShots(roundId: string, rows: UpsertShot[]) {
  const supabase = createBrowserSupabase();
  if (!rows?.length) return { ok: true };

  const payload = rows.map((r) => ({
    id: r.id,
    round_id: roundId,
    hole_number: r.hole_number,
    shot_number: r.shot_order,
    start_lie: toDbLie(r.start_lie ?? null),
    end_lie: toDbLie(r.end_lie ?? null),
    start_dist_yards: r.start_dist_yards ?? null,
    start_dist_feet: r.start_dist_feet ?? null,
    end_dist_yards: r.end_dist_yards ?? null,
    end_dist_feet: r.end_dist_feet ?? null,
    start_x: r.start_x ?? null,
    start_y: r.start_y ?? null,
    end_x: r.end_x ?? null,
    end_y: r.end_y ?? null,
    club: r.club ?? null,
    note: r.note ?? null,
    putt: !!r.putt,
    penalty_strokes: r.penalty_strokes ?? 0,
  }));

  const { error } = await supabase.from("shots").upsert(payload, {
    onConflict: "id,round_id,hole_number,shot_number",
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/rounds/${roundId}/shots`);
  revalidatePath(`/rounds/${roundId}`);
  return { ok: true };
}

export async function deleteShot(roundId: string, shotId: string) {
  const supabase = createBrowserSupabase();
  const { error } = await supabase.from("shots").delete().eq("id", shotId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/rounds/${roundId}/shots`);
  revalidatePath(`/rounds/${roundId}`);
  return { ok: true };
}

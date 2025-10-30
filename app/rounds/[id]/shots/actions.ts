// app/rounds/[id]/shots/actions.ts

"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { z } from "zod";

// Define LieUI enum
enum LieUI {
  Tee = "Tee",
  Fairway = "Fairway",
  Rough = "Rough",
  Sand = "Sand",
  Recovery = "Recovery",
  Other = "Other",
  Green = "Green",
  Penalty = "Penalty",
}

const toDbLie = (ui: LieUI | null | undefined): string => {
  if (!ui) return "other";
  return ui.toLowerCase() as
    | "tee"
    | "fairway"
    | "rough"
    | "sand"
    | "recovery"
    | "other"
    | "green"
    | "penalty";
};

const UpsertShotSchema = z.object({
  id: z.string().uuid().optional(),
  round_id: z.string().uuid(),
  hole_number: z.number().int().min(1).max(18),
  shot_order: z.number().int().min(1),
  start_lie: z.nativeEnum(LieUI).nullable().optional(),
  end_lie: z.nativeEnum(LieUI).nullable().optional(),
  start_dist_yards: z.number().min(0).nullable().optional(),
  start_dist_feet: z.number().min(0).nullable().optional(),
  end_dist_yards: z.number().min(0).nullable().optional(),
  end_dist_feet: z.number().min(0).nullable().optional(),
  start_x: z.number().nullable().optional(),
  start_y: z.number().nullable().optional(),
  end_x: z.number().nullable().optional(),
  end_y: z.number().nullable().optional(),
  club: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  putt: z.boolean().nullable().optional(),
  penalty_strokes: z.number().int().min(0).nullable().optional(),
});

export type UpsertShot = z.infer<typeof UpsertShotSchema>;

export async function upsertShots(roundId: string, rows: UpsertShot[]) {
  const supabase = createServerSupabase();

  // 1. Validate input
  const parsed = z.array(UpsertShotSchema).safeParse(rows);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    const msg = firstError?.message ?? "Invalid shot data";
    return { ok: false, error: msg };
  }

  if (parsed.data.length === 0) {
    return { ok: true };
  }

  // 2. Transform to DB format
  const payload = parsed.data.map((r) => ({
    id: r.id,
    round_id: roundId,
    hole_number: r.hole_number,
    shot_number: r.shot_order,
    start_lie: toDbLie(r.start_lie),
    end_lie: toDbLie(r.end_lie),
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

  // 3. Upsert to mgc.shots
  const { error } = await supabase
    .from("mgc.shots")
    .upsert(payload, {
      onConflict: "id",
      ignoreDuplicates: false,
    });

  if (error) {
    console.error("upsertShots error:", error);
    return { ok: false, error: error.message };
  }

  // 4. Revalidate
  revalidatePath(`/rounds/${roundId}/shots`);
  revalidatePath(`/rounds/${roundId}`);
  return { ok: true };
}

export async function deleteShot(roundId: string, shotId: string) {
  const supabase = createServerSupabase();

  const { error } = await supabase
    .from("mgc.shots")
    .delete()
    .eq("id", shotId)
    .eq("round_id", roundId);

  if (error) {
    console.error("deleteShot error:", error);
    return { ok: false, error: error.message };
  }

  revalidatePath(`/rounds/${roundId}/shots`);
  revalidatePath(`/rounds/${roundId}`);
  return { ok: true };
}
"use server";

import { createClient } from "@/lib/supabase/route";
import { z } from "zod";

/** UI payload row coming from ShotEditor */
const UiRow = z.object({
  hole_number: z.number().int().min(1).max(18),
  shot_order: z.number().int().min(1).optional(),
  club: z.string().nullable().optional(),

  lie: z.enum([
    "Tee",
    "Fairway",
    "Rough",
    "Sand",
    "Recovery",
    "Green",
    "Penalty",
    "Other",
  ]),
  dist_value: z.number().min(0).nullable(),
  dist_unit: z.enum(["yd", "ft"]),

  result_lie: z.enum([
    "Fairway",
    "Rough",
    "Sand",
    "Green",
    "Hole",
    "Penalty",
    "Other",
  ]),
  result_value: z.number().min(0).nullable(),
  result_unit: z.enum(["yd", "ft"]),

  putt: z.boolean(),
  penalty_strokes: z.number().int().min(0),
});

const UiPayload = z.object({
  roundId: z.string().uuid(),
  rows: z.array(UiRow),
});
type UiPayload = z.infer<typeof UiPayload>;

export async function saveShotsAction(input: UiPayload) {
  const supabase = createClient();

  const parsed = UiPayload.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid payload for Save Shots");
  }
  const { roundId, rows } = parsed.data;

  // Assign shot_order per hole when missing
  const byHole: Record<number, number> = {};
  const finalized = rows.map((r) => {
    const nextOrder = (byHole[r.hole_number] ?? 0) + 1;
    byHole[r.hole_number] = nextOrder;
    return { ...r, shot_order: r.shot_order ?? nextOrder };
  });

  const records = finalized.map((r) => {
    // Validate start distance by lie
    if (r.lie === "Green") {
      if (r.dist_unit !== "ft" || r.dist_value == null) {
        throw new Error(
          `start_dist_feet required (>=0) on GREEN at hole ${r.hole_number}`
        );
      }
    } else {
      if (r.dist_unit !== "yd" || r.dist_value == null) {
        throw new Error(
          `start_dist_yards required (>=0) off ${r.lie.toUpperCase()} at hole ${r.hole_number}`
        );
      }
    }

    // Validate result distance by result_lie
    if (r.result_lie === "Green") {
      if (r.result_unit !== "ft" || r.result_value == null) {
        throw new Error(
          `result_dist_feet required (>=0) when result is GREEN at hole ${r.hole_number}`
        );
      }
    } else if (r.result_lie !== "Hole") {
      if (r.result_unit !== "yd" || r.result_value == null) {
        throw new Error(
          `result_dist_yards required (>=0) when result is ${r.result_lie.toUpperCase()} at hole ${r.hole_number}`
        );
      }
    }

    return {
      round_id: roundId,
      hole_number: r.hole_number,
      shot_number: r.shot_order, // satisfy NOT NULL in schema
      shot_order: r.shot_order,

      club: r.club ?? null,

      // TitleCase strings to satisfy your CHECK constraints
      lie: r.lie,
      result_lie: r.result_lie,

      // Start distances
      start_dist_yards: r.lie === "Green" ? null : r.dist_value!,
      start_dist_feet: r.lie === "Green" ? r.dist_value! : null,

      // Result distances (Hole => 0/null)
      end_dist_yards:
        r.result_lie === "Green" || r.result_lie === "Hole"
          ? null
          : r.result_value ?? null,
      end_dist_feet:
        r.result_lie === "Green"
          ? r.result_value!
          : r.result_lie === "Hole"
          ? 0
          : null,

      putt: r.putt,
      penalty_strokes: r.penalty_strokes,
      penalty: (r.penalty_strokes ?? 0) > 0,

      start_x: null,
      start_y: null,
      end_x: null,
      end_y: null,
    };
  });

  // Replace shots for touched holes (idempotent save)
  const holesTouched = Array.from(new Set(records.map((r) => r.hole_number))).sort(
    (a, b) => a - b
  );

  const { error: delErr } = await supabase
    .from("shots")
    .delete()
    .eq("round_id", roundId)
    .in("hole_number", holesTouched);
  if (delErr) {
    throw new Error(`Failed to clear existing shots: ${delErr.message}`);
  }

  const { error: insErr } = await supabase.from("shots").insert(records);
  if (insErr) {
    throw new Error(`Failed to save shots: ${insErr.message}`);
  }

  return { ok: true };
}

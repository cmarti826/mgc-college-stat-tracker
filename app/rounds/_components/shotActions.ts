"use server";

import { createClient } from "@/lib/supabase/server-route";
import { z } from "zod";

/**
 * UI payload row (what ShotEditor sends to this action)
 * If your names differ slightly, keep the idea:
 *  - lie/result_lie are TitleCase strings: "Tee" | "Fairway" | ... | "Green"
 *  - distance to hole + unit for the starting lie
 *  - result distance + unit for where the ball finished
 *  - putt boolean, penalty_strokes number (0..)
 *  - hole_number number (1..18)
 *  - shot_order number (1..N) – if not provided, we’ll assign sequentially
 *  - club optional string
 */
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
  dist_value: z.number().min(0).nullable(),       // number typed in the UI
  dist_unit: z.enum(["yd", "ft"]),                 // unit shown in the UI

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

/**
 * Save shots for a round. Validates per-lie units:
 *  - If lie === "Green": require feet (dist_unit === "ft") -> write start_dist_feet
 *  - Else: require yards (dist_unit === "yd") -> write start_dist_yards
 * Same rule for result_* fields based on result_lie.
 */
export async function saveShotsAction(input: UiPayload) {
  const supabase = createClient();

  const parsed = UiPayload.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid payload for Save Shots");
  }
  const { roundId, rows } = parsed.data;

  // Assign shot_order per hole when it’s missing
  const byHole: Record<number, number> = {};
  const finalized = rows.map((r) => {
    const nextOrder = (byHole[r.hole_number] ?? 0) + 1;
    byHole[r.hole_number] = nextOrder;
    return { ...r, shot_order: r.shot_order ?? nextOrder };
  });

  // Per-row validation and mapping to DB columns
  const records = finalized.map((r) => {
    // --- start distance must match lie
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

    // --- result distance must match result_lie
    if (r.result_lie === "Green") {
      if (r.result_unit !== "ft" || r.result_value == null) {
        throw new Error(
          `result_dist_feet required (>=0) when result is GREEN at hole ${r.hole_number}`
        );
      }
    } else if (r.result_lie !== "Hole") {
      // if "Hole", result distances are 0/null and that’s fine
      if (r.result_unit !== "yd" || r.result_value == null) {
        throw new Error(
          `result_dist_yards required (>=0) when result is ${r.result_lie.toUpperCase()} at hole ${r.hole_number}`
        );
      }
    }

    // Map to DB columns exactly as your table defines
    return {
      round_id: roundId,
      hole_number: r.hole_number,
      shot_number: r.shot_order,  // some of your code refers to shot_number; we set it
      shot_order: r.shot_order,   // keep both to satisfy either name used elsewhere
      club: r.club ?? null,

      // DB checks expect TitleCase strings (matches your CHECK constraints)
      lie: r.lie,
      result_lie: r.result_lie,

      // Start distances: write only the relevant column, null the other
      start_dist_yards: r.lie === "Green" ? null : r.dist_value!,
      start_dist_feet:  r.lie === "Green" ? r.dist_value! : null,

      // Result distances: same idea; if HOLE, both 0
      end_dist_yards:
        r.result_lie === "Green" || r.result_lie === "Hole" ? null : r.result_value ?? null,
      end_dist_feet:
        r.result_lie === "Green"
          ? r.result_value!
          : r.result_lie === "Hole"
          ? 0
          : null,

      putt: r.putt,
      penalty_strokes: r.penalty_strokes,
      // Flags your schema uses
      penalty: (r.penalty_strokes ?? 0) > 0,
      // keep these null if you’re not doing XY plotting now
      start_x: null,
      start_y: null,
      end_x: null,
      end_y: null,
    };
  });

  // Upsert/replace strategy: delete existing shots for these holes then insert
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

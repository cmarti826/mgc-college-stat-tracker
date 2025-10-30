// app/rounds/_components/shotSchema.ts

import { z } from "zod";

/**
 * UI-to-Server payload for a single shot.
 * All distances are in **meters** (converted from UI imperial/metric).
 */
export const ShotInput = z.object({
  hole_number: z.number().int().min(1).max(18),
  shot_order: z.number().int().min(1), // 1 = tee shot

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

  // Start distance in **meters**
  distance_to_hole_m: z.number().nullable(),

  // Optional coordinates (for future map integration)
  start_x: z.number().nullable().optional(),
  start_y: z.number().nullable().optional(),
  end_x: z.number().nullable().optional(),
  end_y: z.number().nullable().optional(),

  result_lie: z.enum([
    "Fairway",
    "Rough",
    "Sand",
    "Green",
    "Hole",
    "Penalty",
    "Other",
  ]),

  // Result distance in **meters**
  result_distance_to_hole_m: z.number().nullable(),

  putt: z.boolean(),
  penalty_strokes: z.number().int().min(0).default(0),
});

export type ShotInputType = z.infer<typeof ShotInput>;

export const ShotArray = z.array(ShotInput);
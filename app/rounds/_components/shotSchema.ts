import { z } from "zod";

export const ShotInput = z.object({
  hole_number: z.number().min(1).max(18),
  shot_order: z.number().min(1), // 1 = tee shot
  club: z.string().optional().nullable(),
  lie: z.enum(["Tee", "Fairway", "Rough", "Sand", "Recovery", "Green", "Penalty", "Other"]),
  distance_to_hole_m: z.number().nullable().optional(),
  start_x: z.number().nullable().optional(),
  start_y: z.number().nullable().optional(),
  end_x: z.number().nullable().optional(),
  end_y: z.number().nullable().optional(),
  result_lie: z
    .enum(["Fairway", "Rough", "Sand", "Green", "Hole", "Penalty", "Other"])
    .nullable()
    .optional(),
  result_distance_to_hole_m: z.number().nullable().optional(),
  putt: z.boolean().optional().nullable(),
  penalty_strokes: z.number().int().min(0).optional().nullable(),
});
export type ShotInputType = z.infer<typeof ShotInput>;

export const ShotArray = z.array(ShotInput);

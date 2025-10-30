// app/rounds/_components/actions.ts

"use server";

import { createServerSupabase } from '@/lib/supabase/server';
import { z } from 'zod';

const HoleSchema = z.object({
  hole_number: z.number().int().min(1).max(18),
  par: z.number().int().min(3).max(6),
  yards: z.number().int().positive().nullable().optional(),
  strokes: z.number().int().positive().nullable().optional(),
  putts: z.number().int().min(0).nullable().optional(),
  fir: z.boolean().nullable().optional(),
  gir: z.boolean().nullable().optional(),
  up_down: z.boolean().nullable().optional(),
  sand_save: z.boolean().nullable().optional(),
  penalty: z.boolean().nullable().optional(),
});

const RoundSchema = z.object({
  id: z.string().uuid().optional(),
  player_id: z.string().min(1, 'Player is required'),
  course_id: z.string().min(1, 'Course is required'),
  tee_id: z.string().uuid('Invalid tee ID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  holes: z
    .array(HoleSchema)
    .length(18, 'Must include exactly 18 holes')
    .refine(
      (holes) =>
        holes.every((h, i) => h.hole_number === i + 1),
      'Hole numbers must be 1–18 in order'
    ),
});

export type RoundPayload = z.infer<typeof RoundSchema>;

export async function createRoundAction(payload: RoundPayload) {
  const supabase = createServerSupabase();

  // 1. Validate
  const parsed = RoundSchema.safeParse(payload);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Invalid input';
    return { error: message };
  }

  const { player_id, course_id, tee_id, date, holes } = parsed.data;

  // 2. Prepare holes (nullify FIR for non-par 4/5)
  const p_holes = holes.map((h) => ({
    hole_number: h.hole_number,
    par: h.par,
    yards: h.yards ?? null,
    strokes: h.strokes ?? null,
    putts: h.putts ?? null,
    fir: h.par === 4 || h.par === 5 ? h.fir ?? null : null,
    gir: h.gir ?? null,
    up_down: h.up_down ?? null,
    sand_save: h.sand_save ?? null,
    penalty: h.penalty ?? null,
  }));

  // 3. Call RPC
  const { data, error } = await supabase.rpc('mgc.create_round_with_holes', {
    p_player_key: player_id,
    p_course_key: course_id,
    p_tee_id: tee_id,
    p_date: date,
    p_holes,
  });

  if (error) {
    console.error('create_round_with_holes error:', error);
    return { error: error.message };
  }

  return { id: data as string };
}

export async function updateRoundAction(payload: RoundPayload) {
  const supabase = createServerSupabase();

  if (!payload.id) {
    return { error: 'Round ID is required for update' };
  }

  // 1. Validate
  const parsed = RoundSchema.safeParse(payload);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Invalid input';
    return { error: message };
  }

  const { id, player_id, course_id, tee_id, date, holes } = parsed.data;

  // 2. Prepare holes
  const p_holes = holes.map((h) => ({
    hole_number: h.hole_number,
    par: h.par,
    yards: h.yards ?? null,
    strokes: h.strokes ?? null,
    putts: h.putts ?? null,
    fir: h.par === 4 || h.par === 5 ? h.fir ?? null : null,
    gir: h.gir ?? null,
    up_down: h.up_down ?? null,
    sand_save: h.sand_save ?? null,
    penalty: h.penalty ?? null,
  }));

  // 3. Call RPC
  const { data, error } = await supabase.rpc('mgc.update_round_with_holes', {
    p_round_id: id,
    p_player_key: player_id,
    p_course_key: course_id,
    p_tee_id: tee_id,
    p_date: date,
    p_holes,
  });

  if (error) {
    console.error('update_round_with_holes error:', error);
    return { error: error.message };
  }

  return { id: data as string };
}
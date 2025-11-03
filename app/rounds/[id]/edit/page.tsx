// app/rounds/[id]/edit/page.tsx

import { createServerSupabase } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import RoundEntry from '../../_components/RoundEntry';

type Player = {
  id: string;
  first_name: string;
  last_name: string;
  grad_year?: number;
};

type Course = {
  id: string;
  name: string;
};

type TeeSet = {
  id: string;
  course_id: string;
  name: string;
  rating?: number;
  slope?: number;
  par?: number;
};

type Round = {
  id: string;
  player_id: string;
  course_id: string;
  tee_set_id: string;
  event_id?: string | null;
  played_on: string;
  notes?: string | null;
};

type Hole = {
  hole_number: number;
  par: number;
  yards?: number | null;
  strokes?: number | null;
  putts?: number | null;
  fir?: boolean | null;
  gir?: boolean | null;
  up_down?: boolean | null;
  sand_save?: boolean | null;
  penalty?: boolean | null;
};

interface Props {
  params: { id: string };
}

export default async function EditRoundPage({ params }: Props) {
  const supabase = createServerSupabase();
  const roundId = params.id;

  // 1. Fetch all required data
  const [
    { data: players, error: pErr },
    { data: courses, error: cErr },
    { data: teeSets, error: tErr },
    { data: round, error: rErr },
    { data: holes, error: hErr },
  ] = await Promise.all([
    supabase
      .from('players')
      .select('id, first_name, last_name, grad_year')
      .order('last_name', { ascending: true }),
    supabase
      .from('courses')
      .select('id, name')
      .order('name', { ascending: true }),
    supabase
      .from('tee_sets')
      .select('id, course_id, name, rating, slope, par')
      .order('name', { ascending: true }),
    supabase
      .from('scheduled_rounds')
      .select('id, player_id, course_id, tee_set_id, event_id, played_on, notes')
      .eq('id', roundId)
      .single(),
    supabase
      .from('round_holes')
      .select('hole_number, par, yards, strokes, putts, fir, gir, up_down, sand_save, penalty')
      .eq('round_id', roundId)
      .order('hole_number', { ascending: true }),
  ]);

  // 2. Handle errors
  if (rErr || !round) {
    console.error('Round fetch error:', rErr);
    notFound();
  }

  if (pErr) console.error('Players fetch error:', pErr);
  if (cErr) console.error('Courses fetch error:', cErr);
  if (tErr) console.error('Tee sets fetch error:', tErr);
  if (hErr) console.error('Holes fetch error:', hErr);

  // 3. Format holes to match RoundEntry expectations
  const formattedHoles = (holes ?? []).map((h: Hole) => ({
    hole_number: h.hole_number,
    par: h.par,
    yards: h.yards ?? null,
    strokes: h.strokes ?? null,
    putts: h.putts ?? null,
    fir: h.fir ?? null,
    gir: h.gir ?? null,
    up_down: h.up_down ?? null,
    sand_save: h.sand_save ?? null,
    penalty: h.penalty ?? null,
  }));

  // 4. Format players to include first_name/last_name for RoundEntry
  const formattedPlayers = (players ?? []).map((p: any) => ({
    id: p.id,
    first_name: p.first_name ?? '',
    last_name: p.last_name ?? '',
    grad_year: p.grad_year,
  })) as Player[];

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <RoundEntry
        mode="edit"
        initialRound={{
          round,
          holes: formattedHoles,
        }}
        players={formattedPlayers}
        courses={courses ?? []}
        teeSets={teeSets ?? []}
      />
    </div>
  );
}
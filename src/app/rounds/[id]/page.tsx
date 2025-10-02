'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Round = {
  id: string; player_id: string; team_id: string | null; event_id: string | null;
  course_id: string | null; course_tee_id: string | null; status: string; start_time: string | null;
};
type Hole = { hole_number: number; strokes: number | null; putts: number | null; penalties: number | null; fairway_hit: boolean | null; gir: boolean | null };
type Course = { name: string | null; city: string | null; state: string | null };
type Tee = { tee_name: string | null; course_rating: number | null; slope_rating: number | null };

export default function RoundPage({ params }: { params: { id: string } }) {
  const roundId = params.id;
  const [round, setRound] = useState<Round | null>(null);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [tee, setTee] = useState<Tee | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      const { data: r, error: er } = await supabase.from<Round>('rounds').select('*').eq('id', roundId).single();
      if (er) { setErr(er.message); return; }
      setRound(r);

      const { data: h } = await supabase.from<Hole>('round_holes').select('*').eq('round_id', roundId).order('hole_number');
      setHoles(h ?? []);

      if (r.course_id) {
        const { data: c } = await supabase.from<Course>('courses').select('name,city,state').eq('id', r.course_id).maybeSingle();
        setCourse(c ?? null);
      }
      if (r.course_tee_id) {
        const { data: t } = await supabase.from<Tee>('course_tees').select('tee_name,course_rating,slope_rating').eq('id', r.course_tee_id).maybeSingle();
        setTee(t ?? null);
      }
    })();
  }, [roundId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Round</h1>
        <div className="space-x-2">
          <Link className="rounded border px-3 py-1 hover:bg-gray-50" href={`/rounds/${roundId}/holes/1`}>Open Hole 1</Link>
        </div>
      </div>

      {err && <div className="rounded border border-red-200 bg-red-50 p-2 text-red-700">{err}</div>}

      {course && (
        <div className="text-sm text-gray-700">
          {course.name ?? 'Course'} • {[course.city ?? '', course.state ?? ''].filter(Boolean).join(', ')}
          {tee && <> • Tee {tee.tee_name ?? ''} ({tee.course_rating ?? ''}/{tee.slope_rating ?? ''})</>}
        </div>
      )}

      <div className="rounded border bg-white">
        <div className="grid grid-cols-7 gap-2 border-b px-3 py-2 text-sm font-medium">
          <div>Hole</div><div>Strokes</div><div>Putts</div><div>Pen</div><div>FW</div><div>GIR</div><div>Open</div>
        </div>
        {Array.from({ length: 18 }).map((_, idx) => {
          const hn = idx + 1;
          const h = holes.find(x => x.hole_number === hn);
          return (
            <div key={hn} className="grid grid-cols-7 items-center gap-2 border-t px-3 py-2 text-sm">
              <div>{hn}</div>
              <div>{h?.strokes ?? ''}</div>
              <div>{h?.putts ?? ''}</div>
              <div>{h?.penalties ?? ''}</div>
              <div>{h?.fairway_hit == null ? '' : (h.fairway_hit ? 'Y' : 'N')}</div>
              <div>{h?.gir ? 'Y' : ''}</div>
              <div><Link href={`/rounds/${roundId}/holes/${hn}`} className="underline">Enter</Link></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

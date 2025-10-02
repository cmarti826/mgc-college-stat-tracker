'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type HoleRow = {
  strokes: number | null; putts: number | null; penalties: number | null;
  fairway_hit: boolean | null; gir: boolean | null;
};
type CourseHole = { par: number | null };
type TeeHole = { yardage: number | null };

export default function HoleEntry({ params }: { params: { id: string; hole: string } }) {
  const roundId = params.id;
  const holeNo = Number(params.hole);

  const [vals, setVals] = useState<HoleRow>({ strokes: null, putts: null, penalties: 0, fairway_hit: null, gir: null });
  const [par, setPar] = useState<number | null>(null);
  const [yd, setYd] = useState<number | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      // existing entry
      const { data: h } = await supabase
        .from<HoleRow>('round_holes')
        .select('strokes,putts,penalties,fairway_hit,gir')
        .eq('round_id', roundId).eq('hole_number', holeNo).maybeSingle();
      if (h) setVals(h);

      // course par & tee yardage
      const { data: r } = await supabase.from('rounds').select('course_id, course_tee_id').eq('id', roundId).single();
      if (r?.course_id) {
        const { data: ch } = await supabase
          .from<CourseHole>('course_holes').select('par').eq('course_id', r.course_id).eq('hole_number', holeNo).maybeSingle();
        setPar(ch?.par ?? null);
      }
      if (r?.course_tee_id) {
        const { data: th } = await supabase
          .from<TeeHole>('course_tee_holes').select('yardage').eq('course_tee_id', r.course_tee_id).eq('hole_number', holeNo).maybeSingle();
        setYd(th?.yardage ?? null);
      }
    })();
  }, [roundId, holeNo]);

  const title = useMemo(() => {
    const parts: string[] = [`Hole ${holeNo}`];
    if (par != null) parts.push(`Par ${par}`);
    if (yd != null) parts.push(`${yd} yds`);
    return parts.join(' • ');
  }, [holeNo, par, yd]);

  async function save() {
    setErr('');
    const { error } = await supabase.from('round_holes').upsert({
      round_id: roundId,
      hole_number: holeNo,
      strokes: vals.strokes ?? 0,
      putts: vals.putts ?? 0,
      penalties: vals.penalties ?? 0,
      fairway_hit: vals.fairway_hit,
      gir: vals.gir,
    });
    if (error) setErr(error.message);
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{title}</h1>
        <Link className="underline" href={`/rounds/${roundId}`}>Round</Link>
      </div>

      {err && <div className="rounded border border-red-200 bg-red-50 p-2 text-red-700">{err}</div>}

      <div className="rounded border bg-white p-3 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <label className="text-sm">
            <div className="text-gray-600">Strokes</div>
            <input className="mt-1 w-full rounded border px-2 py-1" inputMode="numeric"
              value={vals.strokes ?? ''} onChange={e => setVals(v => ({ ...v, strokes: e.target.value ? Number(e.target.value) : null }))} />
          </label>
          <label className="text-sm">
            <div className="text-gray-600">Putts</div>
            <input className="mt-1 w-full rounded border px-2 py-1" inputMode="numeric"
              value={vals.putts ?? ''} onChange={e => setVals(v => ({ ...v, putts: e.target.value ? Number(e.target.value) : null }))} />
          </label>
          <label className="text-sm">
            <div className="text-gray-600">Penalties</div>
            <input className="mt-1 w-full rounded border px-2 py-1" inputMode="numeric"
              value={vals.penalties ?? 0} onChange={e => setVals(v => ({ ...v, penalties: e.target.value ? Number(e.target.value) : 0 }))} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={vals.fairway_hit ?? false}
              onChange={e => setVals(v => ({ ...v, fairway_hit: e.target.checked }))} />
            Fairway Hit (auto-null on Par 3)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={vals.gir ?? false}
              onChange={e => setVals(v => ({ ...v, gir: e.target.checked }))} />
            GIR
          </label>
        </div>

        <div className="flex gap-2">
          <button className="rounded bg-[#0033A0] px-4 py-2 text-white" onClick={save}>Save</button>
          <Link className="rounded border px-4 py-2" href={`/rounds/${roundId}/holes/${Math.min(18, holeNo + 1)}`}>Next Hole</Link>
        </div>
      </div>
    </div>
  );
}

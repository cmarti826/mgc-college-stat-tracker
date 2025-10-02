'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Course = { id: string; name: string | null; city: string | null; state: string | null };
type Hole = { hole_number: number; par: number | null };
type Tee = { id: string; tee_name: string | null; color: string | null; course_rating: number | null; slope_rating: number | null };
type TeeHole = { hole_number: number; yardage: number | null };

export default function CourseEditor({ params }: { params: { id: string } }) {
  const courseId = params.id;
  const [course, setCourse] = useState<Course | null>(null);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [tees, setTees] = useState<Tee[]>([]);
  const [teeHoles, setTeeHoles] = useState<Record<string, TeeHole[]>>({});
  const [newTee, setNewTee] = useState({ name: '', color: '', rating: '', slope: '' });

  async function load() {
    const [{ data: c }, { data: hs }, { data: ts }] = await Promise.all([
      supabase.from<Course>('courses').select('id,name,city,state').eq('id', courseId).single(),
      supabase.from<Hole>('course_holes').select('hole_number,par').eq('course_id', courseId).order('hole_number'),
      supabase.from<Tee>('course_tees').select('id,tee_name,color,course_rating,slope_rating').eq('course_id', courseId).order('tee_name'),
    ]);
    setCourse(c ?? null);
    setHoles(hs ?? []);
    setTees(ts ?? []);
    const th: Record<string, TeeHole[]> = {};
    if (ts) {
      for (const t of ts) {
        const { data } = await supabase
          .from<TeeHole>('course_tee_holes')
          .select('hole_number,yardage')
          .eq('course_tee_id', t.id)
          .order('hole_number');
        th[t.id] = data ?? [];
      }
    }
    setTeeHoles(th);
  }

  useEffect(() => { load(); }, [courseId]);

  async function setPar(hole: number, par: number) {
    await supabase.from('course_holes').upsert({ course_id: courseId, hole_number: hole, par });
    await load();
  }

  async function createTee() {
    const { data: t } = await supabase
      .from<Tee>('course_tees')
      .insert({
        course_id: courseId,
        tee_name: newTee.name || 'Tee',
        color: newTee.color || null,
        course_rating: newTee.rating ? Number(newTee.rating) : null,
        slope_rating: newTee.slope ? Number(newTee.slope) : null,
      })
      .select('id')
      .single();
    if (t?.id) {
      for (let i = 1; i <= 18; i++) {
        await supabase.from('course_tee_holes').upsert({ course_tee_id: t.id, hole_number: i, yardage: null });
      }
    }
    setNewTee({ name: '', color: '', rating: '', slope: '' });
    await load();
  }

  async function setYardage(teeId: string, hole: number, val: number | null) {
    await supabase.from('course_tee_holes').upsert({ course_tee_id: teeId, hole_number: hole, yardage: val });
    await load();
  }

  const grid = useMemo(() => Array.from({ length: 18 }).map((_, i) => i + 1), []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{course?.name ?? 'Course'}</h1>
      <div className="text-sm text-gray-600">{[course?.city ?? '', course?.state ?? ''].filter(Boolean).join(', ')}</div>

      <div className="rounded border bg-white p-3">
        <div className="mb-2 font-medium">Hole Pars</div>
        <div className="grid grid-cols-9 gap-2">
          {grid.map(hn => {
            const curr = holes.find(h => h.hole_number === hn)?.par ?? null;
            return (
              <div key={hn} className="text-sm">
                <div className="text-gray-600">Hole {hn}</div>
                <select
                  className="mt-1 w-full rounded border px-2 py-1"
                  value={curr ?? ''}
                  onChange={(e) => setPar(hn, Number(e.target.value))}
                >
                  <option value="">—</option>
                  <option value="3">Par 3</option>
                  <option value="4">Par 4</option>
                  <option value="5">Par 5</option>
                </select>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded border bg-white p-3 space-y-3">
        <div className="font-medium">Tees</div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          <input className="rounded border px-2 py-1" placeholder="Name" value={newTee.name} onChange={e => setNewTee(v => ({ ...v, name: e.target.value }))} />
          <input className="rounded border px-2 py-1" placeholder="Color" value={newTee.color} onChange={e => setNewTee(v => ({ ...v, color: e.target.value }))} />
          <input className="rounded border px-2 py-1" placeholder="Rating" inputMode="decimal" value={newTee.rating} onChange={e => setNewTee(v => ({ ...v, rating: e.target.value }))} />
          <input className="rounded border px-2 py-1" placeholder="Slope" inputMode="numeric" value={newTee.slope} onChange={e => setNewTee(v => ({ ...v, slope: e.target.value }))} />
          <button className="rounded bg-[#0033A0] px-3 py-1 text-white" onClick={createTee}>Add Tee</button>
        </div>

        {tees.map(t => (
          <div key={t.id} className="rounded border p-2">
            <div className="mb-2 font-medium">{t.tee_name ?? 'Tee'} {t.color ? `• ${t.color}` : ''}</div>
            <div className="grid grid-cols-9 gap-2">
              {grid.map(hn => {
                const curr = teeHoles[t.id]?.find(h => h.hole_number === hn)?.yardage ?? null;
                return (
                  <div key={hn} className="text-sm">
                    <div className="text-gray-600">H{hn}</div>
                    <input
                      className="mt-1 w-full rounded border px-2 py-1"
                      inputMode="numeric"
                      value={curr ?? ''}
                      onChange={(e) => setYardage(t.id, hn, e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

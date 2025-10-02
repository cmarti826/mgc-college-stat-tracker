'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type RoundRow = {
  id: string;
  team_id: string | null;
  event_id: string | null;
  course_id: string | null;
  course_tee_id: string | null;
  status: 'in_progress' | 'submitted' | 'final' | 'abandoned';
  start_time: string | null;
};
type CourseRow = { id: string; name: string | null; city: string | null; state: string | null };
type TeeRow = { id: string; tee_name: string | null; course_rating: number | null; slope_rating: number | null };
type PlayerRoundLite = { id: string; status: string | null; strokes: number | null; to_par: number | null };

export default function Home() {
  const [err, setErr] = useState('');
  const [active, setActive] = useState<RoundRow | null>(null);
  const [course, setCourse] = useState<CourseRow | null>(null);
  const [tee, setTee] = useState<TeeRow | null>(null);
  const [recent, setRecent] = useState<PlayerRoundLite[]>([]);

  useEffect(() => {
    (async () => {
      setErr('');
      // latest in-progress round for current user (by created_by)
      const { data: r1, error: e1 } = await supabase
        .from<RoundRow>('rounds')
        .select('id,team_id,event_id,course_id,course_tee_id,status,start_time')
        .eq('status', 'in_progress')
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (e1) setErr(e1.message);
      setActive(r1 ?? null);

      if (r1?.course_id) {
        const [{ data: c }, { data: t }] = await Promise.all([
          supabase.from<CourseRow>('courses').select('id,name,city,state').eq('id', r1.course_id).maybeSingle(),
          r1.course_tee_id
            ? supabase.from<TeeRow>('course_tees').select('id,tee_name,course_rating,slope_rating').eq('id', r1.course_tee_id).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        setCourse(c ?? null);
        setTee((t as TeeRow | null) ?? null);
      }

      const { data: rr, error: e2 } = await supabase
        .from('v_player_rounds')
        .select('round_id:id,status,strokes,to_par') // alias round_id -> id
        .order('round_id', { ascending: false })
        .limit(5);
      if (e2) setErr((prev) => prev || e2.message);
      setRecent((rr as PlayerRoundLite[] | null) ?? []);
    })();
  }, []);

  const courseLine = useMemo(() => {
    if (!course) return '';
    const loc = [course.city ?? '', course.state ?? ''].filter(Boolean).join(', ');
    return `${course.name ?? 'Course'}${loc ? ` • ${loc}` : ''}`;
  }, [course]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link className="rounded border px-3 py-1.5" href="/events">Events</Link>
          <Link className="rounded border px-3 py-1.5" href="/stats">Start / Resume Round</Link>
          <Link className="rounded border px-3 py-1.5" href="/reports/team">Team Reports</Link>
          <Link className="rounded border px-3 py-1.5" href="/admin/team">Admin</Link>
        </div>
      </div>

      {err && <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{err}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded border bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-semibold">My Active Round</div>
            {active && <Link className="text-sm underline" href={`/rounds/${active.id}`}>Round Page</Link>}
          </div>
          {active ? (
            <>
              <div className="text-sm text-gray-700">{courseLine}</div>
              {tee && (
                <div className="text-xs text-gray-600">Tee: {tee.tee_name ?? ''} • {tee.course_rating ?? ''}/{tee.slope_rating ?? ''}</div>
              )}
              <div className="mt-3 flex gap-2">
                <Link className="rounded bg-[#0B6B3A] px-4 py-2 text-white" href={`/rounds/${active.id}/holes/1`}>Resume on Hole 1</Link>
                <Link className="rounded border px-4 py-2" href={`/rounds/${active.id}`}>Details</Link>
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-700">
              No in-progress round.
              <div className="mt-2"><Link className="underline" href="/stats">Start a round</Link></div>
            </div>
          )}
        </div>

        <div className="rounded border bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-semibold">Latest Event</div>
            <Link className="text-sm underline" href="/events">All Events</Link>
          </div>
          <div className="text-sm text-gray-700">No events yet.</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded border bg-white">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="font-semibold">Recent Rounds</div>
          </div>
          <div className="divide-y">
            {recent.length ? recent.map(r => (
              <div key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate">{r.status ?? '—'}</div>
                  <div className="text-xs text-gray-600">
                    {r.strokes ?? 0} strokes • {r.to_par ?? 0}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/rounds/${r.id}`} className="underline">Open</Link>
                  <Link href={`/rounds/${r.id}/holes/1`} className="underline">Hole 1</Link>
                </div>
              </div>
            )) : (
              <div className="px-3 py-4 text-sm text-gray-600">No rounds yet.</div>
            )}
          </div>
        </div>

        <div className="rounded border bg-white">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="font-semibold">My Teams & Events</div>
            <Link className="text-sm underline" href="/admin/team">Team Settings</Link>
          </div>
          <div className="px-3 py-4 text-sm text-gray-600">You’re not on any teams yet.</div>
        </div>
      </div>
    </div>
  );
}

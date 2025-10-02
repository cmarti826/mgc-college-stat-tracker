'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

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

type RecentRound = {
  id: string;
  status: string | null;
  strokes: number | null;
  to_par: number | null;
};

const supabase =
  (globalThis as any).__sb ??
  ((): any => {
    const c = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    );
    (globalThis as any).__sb = c;
    return c;
  })();

function ratingSlope(r: number | null, s: number | null) {
  if (r == null && s == null) return '';
  if (r == null) return String(s);
  if (s == null) return String(r);
  return `${r} • ${s}`;
}

export default function HomePage() {
  const [err, setErr] = useState('');
  const [active, setActive] = useState<RoundRow | null>(null);
  const [course, setCourse] = useState<CourseRow | null>(null);
  const [tee, setTee] = useState<TeeRow | null>(null);
  const [recent, setRecent] = useState<RecentRound[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr('');

      // 1) Active round (latest in_progress by this user)
      const { data: r1, error: e1 } = await supabase
        .from<RoundRow>('rounds')
        .select('id,team_id,event_id,course_id,course_tee_id,status,start_time')
        .eq('status', 'in_progress')
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (e1) {
        setErr(e1.message);
        setLoading(false);
        return;
      }
      setActive(r1 ?? null);

      // 2) Course + tee for the active round (if any)
      if (r1?.course_id) {
        const [{ data: c, error: ec }, { data: t, error: et }] = await Promise.all([
          supabase.from<CourseRow>('courses').select('id,name,city,state').eq('id', r1.course_id).single(),
          r1.course_tee_id
            ? supabase.from<TeeRow>('course_tees')
                .select('id,tee_name,course_rating,slope_rating')
                .eq('id', r1.course_tee_id)
                .single()
            : Promise.resolve({ data: null, error: null }),
        ]);

        if (ec) setErr(ec.message);
        if (et) setErr(et.message);
        setCourse(c ?? null);
        setTee((t as any) ?? null);
      } else {
        setCourse(null);
        setTee(null);
      }

      // 3) Recent rounds (show last 3 regardless of status)
      const { data: rr, error: e2 } = await supabase
        .from<RecentRound>('v_player_rounds')
        .select('round_id:id,status,strokes,to_par')
        .order('round_id', { ascending: false })
        .limit(3);

      if (e2) setErr(e2.message);
      setRecent(rr ?? []);

      setLoading(false);
    })();
  }, []);

  // For now we just send them to Hole 1 if the round has no holes saved yet.
  const nextHole = 1;

  const activeTitle = useMemo(() => {
    if (!course) return '(unknown course)';
    const loc = [course.city ?? '', course.state ?? ''].filter(Boolean).join(', ');
    return `${course.name ?? 'Course'}${loc ? ` • ${loc}` : ''}`;
  }, [course]);

  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="space-x-2">
          <Link href="/events" className="rounded border px-3 py-1 hover:bg-gray-50">Events</Link>
          <Link href="/rounds/start" className="rounded border px-3 py-1 hover:bg-gray-50">Start / Resume Round</Link>
          <Link href="/reports/team" className="rounded border px-3 py-1 hover:bg-gray-50">Team Reports</Link>
          <Link href="/admin" className="rounded border px-3 py-1 hover:bg-gray-50">Admin</Link>
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-red-800">{err}</div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* My Active Round */}
        <div className="rounded border bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-medium">My Active Round</div>
            {active && (
              <Link href={`/rounds/${active.id}`} className="text-sm text-[#0033A0] underline">
                Round Page
              </Link>
            )}
          </div>

          {active ? (
            <>
              <div className="text-sm text-gray-700">
                {activeTitle}
                {tee && (
                  <>
                    <br />
                    <span className="text-xs text-gray-600">
                      Tee: {tee.tee_name ?? ''} • {ratingSlope(tee.course_rating, tee.slope_rating)}
                    </span>
                  </>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2">
                {/* IMPORTANT: Pure anchors, not buttons, so clicks always navigate */}
                <Link
                  href={`/rounds/${active.id}/holes/${nextHole}`}
                  className="rounded bg-green-600 px-3 py-1 text-white hover:opacity-90"
                >
                  Resume on Hole {nextHole}
                </Link>
                <Link
                  href={`/rounds/${active.id}`}
                  className="rounded border px-3 py-1 hover:bg-gray-50"
                >
                  Details
                </Link>
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-600">No in-progress round.</div>
          )}
        </div>

        {/* Latest Event */}
        <div className="rounded border bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-medium">Latest Event</div>
            <Link href="/events" className="text-sm text-[#0033A0] underline">
              All Events
            </Link>
          </div>
          <div className="text-sm text-gray-600">No events yet.</div>
        </div>

        {/* Recent Rounds • Player */}
        <div className="rounded border bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-medium">Recent Rounds • Player</div>
            {active && (
              <Link href={`/rounds/${active.id}`} className="text-sm text-[#0033A0] underline">
                Player Page
              </Link>
            )}
          </div>

          {recent.length === 0 ? (
            <div className="text-sm text-gray-600">No rounds yet.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {recent.map(r => (
                <li key={r.id} className="flex items-center justify-between rounded border px-2 py-1">
                  <div className="text-gray-700">
                    {r.status ?? '—'}{' '}
                    <span className="ml-2 text-xs text-gray-500">
                      {r.strokes ?? 0} strokes • {r.to_par ?? 0}
                    </span>
                  </div>
                  {/* IMPORTANT: pure Link anchor */}
                  <Link href={`/rounds/${r.id}/holes/1`} className="text-[#0033A0] underline">
                    Open&nbsp;<span className="underline">Hole 1</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* My Teams & Events */}
        <div className="rounded border bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-medium">My Teams & Events</div>
            <Link href="/admin/team" className="text-sm text-[#0033A0] underline">Team Settings</Link>
          </div>
          <div className="text-sm text-gray-600">You’re not on any teams yet.</div>
        </div>
      </div>
    </div>
  );
}

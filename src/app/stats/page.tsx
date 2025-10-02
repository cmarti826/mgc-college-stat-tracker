'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type Team = { id: string; name: string };
type Course = { id: string; name: string | null };
type Tee = { id: string; tee_name: string | null };

export default function StatsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [tees, setTees] = useState<Tee[]>([]);
  const [teamId, setTeamId] = useState<string>('');
  const [courseId, setCourseId] = useState<string>('');
  const [teeId, setTeeId] = useState<string>('');
  const [roundId, setRoundId] = useState<string | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      const { data: tm } = await supabase.from<Team>('teams').select('id,name').order('name', { ascending: true });
      setTeams(tm ?? []);
      const { data: cs } = await supabase.from<Course>('courses').select('id,name').order('name', { ascending: true });
      setCourses(cs ?? []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!courseId) return setTees([]);
      const { data: ts } = await supabase.from<Tee>('course_tees').select('id,tee_name').eq('course_id', courseId).order('tee_name');
      setTees(ts ?? []);
    })();
  }, [courseId]);

  async function startRound() {
    setErr('');
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) { setErr('You must be logged in.'); return; }

    // Ensure you have a Player linked or create one quickly
    let playerId: string | null = null;
    {
      const { data: p } = await supabase.from('players').select('id').eq('user_id', user.user.id).maybeSingle();
      if (p?.id) playerId = p.id;
      else {
        const { data: created, error: e } = await supabase.from('players').insert({ display_name: user.user.email?.split('@')[0] ?? 'Player' }).select('id').single();
        if (e || !created) { setErr(e?.message ?? 'Failed to create player'); return; }
        playerId = created.id;
      }
    }

    const { data: r, error } = await supabase.from('rounds')
      .insert({ player_id: playerId, team_id: teamId || null, course_id: courseId || null, course_tee_id: teeId || null, status: 'in_progress' })
      .select('id')
      .single();
    if (error || !r) { setErr(error?.message ?? 'Failed to start round'); return; }
    setRoundId(r.id);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Start / Resume Round</h1>

      {err && <div className="rounded border border-red-200 bg-red-50 p-2 text-red-700">{err}</div>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <div className="mb-1 text-sm text-gray-600">Team (optional)</div>
          <select className="w-full rounded border px-2 py-2" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">—</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <div className="mb-1 text-sm text-gray-600">Course</div>
          <select className="w-full rounded border px-2 py-2" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">—</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name ?? '(unnamed)'}</option>)}
          </select>
        </div>
        <div>
          <div className="mb-1 text-sm text-gray-600">Tee</div>
          <select className="w-full rounded border px-2 py-2" value={teeId} onChange={(e) => setTeeId(e.target.value)} disabled={!courseId}>
            <option value="">—</option>
            {tees.map(t => <option key={t.id} value={t.id}>{t.tee_name ?? '(tee)'}</option>)}
          </select>
        </div>
      </div>

      <button className="rounded bg-[#0033A0] px-4 py-2 text-white" onClick={startRound}>Start Round</button>

      {roundId && (
        <div className="text-sm">
          Round created:&nbsp;
          <Link className="underline" href={`/rounds/${roundId}/holes/1`}>Go to Hole 1</Link>
        </div>
      )}
    </div>
  );
}

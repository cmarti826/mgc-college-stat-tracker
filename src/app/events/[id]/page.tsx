'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type Row = { event_id: string; player_id: string; display_name: string | null; rounds_played: number; strokes: number; to_par: number; event_name: string | null; };

export default function EventLeaderboard({ params }: { params: { id: string } }) {
  const eventId = params.id;
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState('');

  async function load() {
    const { data, error } = await supabase
      .from<Row>('v_event_leaderboard')
      .select('*')
      .eq('event_id', eventId)
      .order('strokes', { ascending: true });
    if (error) setErr(error.message);
    setRows(data ?? []);
  }

  useEffect(() => {
    load();
    const ch = supabase.channel(`evt-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round_holes' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rounds' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_entries', filter: `event_id=eq.${eventId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [eventId]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Leaderboard</h1>
        <Link href={`/events/${eventId}/manage`} className="underline">Manage</Link>
      </div>
      {err && <div className="rounded border border-red-200 bg-red-50 p-2 text-red-700">{err}</div>}
      <div className="rounded border bg-white">
        <div className="grid grid-cols-6 gap-2 border-b px-3 py-2 text-sm font-medium">
          <div>#</div><div>Player</div><div>Rounds</div><div>Strokes</div><div>To Par</div><div>Open</div>
        </div>
        {rows.map((r, i) => (
          <div key={r.player_id} className="grid grid-cols-6 items-center gap-2 border-t px-3 py-2 text-sm">
            <div>{i + 1}</div>
            <div>{r.display_name ?? '(player)'}</div>
            <div>{r.rounds_played}</div>
            <div>{r.strokes}</div>
            <div>{r.to_par}</div>
            <div><Link className="underline" href={`/players/${r.player_id}`}>Player</Link></div>
          </div>
        ))}
        {rows.length === 0 && <div className="px-3 py-3 text-sm text-gray-600">No entries yet.</div>}
      </div>
    </div>
  );
}

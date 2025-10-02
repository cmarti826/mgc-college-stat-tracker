'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type Player = { id: string; display_name: string | null; graduation_year: number | null };
type PR = { id: string; status: string | null; strokes: number | null; to_par: number | null; start_time: string | null; event_name: string | null };

export default function PlayerById({ params }: { params: { id: string } }) {
  const playerId = params.id;
  const [p, setP] = useState<Player | null>(null);
  const [rounds, setRounds] = useState<PR[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      const { data: player, error: ep } = await supabase.from<Player>('players').select('id,display_name,graduation_year').eq('id', playerId).single();
      if (ep) setErr(ep.message);
      setP(player ?? null);

      const { data: r, error: er } = await supabase
        .from('v_player_rounds')
        .select('round_id:id,status,strokes,to_par,start_time,event_name')
        .eq('player_id', playerId)
        .order('round_id', { ascending: false })
        .limit(25);
      if (er) setErr((prev) => prev || er.message);
      setRounds((r as PR[] | null) ?? []);
    })();
  }, [playerId]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{p?.display_name ?? 'Player'} {p?.graduation_year ? `(${p.graduation_year})` : ''}</h1>
        <Link className="rounded border px-3 py-1 hover:bg-gray-50" href="/events">Events</Link>
      </div>

      {err && <div className="rounded border border-red-200 bg-red-50 p-2 text-red-700">{err}</div>}

      <div className="rounded border bg-white">
        <div className="grid grid-cols-12 gap-2 border-b px-3 py-2 text-sm font-medium">
          <div className="col-span-4">Round</div><div className="col-span-3">Event</div><div className="col-span-2">Strokes</div><div className="col-span-1">To Par</div><div className="col-span-2">Started</div>
        </div>
        {rounds.map(r => (
          <div key={r.id} className="grid grid-cols-12 items-center gap-2 border-t px-3 py-2 text-sm">
            <div className="col-span-4">
              <div className="font-medium">{r.status ?? '—'}</div>
              <div className="space-x-2 text-xs">
                <Link className="underline" href={`/rounds/${r.id}`}>Round Page</Link>
                <Link className="underline" href={`/rounds/${r.id}/holes/1`}>Open Hole 1</Link>
              </div>
            </div>
            <div className="col-span-3">{r.event_name ?? ''}</div>
            <div className="col-span-2">{r.strokes ?? 0}</div>
            <div className="col-span-1">{r.to_par ?? 0}</div>
            <div className="col-span-2">{r.start_time ? new Date(r.start_time).toLocaleString() : ''}</div>
          </div>
        ))}
        {rounds.length === 0 && <div className="px-3 py-3 text-sm text-gray-600">No rounds yet.</div>}
      </div>
    </div>
  );
}

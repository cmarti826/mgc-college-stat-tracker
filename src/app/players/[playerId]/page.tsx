'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

type PlayerRow = {
  id: string;
  display_name: string | null;
  graduation_year: number | null;
};

type PlayerRoundLite = {
  id: string;                 // aliased from round_id
  status: string | null;
  strokes: number | null;
  to_par: number | null;
  start_time: string | null;
  event_name: string | null;
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

function fmtDate(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}

export default function PlayerPage({
  params,
}: {
  params: { playerId: string };
}) {
  const playerId = params.playerId;

  const [err, setErr] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const [player, setPlayer] = useState<PlayerRow | null>(null);
  const [rounds, setRounds] = useState<PlayerRoundLite[]>([]);

  useEffect(() => {
    (async () => {
      setErr('');
      setLoading(true);

      // Player
      const { data: p, error: ep } = await supabase
        .from<PlayerRow>('players')
        .select('id,display_name,graduation_year')
        .eq('id', playerId)
        .single();

      if (ep) {
        setErr(ep.message);
        setPlayer(null);
      } else {
        setPlayer(p);
      }

      // Rounds for this player
      const { data: r, error: er } = await supabase
        .from<PlayerRoundLite>('v_player_rounds')
        //           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        // NOTE: alias round_id => id so UI can use .id normally
        .select('round_id:id,status,strokes,to_par,start_time,event_name')
        .eq('player_id', playerId)
        .order('round_id', { ascending: false }) // order by real column name
        .limit(25);

      if (er) {
        setErr((prev) => prev || er.message);
        setRounds([]);
      } else {
        setRounds(r ?? []);
      }

      setLoading(false);
    })();
  }, [playerId]);

  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {player?.display_name ?? 'Player'}{' '}
          {player?.graduation_year ? (
            <span className="text-gray-500">({player.graduation_year})</span>
          ) : null}
        </h1>
        <div className="space-x-2">
          <Link className="rounded border px-3 py-1 hover:bg-gray-50" href="/events">
            Events
          </Link>
          <Link className="rounded border px-3 py-1 hover:bg-gray-50" href="/admin/roster">
            Roster
          </Link>
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-red-800">
          {err}
        </div>
      )}

      <div className="rounded border bg-white">
        <div className="grid grid-cols-12 gap-2 border-b px-3 py-2 text-sm font-medium">
          <div className="col-span-4">Round</div>
          <div className="col-span-3">Event</div>
          <div className="col-span-2">Strokes</div>
          <div className="col-span-1">To Par</div>
          <div className="col-span-2">Started</div>
        </div>

        {loading && <div className="px-3 py-3 text-sm text-gray-600">Loading…</div>}

        {!loading && rounds.length === 0 && (
          <div className="px-3 py-3 text-sm text-gray-600">No rounds yet.</div>
        )}

        {rounds.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-12 items-center gap-2 border-t px-3 py-2 text-sm"
          >
            <div className="col-span-4">
              <div className="font-medium text-gray-800">
                {r.status ?? '—'}
              </div>
              <div className="space-x-2 text-xs">
                <Link
                  href={`/rounds/${r.id}`}
                  className="text-[#0033A0] underline"
                >
                  Round Page
                </Link>
                <Link
                  href={`/rounds/${r.id}/holes/1`}
                  className="text-[#0033A0] underline"
                >
                  Open Hole 1
                </Link>
              </div>
            </div>
            <div className="col-span-3">{r.event_name ?? ''}</div>
            <div className="col-span-2">{r.strokes ?? 0}</div>
            <div className="col-span-1">{r.to_par ?? 0}</div>
            <div className="col-span-2">{fmtDate(r.start_time)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

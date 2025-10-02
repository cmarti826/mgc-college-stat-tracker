'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type EventRow = {
  id: string; team_id: string; name: string; type: 'qualifying'|'tournament'|'practice';
  status: 'draft'|'live'|'final'; start_date: string | null; end_date: string | null;
};

export default function EventsPage() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from<EventRow>('events')
        .select('id,team_id,name,type,status,start_date,end_date')
        .order('start_date', { ascending: false });
      if (error) setErr(error.message);
      setRows(data ?? []);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Events</h1>
        <Link className="rounded border px-3 py-1 hover:bg-gray-50" href="/admin/team">Team Settings</Link>
      </div>
      {err && <div className="rounded border border-red-200 bg-red-50 p-2 text-red-700">{err}</div>}
      <ul className="space-y-2">
        {rows.map(e => (
          <li key={e.id} className="rounded border bg-white p-3">
            <div className="font-medium">
              <Link href={`/events/${e.id}`} className="text-[#0033A0] underline">{e.name}</Link>
            </div>
            <div className="text-sm text-gray-600">{e.type} • {e.status} • {[e.start_date ?? '', e.end_date ?? ''].filter(Boolean).join(' → ')}</div>
            <div className="mt-2 space-x-3 text-sm">
              <Link href={`/events/${e.id}`} className="underline">Leaderboard</Link>
              <Link href={`/events/${e.id}/manage`} className="underline">Manage</Link>
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-gray-600">No events yet.</li>}
      </ul>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type EventRow = { id: string; team_id: string; name: string; type: string; status: string; start_date: string | null; end_date: string | null; };
type Player = { id: string; display_name: string | null };
type Entry = { event_id: string; player_id: string };

export default function ManageEvent({ params }: { params: { id: string } }) {
  const eventId = params.id;
  const [event, setEvent] = useState<EventRow | null>(null);
  const [roster, setRoster] = useState<Player[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pick, setPick] = useState<string>('');
  const [err, setErr] = useState('');

  async function loadAll() {
    setErr('');
    const { data: e, error: ee } = await supabase.from<EventRow>('events')
      .select('id,team_id,name,type,status,start_date,end_date').eq('id', eventId).single();
    if (ee) { setErr(ee.message); return; }
    setEvent(e);

    const { data: en } = await supabase.from<Entry>('event_entries').select('*').eq('event_id', eventId);
    setEntries(en ?? []);

    const { data: rosterRows } = await supabase
      .from('team_roster')
      .select('player_id, players!inner(id, display_name)')
      .eq('team_id', e.team_id);
    const players = (rosterRows ?? []).map((r: any) => ({ id: r.players.id as string, display_name: r.players.display_name as string | null }));
    setRoster(players);
  }

  useEffect(() => { loadAll(); }, [eventId]);

  async function addEntry() {
    if (!pick) return;
    const { error } = await supabase.from('event_entries').insert({ event_id: eventId, player_id: pick });
    if (error) setErr(error.message);
    await loadAll();
  }

  async function removeEntry(pid: string) {
    const { error } = await supabase.from('event_entries').delete().eq('event_id', eventId).eq('player_id', pid);
    if (error) setErr(error.message);
    await loadAll();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Manage Event</h1>
        <Link className="underline" href={`/events/${eventId}`}>Leaderboard</Link>
      </div>
      {event && (
        <div className="rounded border bg-white p-3 text-sm">
          <div className="font-medium">{event.name}</div>
          <div className="text-gray-600">{event.type} • {event.status} • {[event.start_date ?? '', event.end_date ?? ''].filter(Boolean).join(' → ')}</div>
        </div>
      )}

      <div className="rounded border bg-white p-3">
        <div className="mb-2 font-medium">Entries</div>
        <div className="mb-3 flex gap-2">
          <select className="rounded border px-2 py-1" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Select player…</option>
            {roster.map(p => <option key={p.id} value={p.id}>{p.display_name ?? '(player)'}</option>)}
          </select>
          <button className="rounded bg-[#0033A0] px-3 py-1 text-white" onClick={addEntry}>Add</button>
        </div>
        <ul className="space-y-1 text-sm">
          {entries.map(en => {
            const pl = roster.find(r => r.id === en.player_id);
            return (
              <li key={en.player_id} className="flex items-center justify-between rounded border px-2 py-1">
                <div>{pl?.display_name ?? en.player_id}</div>
                <button className="rounded border px-2 py-1 hover:bg-gray-50" onClick={() => removeEntry(en.player_id)}>Remove</button>
              </li>
            );
          })}
          {entries.length === 0 && <li className="text-gray-600">No entries yet.</li>}
        </ul>
      </div>

      {err && <div className="rounded border border-red-200 bg-red-50 p-2 text-red-700">{err}</div>}
    </div>
  );
}

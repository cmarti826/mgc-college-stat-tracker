'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Row = { round_id:string; player_id:string; display_name:string; strokes:number|null; to_par:number|null }

export default function EventLivePage() {
  const { eventId } = useParams<{eventId:string}>()
  const [rows, setRows] = useState<Row[]>([])
  const [err, setErr] = useState<string|null>(null)
  const roundIdsRef = useRef<string[]>([])

  const load = async () => {
    setErr(null)
    const { data, error } = await supabase
      .from('v_event_leaderboard')
      .select('round_id,player_id,display_name,strokes,to_par')
      .eq('event_id', eventId)
    if (error) { setErr(error.message); return }
    setRows((data ?? []) as Row[])
    // keep round ids for realtime filter
    roundIdsRef.current = (data ?? []).map((r:any) => r.round_id)
  }

  useEffect(() => { load() }, [eventId])

  useEffect(() => {
    // subscribe to round_holes for each round in this event
    const ch = supabase.channel(`live_event_${eventId}`)
    // broad subscription: any round_holes change -> refresh (simple & robust)
    ch.on('postgres_changes',
      { event: '*', schema: 'public', table: 'round_holes' },
      () => load()
    )
    // also watch round status changes
    ch.on('postgres_changes',
      { event: '*', schema: 'public', table: 'rounds', filter: `event_id=eq.${eventId}` },
      () => load()
    )
    ch.subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [eventId])

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-bold">Live Leaderboard</h1>
        <button onClick={load} className="rounded border px-3 py-1.5">Refresh</button>
      </div>
      {err && <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{err}</div>}
      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Player</th>
              <th className="px-3 py-2 text-right">Strokes</th>
              <th className="px-3 py-2 text-right">To Par</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .slice() // sort client-side
              .sort((a,b) => (a.to_par ?? 999) - (b.to_par ?? 999) || (a.strokes ?? 0) - (b.strokes ?? 0))
              .map(r => (
                <tr key={r.round_id} className="border-t">
                  <td className="px-3 py-2">{r.display_name}</td>
                  <td className="px-3 py-2 text-right">{r.strokes ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{r.to_par!=null ? (r.to_par>0?`+${r.to_par}`:r.to_par) : '—'}</td>
                </tr>
              ))}
            {!rows.length && <tr><td className="px-3 py-4 text-gray-600" colSpan={3}>No scores yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

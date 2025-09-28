'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Row = { display_name: string; strokes: number | null; to_par: number | null }

export default function EventLeaderboardPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [rows, setRows] = useState<Row[]>([])
  const [err, setErr] = useState<string|null>(null)

  const load = async () => {
    setErr(null)
    const { data, error } = await supabase
      .from('v_event_leaderboard')
      .select('display_name,strokes,to_par')
      .eq('event_id', eventId)
      .order('to_par', { ascending: true })
      .order('strokes', { ascending: true })
    if (error) setErr(error.message)
    else setRows((data ?? []) as Row[])
  }

  useEffect(() => { load() }, [eventId])

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <button onClick={load} className="rounded bg-[#0033A0] px-3 py-1.5 text-white">Refresh</button>
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
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-2">{r.display_name}</td>
                <td className="px-3 py-2 text-right">{r.strokes ?? '—'}</td>
                <td className="px-3 py-2 text-right">{r.to_par! > 0 ? `+${r.to_par}` : r.to_par ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

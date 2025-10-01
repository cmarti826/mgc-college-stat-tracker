'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type EventType = 'qualifying'|'tournament'|'practice'
type EventStatus = 'draft'|'live'|'final'
type EventRow = {
  id: string
  team_id: string
  name: string
  type: EventType
  status: EventStatus
  start_date: string | null
  end_date: string | null
}

export default function HomePage() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      setErr(null)
      // Grab recent events across teams the user can see
      const { data, error } = await supabase
        .from('events')
        .select('id,team_id,name,type,status,start_date,end_date')
        .order('start_date', { ascending: false })
        .limit(10)
      if (error) { setErr(error.message); return }
      setEvents((data ?? []) as EventRow[])
    })()
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Welcome to MGC College Golf</h1>

      {err && <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{err}</div>}

      <div className="rounded border bg-white">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="font-semibold">Recent Events</div>
          <Link prefetch={false} className="text-sm underline" href="/events">All Events</Link>
        </div>
        <div className="divide-y">
          {events.length ? events.map(e => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
              <div>
                <div className="font-medium">
                  <Link prefetch={false} href={`/events/${e.id}`} className="text-[#0033A0] underline">
                    {e.name}
                  </Link>
                </div>
                <div className="text-xs text-gray-600">
                  {e.type} • {e.status} • {formatRange(e.start_date, e.end_date)}
                </div>
              </div>
              <div className="flex gap-3 text-sm">
                <Link prefetch={false} href={`/events/${e.id}`} className="underline">Leaderboard</Link>
                <Link prefetch={false} href={`/events/${e.id}/manage`} className="underline">Manage</Link>
              </div>
            </div>
          )) : (
            <div className="px-3 py-4 text-sm text-gray-600">No events yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatRange(a: string | null, b: string | null) {
  if (!a && !b) return '—'
  if (a && !b) return a
  if (!a && b) return b
  return a === b ? a : `${a} → ${b}`
}

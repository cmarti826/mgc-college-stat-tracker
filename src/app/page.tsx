'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabaseClient'

type RoundStatus = 'in_progress' | 'submitted' | 'final' | 'abandoned'

type VPlayerRound = {
  id: string              // alias of round_id
  round_id: string
  status: RoundStatus
  strokes: number | null
  to_par: number | null
  display_name: string | null
  event_name: string | null
  start_time: string | null
}

export default function HomePage(): JSX.Element {
  const supabase = createClient()
  const [session, setSession] = useState<Session | null>(null)
  const [rounds, setRounds] = useState<VPlayerRound[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    // keep a local session (useful for debugging login state)
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))

    const load = async () => {
      setLoading(true)
      setErr(null)

      // IMPORTANT: alias syntax is alias:column
      const { data, error } = await supabase
        .from('v_player_rounds')
        .select('id:round_id, round_id, status, strokes, to_par, display_name, event_name, start_time')
        .order('start_time', { ascending: false })
        .limit(8)

      if (error) {
        console.error('home rounds error', error)
        setErr(error.message || 'Failed to load rounds')
      } else {
        setRounds(data ?? [])
      }
      setLoading(false)
    }

    load()
    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [supabase])

  return (
    <div className="mx-auto max-w-5xl p-4 space-y-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="text-sm text-gray-600">
        {session ? <>Logged in as <strong>{session.user.email}</strong></> : <>Not logged in</>}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium">Your recent rounds</h2>
          <Link href="/events" className="text-[#0033A0] underline">All events</Link>
        </div>

        {loading && <div className="text-gray-500">Loading...</div>}
        {err && <div className="text-red-600">Error: {err}</div>}

        {!loading && !err && (
          <ul className="grid gap-3 md:grid-cols-2">
            {rounds.map((r) => (
              <li key={r.id} className="rounded border bg-white p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">
                    <Link href={`/rounds/${r.id}`} className="text-[#0033A0] underline">
                      {r.event_name || 'Unassigned event'}
                    </Link>
                  </div>
                  <span className="text-xs rounded px-2 py-0.5 border">
                    {r.status}
                  </span>
                </div>

                <div className="text-sm text-gray-600">
                  {r.display_name || 'Player'} • {r.start_time ? new Date(r.start_time).toLocaleString() : '-'}
                </div>

                <div className="mt-2 text-sm">
                  {r.strokes ?? '-'} strokes · {formatToPar(r.to_par)}
                </div>

                <div className="mt-2">
                  <Link href={`/rounds/${r.id}/holes/1`} className="text-sm text-[#0076ff] underline">
                    Open scoring
                  </Link>
                </div>
              </li>
            ))}
            {rounds.length === 0 && <li className="text-gray-600">No rounds yet.</li>}
          </ul>
        )}
      </section>
    </div>
  )
}

function formatToPar(tp: number | null): string {
  if (tp === null || tp === undefined) return 'E'
  if (tp === 0) return 'E'
  return tp > 0 ? `+${tp}` : `${tp}`
}

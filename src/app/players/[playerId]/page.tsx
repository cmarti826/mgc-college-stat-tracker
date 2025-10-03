'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'

type RoundStatus = 'in_progress' | 'submitted' | 'final' | 'abandoned'

type Player = {
  id: string
  display_name: string
  graduation_year: number | null
}

type VPlayerRound = {
  id: string            // alias of round_id
  status: RoundStatus
  strokes: number | null
  to_par: number | null
  event_name: string | null
  start_time: string | null
}

export default function PlayerPage({ params }: { params: { playerId: string } }) {
  const supabase = createClient()
  const [player, setPlayer] = useState<Player | null>(null)
  const [rounds, setRounds] = useState<VPlayerRound[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setErr(null)

      const [{ data: p, error: pe }, { data: r, error: re }] = await Promise.all([
        supabase.from('players')
          .select('id, display_name, graduation_year')
          .eq('id', params.playerId)
          .single(),
        supabase.from('v_player_rounds')
          .select('id:round_id, status, strokes, to_par, event_name, start_time')
          .eq('player_id', params.playerId)
          .order('start_time', { ascending: false })
      ])

      if (pe) {
        console.error(pe); setErr(pe.message || 'Failed to load player')
      } else {
        setPlayer(p)
      }
      if (re) {
        console.error(re); setErr(prev => prev ?? re.message || 'Failed to load rounds')
      } else {
        setRounds(r ?? [])
      }
      setLoading(false)
    }
    load()
  }, [params.playerId, supabase])

  if (loading) return <div className="p-4">Loading…</div>
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>
  if (!player) return <div className="p-4">Player not found.</div>

  return (
    <div className="mx-auto max-w-5xl p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{player.display_name}</h1>
        <div className="text-gray-600">Grad year: {player.graduation_year ?? '—'}</div>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Rounds</h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {rounds.map(r => (
            <li key={r.id} className="rounded border bg-white p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">
                  <Link href={`/rounds/${r.id}`} className="text-[#0033A0] underline">
                    {r.event_name || 'Unassigned event'}
                  </Link>
                </div>
                <span className="text-xs rounded px-2 py-0.5 border">{r.status}</span>
              </div>
              <div className="text-sm text-gray-600">{r.start_time ? new Date(r.start_time).toLocaleString() : '—'}</div>
              <div className="mt-2 text-sm">
                {r.strokes ?? '—'} strokes &middot; {formatToPar(r.to_par)}
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
      </section>
    </div>
  )
}

function formatToPar(tp: number | null) {
  if (tp === null || tp === undefined) return 'E'
  if (tp === 0) return 'E'
  return tp > 0 ? `+${tp}` : `${tp}`
}

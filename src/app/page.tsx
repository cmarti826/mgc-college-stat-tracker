'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type UserLite = { id: string; email?: string | null }
type EventRow = { id: string; name: string; start_date: string | null; status: string }
type RoundRow = { id: string; status: string; start_time: string | null }

export default function HomePage() {
  const [user, setUser] = useState<UserLite | null>(null)
  const [loading, setLoading] = useState(true)

  const [events, setEvents] = useState<EventRow[]>([])
  const [rounds, setRounds] = useState<RoundRow[]>([])

  useEffect(() => {
    let mounted = true

    const load = async () => {
      const { data, error } = await supabase.auth.getUser()
      const u = error ? null : (data.user ? { id: data.user.id, email: data.user.email } : null)
      if (!mounted) return
      setUser(u)
      setLoading(false)

      // Recent events the user can see (RLS-safe; ignore errors)
      if (u) {
        const { data: ev } = await supabase
          .from('events')
          .select('id,name,start_date,status')
          .order('start_date', { ascending: false })
          .limit(5)
        setEvents(((ev ?? []) as any[]).map(r => ({
          id: r.id, name: r.name, start_date: r.start_date, status: r.status
        })))

        // In-progress rounds (RLS-safe; ignore errors)
        const { data: rd } = await supabase
          .from('rounds')
          .select('id,status,start_time')
          .eq('status', 'in_progress')
          .order('start_time', { ascending: false })
          .limit(5)
        setRounds(((rd ?? []) as any[]).map(r => ({
          id: r.id, status: r.status, start_time: r.start_time
        })))
      }
    }

    load()
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null)
    })

    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [])

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="rounded border bg-white p-6">
        <h1 className="text-2xl font-bold text-[#0033A0]">MGC College Golf Stat Tracker</h1>
        <p className="mt-1 text-sm text-gray-700">
          Log rounds and shots, compute Strokes Gained, manage events, and view reports.
        </p>
        {!loading && !user && (
          <div className="mt-3">
            <Link href="/login" className="rounded bg-[#0033A0] px-4 py-2 text-white">Login</Link>
          </div>
        )}
        {!loading && user && (
          <div className="mt-2 text-xs text-gray-600">Signed in as <b>{user.email}</b></div>
        )}
      </section>

      {/* Quick Links */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <CardLink href="/courses" title="Courses" desc="Add courses, tees, pars & yardages." />
        <CardLink href="/stats" title="Stats" desc="Start a round or continue scoring." />
        <CardLink href="/events" title="Events" desc="Create, manage, and view leaderboards." />
        <CardLink href="/reports/team" title="Reports" desc="Team rollups and player reports." />
        <CardLink href="/admin/team" title="Team Settings" desc="Set SG model & team options." />
        <CardLink href="/admin/roster" title="Roster" desc="Add players, emails, and join codes." />
      </section>

      {/* Signed-in tiles */}
      {user && (
        <section className="grid gap-4 lg:grid-cols-2">
          {/* Recent Events */}
          <div className="rounded border bg-white">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <h2 className="font-semibold">Recent Events</h2>
              <Link href="/events" className="text-sm underline">All events</Link>
            </div>
            <div className="divide-y">
              {events.length ? events.map(e => (
                <div key={e.id} className="flex items-center justify-between px-3 py-2">
                  <div>
                    <div className="font-medium">
                      <Link href={`/events/${e.id}/manage`} className="text-[#0033A0] underline">{e.name}</Link>
                    </div>
                    <div className="text-xs text-gray-600">{e.start_date ?? '—'} • {e.status}</div>
                  </div>
                  <Link href={`/events/${e.id}`} className="text-sm underline">Leaderboard</Link>
                </div>
              )) : (
                <div className="px-3 py-4 text-sm text-gray-600">No events yet.</div>
              )}
            </div>
          </div>

          {/* In-progress Rounds */}
          <div className="rounded border bg-white">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <h2 className="font-semibold">In-Progress Rounds</h2>
              <Link href="/stats" className="text-sm underline">Go to Stats</Link>
            </div>
            <div className="divide-y">
              {rounds.length ? rounds.map(r => (
                <div key={r.id} className="flex items-center justify-between px-3 py-2">
                  <div>
                    <div className="font-medium">Round {shortId(r.id)}</div>
                    <div className="text-xs text-gray-600">{r.start_time?.slice(0, 19).replace('T', ' ') ?? '—'} • {r.status}</div>
                  </div>
                  <Link href={`/rounds/${r.id}`} className="text-sm underline text-[#0B6B3A]">Open</Link>
                </div>
              )) : (
                <div className="px-3 py-4 text-sm text-gray-600">No rounds in progress.</div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function CardLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="block rounded border bg-white p-4 hover:shadow-sm">
      <div className="text-lg font-semibold">{title}</div>
      <div className="text-sm text-gray-600">{desc}</div>
    </Link>
  )
}
function shortId(id: string) {
  return id?.split('-')[0] ?? id
}

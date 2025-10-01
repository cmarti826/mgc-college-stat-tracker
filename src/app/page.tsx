'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type EventType = 'qualifying' | 'tournament' | 'practice'
type EventStatus = 'draft' | 'live' | 'final'

type PlayerRow = { id: string; display_name: string }
type RoundRow = {
  id: string
  player_id: string | null
  team_id: string | null
  event_id: string | null
  course_id: string | null
  course_tee_id: string | null
  status: string
  start_time: string | null
}
type RoundHoleRow = { hole_number: number }
type VRoundTotal = { round_id: string; strokes: number | null; to_par: number | null }
type CourseRow = { id: string; name: string | null; city: string | null; state: string | null }
type TeeRow = { id: string; tee_name: string | null; color: string | null; course_rating: number | null; slope_rating: number | null }
type TeamRow = { id: string; name: string }
type TeamMemberRow = { team_id: string; role: string }
type EventRow = {
  id: string
  team_id: string
  name: string
  type: EventType
  status: EventStatus
  start_date: string | null
  end_date: string | null
  course_id: string | null
  course_tee_id: string | null
}

export default function HomePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [player, setPlayer] = useState<PlayerRow | null>(null)

  const [activeRound, setActiveRound] = useState<RoundRow | null>(null)
  const [activeCourse, setActiveCourse] = useState<CourseRow | null>(null)
  const [activeTee, setActiveTee] = useState<TeeRow | null>(null)
  const [nextHole, setNextHole] = useState<number>(1)

  const [recent, setRecent] = useState<Array<RoundRow & { total?: VRoundTotal }>>([])

  const [teams, setTeams] = useState<TeamRow[]>([])
  const [latestEvent, setLatestEvent] = useState<EventRow | null>(null)

  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: u } = await supabase.auth.getUser()
      const uid = u?.user?.id ?? null
      if (cancelled) return
      setUserId(uid)
      if (!uid) return

      const { data: p } = await supabase
        .from('players')
        .select('id,display_name')
        .eq('user_id', uid)
        .maybeSingle()
      if (cancelled) return
      if (p) setPlayer(p as PlayerRow)

      await Promise.all([
        loadActiveRound(p?.id ?? null, setActiveRound, setActiveCourse, setActiveTee, setNextHole, setErr),
        loadRecentRounds(p?.id ?? null, setRecent, setErr),
        loadTeamsAndLatestEvent(uid, setTeams, setLatestEvent, setErr),
      ])
    })()
    return () => { cancelled = true }
  }, [])

  const coachTeams = useMemo(() => teams, [teams])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link prefetch={false} className="rounded border px-3 py-1.5" href="/events">Events</Link>
          <Link prefetch={false} className="rounded border px-3 py-1.5" href="/stats">Start / Resume Round</Link>
          <Link prefetch={false} className="rounded border px-3 py-1.5" href="/reports/team">Team Reports</Link>
          <Link prefetch={false} className="rounded border px-3 py-1.5" href="/admin/team">Admin</Link>
        </div>
      </div>

      {err && <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{err}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        {/* My Active Round */}
        <div className="rounded border bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-semibold">My Active Round</div>
            {activeRound && (
              <Link prefetch={false} className="text-sm underline" href={`/rounds/${activeRound.id}`}>
                Round Page
              </Link>
            )}
          </div>
          {activeRound ? (
            <>
              <div className="text-sm text-gray-700">
                {activeCourse?.name ?? 'Course'}
                {activeCourse?.city || activeCourse?.state ? (
                  <> • {[activeCourse?.city ?? '', activeCourse?.state ?? ''].filter(Boolean).join(', ')}</>
                ) : null}
              </div>
              <div className="text-xs text-gray-600">
                Tee: {activeTee?.tee_name ?? '—'}
                {activeTee?.color ? (
                  <span className="ml-1 inline-block h-3 w-3 rounded-full border align-middle" style={{ backgroundColor: activeTee.color ?? undefined }} />
                ) : null}
                {activeTee?.course_rating ? <> • {String(activeTee.course_rating)}/{String(activeTee.slope_rating ?? '—')}</> : null}
              </div>
              <div className="mt-3 flex gap-2">
                <Link prefetch={false} className="rounded bg-[#0B6B3A] px-4 py-2 text-white" href={`/rounds/${activeRound.id}/holes/${nextHole}`}>
                  Resume on Hole {nextHole}
                </Link>
                <Link prefetch={false} className="rounded border px-4 py-2" href={`/rounds/${activeRound.id}`}>
                  Details
                </Link>
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-700">
              No in-progress round.
              <div className="mt-2">
                <Link prefetch={false} className="underline" href="/stats">Start a round</Link>
              </div>
            </div>
          )}
        </div>

        {/* Latest Event */}
        <div className="rounded border bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-semibold">Latest Event</div>
            <Link prefetch={false} className="text-sm underline" href="/events">All Events</Link>
          </div>
          {latestEvent ? (
            <>
              <div className="font-medium">
                <Link prefetch={false} href={`/events/${latestEvent.id}`} className="text-[#0033A0] underline">
                  {latestEvent.name}
                </Link>
              </div>
              <div className="text-xs text-gray-600">
                {latestEvent.type} • {latestEvent.status} • {formatRange(latestEvent.start_date, latestEvent.end_date)}
              </div>
              <div className="mt-3 flex gap-2 text-sm">
                <Link prefetch={false} className="underline" href={`/events/${latestEvent.id}`}>Leaderboard</Link>
                <Link prefetch={false} className="underline" href={`/events/${latestEvent.id}/manage`}>Manage</Link>
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-700">No events yet.</div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Rounds */}
        <div className="rounded border bg-white">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="font-semibold">Recent Rounds {player ? `• ${player.display_name}` : ''}</div>
            {player && (
              <Link prefetch={false} className="text-sm underline" href={`/players/${player.id}`}>
                Player Page
              </Link>
            )}
          </div>
          <div className="divide-y">
            {recent.length ? recent.map(r => (
              <div key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate">{r.start_time ? r.start_time.slice(0, 10) : '—'} • {r.status}</div>
                  <div className="text-xs text-gray-600">
                    {r.total?.strokes != null ? `${r.total.strokes} strokes` : '—'} {r.total?.to_par != null ? `• ${fmtPar(r.total.to_par)}` : ''}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link prefetch={false} href={`/rounds/${r.id}`} className="underline">Open</Link>
                  <Link prefetch={false} href={`/rounds/${r.id}/holes/1`} className="underline">Hole 1</Link>
                </div>
              </div>
            )) : (
              <div className="px-3 py-4 text-sm text-gray-600">No rounds yet.</div>
            )}
          </div>
        </div>

        {/* Team events */}
        <div className="rounded border bg-white">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="font-semibold">My Teams & Events</div>
            <Link prefetch={false} className="text-sm underline" href="/admin/team">Team Settings</Link>
          </div>
          <TeamEventsBlock coachTeams={coachTeams} />
        </div>
      </div>
    </div>
  )
}

/** Safe range formatter that ALWAYS returns a string. */
function formatRange(a: string | null, b: string | null): string {
  const sa = a ?? ''
  const sb = b ?? ''
  if (!sa && !sb) return '—'
  if (sa && !sb) return sa
  if (!sa && sb) return sb
  return sa === sb ? sa : (sa + ' → ' + sb)
}

/** Safe to-par formatter that ALWAYS returns a string. */
function fmtPar(v: number | null | undefined): string {
  return v == null ? '—' : (v > 0 ? ('+' + String(v)) : String(v))
}

async function loadActiveRound(
  playerId: string | null,
  setActiveRound: (r: RoundRow | null) => void,
  setActiveCourse: (c: CourseRow | null) => void,
  setActiveTee: (t: TeeRow | null) => void,
  setNextHole: (n: number) => void,
  setErr: (e: string | null) => void
) {
  try {
    if (!playerId) { setActiveRound(null); return }
    const { data: r } = await supabase
      .from('rounds')
      .select('id,player_id,team_id,event_id,course_id,course_tee_id,status,start_time')
      .eq('player_id', playerId)
      .eq('status', 'in_progress')
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle()
    const round = (r ?? null) as RoundRow | null
    setActiveRound(round)

    if (round?.course_id) {
      const { data: c } = await supabase
        .from('courses')
        .select('id,name,city,state')
        .eq('id', round.course_id)
        .maybeSingle()
      setActiveCourse((c ?? null) as CourseRow | null)
    } else setActiveCourse(null)

    if (round?.course_tee_id) {
      const { data: t } = await supabase
        .from('course_tees')
        .select('id,tee_name,color,course_rating,slope_rating')
        .eq('id', round.course_tee_id)
        .maybeSingle()
      setActiveTee((t ?? null) as TeeRow | null)
    } else setActiveTee(null)

    if (round) {
      const { data: h } = await supabase
        .from('round_holes')
        .select('hole_number')
        .eq('round_id', round.id)
        .order('hole_number', { ascending: false })
        .limit(1)
        .maybeSingle()
      const last = (h ?? null) as RoundHoleRow | null
      setNextHole(Math.min(18, (last?.hole_number ?? 0) + 1))
    } else {
      setNextHole(1)
    }
  } catch (e) {
    setErr(e instanceof Error ? e.message : 'Failed to load active round')
  }
}

async function loadRecentRounds(
  playerId: string | null,
  setRecent: (rows: Array<RoundRow & { total?: VRoundTotal }>) => void,
  setErr: (e: string | null) => void
) {
  try {
    if (!playerId) { setRecent([]); return }
    const { data: rd } = await supabase
      .from('rounds')
      .select('id,player_id,team_id,event_id,course_id,course_tee_id,status,start_time')
      .eq('player_id', playerId)
      .order('start_time', { ascending: false })
      .limit(5)
    const rounds = (rd ?? []) as RoundRow[]
    if (!rounds.length) { setRecent([]); return }

    const ids = rounds.map(r => r.id)
    const { data: vt } = await supabase
      .from('v_round_totals')
      .select('round_id,strokes,to_par')
      .in('round_id', ids)
    const totals = (vt ?? []) as VRoundTotal[]
    const map = new Map(totals.map(t => [t.round_id, t]))

    setRecent(rounds.map(r => ({ ...r, total: map.get(r.id) })))
  } catch (e) {
    setErr(e instanceof Error ? e.message : 'Failed to load recent rounds')
  }
}

async function loadTeamsAndLatestEvent(
  userId: string,
  setTeams: (rows: TeamRow[]) => void,
  setLatestEvent: (e: EventRow | null) => void,
  setErr: (e: string | null) => void
) {
  try {
    const { data: tm } = await supabase
      .from('team_members')
      .select('team_id,role')
      .eq('user_id', userId)
    const memberships = (tm ?? []) as TeamMemberRow[]
    if (!memberships.length) { setTeams([]); setLatestEvent(null); return }

    const tids = memberships.map(m => m.team_id)
    const { data: ts } = await supabase
      .from('teams')
      .select('id,name')
      .in('id', tids)
    setTeams(((ts ?? []) as TeamRow[]).sort((a, b) => a.name.localeCompare(b.name)))

    const { data: ev } = await supabase
      .from('events')
      .select('id,team_id,name,type,status,start_date,end_date,course_id,course_tee_id')
      .in('team_id', tids)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    setLatestEvent((ev ?? null) as EventRow | null)
  } catch (e) {
    setErr(e instanceof Error ? e.message : 'Failed to load team/event info')
  }
}

function TeamEventsBlock({ coachTeams }: { coachTeams: TeamRow[] }) {
  const [items, setItems] = useState<Array<{ team: TeamRow; events: EventRow[] }>>([])
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!coachTeams.length) { setItems([]); return }
      const out: Array<{ team: TeamRow; events: EventRow[] }> = []
      for (const t of coachTeams) {
        const { data: ev } = await supabase
          .from('events')
          .select('id,team_id,name,type,status,start_date,end_date,course_id,course_tee_id')
          .eq('team_id', t.id)
          .order('start_date', { ascending: false })
          .limit(3)
        if (cancelled) return
        out.push({ team: t, events: (ev ?? []) as EventRow[] })
      }
      setItems(out)
    })()
    return () => { cancelled = true }
  }, [coachTeams])

  if (!coachTeams.length) {
    return <div className="px-3 py-3 text-sm text-gray-600">You’re not on any teams yet.</div>
  }

  return (
    <div className="divide-y">
      {items.map(({ team, events }) => (
        <div key={team.id} className="px-3 py-3">
          <div className="mb-1 font-medium">{team.name}</div>
          {events.length ? (
            <ul className="space-y-1 text-sm">
              {events.map(e => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Link prefetch={false} href={`/events/${e.id}`} className="truncate text-[#0033A0] underline">
                      {e.name}
                    </Link>
                    <div className="text-xs text-gray-600">
                      {e.type} • {e.status} • {formatRange(e.start_date, e.end_date)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link prefetch={false} href={`/events/${e.id}`} className="text-sm underline">Leaderboard</Link>
                    <Link prefetch={false} href={`/events/${e.id}/manage`} className="text-sm underline">Manage</Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-600">No recent events.</div>
          )}
        </div>
      ))}
    </div>
  )
}

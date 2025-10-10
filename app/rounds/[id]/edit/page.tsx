'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'

type RoundRow = {
  id: string
  created_at: string
  course_id: string | null
  tee_set_id: string | null
  event_id: string | null
  course?: { name: string }[] | { name: string } | null
  tee?: { name: string }[] | { name: string } | null
}

type EventRow = {
  id: string
  name: string
  starts_at: string | null
  ends_at: string | null
}

export default function EditRoundPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = useMemo(() => supabaseBrowser(), [])

  const roundId = params.id
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [linking, setLinking] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [round, setRound] = useState<RoundRow | null>(null)
  const [courseId, setCourseId] = useState<string>('')
  const [teeSetId, setTeeSetId] = useState<string>('')
  const [eventId, setEventId] = useState<string>('')

  const [events, setEvents] = useState<EventRow[]>([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setErr(null)
      // must be signed in
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      // load round
      const { data: r, error: rErr } = await supabase
        .from('rounds')
        .select(`
          id, created_at, course_id, tee_set_id, event_id,
          course:courses ( name ),
          tee:tee_sets ( name )
        `)
        .eq('id', roundId)
        .single()

      if (rErr) { setErr(rErr.message); setLoading(false); return }
      if (!alive) return

      setRound(r as any)
      setCourseId((r as any)?.course_id ?? '')
      setTeeSetId((r as any)?.tee_set_id ?? '')
      setEventId((r as any)?.event_id ?? '')

      // load some events (optional, adjust query as needed)
      const { data: evts } = await supabase
        .from('events')
        .select('id, name, starts_at, ends_at')
        .order('starts_at', { ascending: false })
        .limit(100)

      setEvents((evts as EventRow[]) ?? [])
      setLoading(false)
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId])

  async function saveBasics(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      const { error } = await supabase
        .from('rounds')
        .update({
          course_id: courseId || null,
          tee_set_id: teeSetId || null,
        })
        .eq('id', roundId)

      if (error) throw error
      router.replace(`/rounds/${roundId}`)
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function linkEvent() {
    setLinking(true)
    setErr(null)
    try {
      // prefer secure RPC if present
      const { error: rpcErr } = await supabase.rpc('link_round_to_event', {
        p_round_id: roundId,
        p_event_id: eventId || null,
      })
      if (rpcErr && !rpcErr.message?.toLowerCase().includes('function') ) {
        // RPC exists but returned error
        throw rpcErr
      }
      if (rpcErr && rpcErr.message?.toLowerCase().includes('function')) {
        // RPC not deployed; fall back to direct update
        const { error } = await supabase
          .from('rounds')
          .update({ event_id: eventId || null })
          .eq('id', roundId)
        if (error) throw error
      }
      router.refresh()
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to link event')
    } finally {
      setLinking(false)
    }
  }

  async function unlinkEvent() {
    setEventId('')
    setLinking(true)
    setErr(null)
    try {
      const { error: rpcErr } = await supabase.rpc('link_round_to_event', {
        p_round_id: roundId,
        p_event_id: null,
      })
      if (rpcErr && !rpcErr.message?.toLowerCase().includes('function') ) {
        throw rpcErr
      }
      if (rpcErr && rpcErr.message?.toLowerCase().includes('function')) {
        const { error } = await supabase
          .from('rounds')
          .update({ event_id: null })
          .eq('id', roundId)
        if (error) throw error
      }
      router.refresh()
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to unlink event')
    } finally {
      setLinking(false)
    }
  }

  async function refreshSG() {
    setRefreshing(true)
    setErr(null)
    try {
      const { error } = await supabase.rpc('refresh_mv_round_sg_totals_v2')
      if (error) throw error
      router.refresh()
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to refresh SG')
    } finally {
      setRefreshing(false)
    }
  }

  const courseName = Array.isArray(round?.course) ? round?.course[0]?.name : (round as any)?.course?.name
  const teeName = Array.isArray(round?.tee) ? round?.tee[0]?.name : (round as any)?.tee?.name

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="animate-pulse h-8 w-64 rounded bg-gray-200 mb-4" />
        <div className="animate-pulse h-40 rounded-xl bg-gray-200" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit Round</h1>
        <Link href={`/rounds/${roundId}`} className="rounded-xl border px-3 py-1.5 hover:bg-gray-50">
          Back to Summary
        </Link>
      </div>

      {/* Basic fields */}
      <form onSubmit={saveBasics} className="rounded-2xl border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Course ID</label>
            <input
              className="w-full rounded-xl border px-3 py-2"
              value={courseId}
              onChange={e => setCourseId(e.target.value)}
              placeholder="uuid"
            />
            {courseName && <p className="mt-1 text-xs text-gray-500">Current: {courseName}</p>}
          </div>
          <div>
            <label className="block text-sm mb-1">Tee Set ID</label>
            <input
              className="w-full rounded-xl border px-3 py-2"
              value={teeSetId}
              onChange={e => setTeeSetId(e.target.value)}
              placeholder="uuid"
            />
            {teeName && <p className="mt-1 text-xs text-gray-500">Current: {teeName}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="rounded-xl border px-4 py-2 hover:bg-gray-50"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Basics'}
          </button>

          <button
            type="button"
            className="rounded-xl border px-4 py-2 hover:bg-gray-50"
            onClick={refreshSG}
            disabled={refreshing}
            title="Rebuild SG totals materialized view"
          >
            {refreshing ? 'Refreshing…' : 'Refresh SG'}
          </button>
        </div>
      </form>

      {/* Event link */}
      <div className="rounded-2xl border p-4 space-y-3">
        <h2 className="font-semibold">Event Link (optional)</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Select Event</label>
            <select
              className="w-full rounded-xl border px-3 py-2"
              value={eventId}
              onChange={e => setEventId(e.target.value)}
            >
              <option value="">— No Event —</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                  {ev.starts_at ? ` — ${new Date(ev.starts_at).toLocaleDateString()}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              type="button"
              className="rounded-xl border px-4 py-2 hover:bg-gray-50"
              onClick={linkEvent}
              disabled={linking}
            >
              {linking ? 'Linking…' : 'Link Event'}
            </button>
            <button
              type="button"
              className="rounded-xl border px-4 py-2 hover:bg-gray-50"
              onClick={unlinkEvent}
              disabled={linking || !round?.event_id}
            >
              Unlink
            </button>
          </div>
        </div>

        {round?.event_id && (
          <p className="text-xs text-gray-600">Currently linked to event: <code>{round.event_id}</code></p>
        )}
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  )
}

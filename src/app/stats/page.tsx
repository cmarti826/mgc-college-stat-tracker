'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Course = { id: string; name: string }
type Tee = { id: string; tee_name: string }

export default function StatsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [tees, setTees] = useState<Tee[]>([])
  const [courseId, setCourseId] = useState<string>('')
  const [teeId, setTeeId] = useState<string>('')
  const [roundId, setRoundId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  // ✅ ensureSelfPlayer now relies on DB default user_id = auth.uid()
  const ensureSelfPlayer = async (uid: string) => {
    // already have a player row?
    const { data: found, error: findErr } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', uid)
      .maybeSingle()
    if (findErr) throw findErr
    if (found?.id) return found.id

    // create one — do NOT send user_id; DB fills it via DEFAULT auth.uid()
    const { data: created, error: createErr } = await supabase
      .from('players')
      .insert({ display_name: 'Player' })
      .select('id')
      .single()
    if (createErr) throw createErr
    return created.id
  }

  useEffect(() => {
    ;(async () => {
      setError(null)
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) {
        setError('Please sign in to start a round.')
        return
      }
      setUserId(u.user.id)

      const { data: c, error: e1 } = await supabase
        .from('courses')
        .select('id,name')
        .order('name')
      if (e1) { setError(e1.message); return }
      setCourses(c ?? [])
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      if (!courseId) { setTees([]); setTeeId(''); return }
      const { data, error } = await supabase
        .from('course_tees')
        .select('id,tee_name')
        .eq('course_id', courseId)
        .order('tee_name')
      if (error) { setError(error.message); return }
      setTees(data ?? [])
      setTeeId(data?.[0]?.id ?? '')
    })()
  }, [courseId])

  const canStart = useMemo(() => !!userId && !!courseId, [userId, courseId])

  const startRound = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canStart) return
    try {
      setStarting(true)
      setError(null)
      const pid = await ensureSelfPlayer(userId!)

      const { data, error } = await supabase
  .from('rounds')
  .insert({
    player_id: pid,
    course_id: courseId,
    course_tee_id: teeId || null,
    played_at: new Date().toISOString().slice(0,10),
    status: 'in_progress',
    created_by: userId,            // ← optional; DB default also handles it
  })
  .select('id')
  .single()
      if (error) throw error
      setRoundId(data.id)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to start round')
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Stats</h1>

      <form onSubmit={startRound} className="space-y-3 rounded border bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm text-gray-600">Course</label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full rounded border px-3 py-2"
              required
            >
              <option value="">Select course…</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-600">Tee (optional)</label>
            <select
              value={teeId}
              onChange={(e) => setTeeId(e.target.value)}
              className="w-full rounded border px-3 py-2"
            >
              <option value="">—</option>
              {tees.map((t) => (
                <option key={t.id} value={t.id}>{t.tee_name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              disabled={!canStart || starting}
              className="w-full rounded bg-[#0B6B3A] px-4 py-2 text-white disabled:opacity-50"
            >
              {starting ? 'Starting…' : 'Start Round'}
            </button>
          </div>
        </div>

        {error && <p className="text-red-600">{error}</p>}
        {roundId && (
          <p className="text-sm">
            Round started.{' '}
            <Link href={`/rounds/${roundId}`} className="text-[#0033A0] underline">
              Enter hole-by-hole stats →
            </Link>
          </p>
        )}
      </form>
    </div>
  )
}

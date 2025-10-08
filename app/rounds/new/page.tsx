// app/rounds/new/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

type Course = { id: string; name: string }
type TeeSet = { id: string; name: string; course_id: string }
type CourseHole = { hole_number: number; par: number | null; yardage: number | null }
type RoundType = 'PRACTICE' | 'QUALIFYING' | 'TOURNAMENT'

const ROUND_TYPE_OPTIONS: RoundType[] = ['PRACTICE', 'QUALIFYING', 'TOURNAMENT']

export default function NewRoundPage() {
  const router = useRouter()
  const supabase = useMemo(() => supabaseBrowser(), [])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [courses, setCourses] = useState<Course[]>([])
  const [teeSets, setTeeSets] = useState<TeeSet[]>([])

  const [courseId, setCourseId] = useState<string>('')
  const [teeSetId, setTeeSetId] = useState<string>('')

  const [playerId, setPlayerId] = useState<string | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [authed, setAuthed] = useState(false)

  // round_type support
  const [hasRoundType, setHasRoundType] = useState(false)
  const [roundType, setRoundType] = useState<RoundType>('PRACTICE')

  // Load auth, mapping, courses, tee sets, and detect round_type column
  useEffect(() => {
    (async () => {
      setLoading(true)
      setError(null)

      // auth
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr) {
        setError(authErr.message)
        setLoading(false)
        return
      }
      setAuthed(!!user)

      // resolve player
      let resolvedPlayer: string | null = null
      if (user?.id) {
        const { data: up, error: upErr } = await supabase
          .from('user_players')
          .select('player_id')
          .eq('user_id', user.id)
          .maybeSingle()
        if (upErr) {
          setError(upErr.message)
        } else {
          resolvedPlayer = up?.player_id ?? null
        }
      }
      setPlayerId(resolvedPlayer)

      // resolve a team (first one if multiple)
      let resolvedTeam: string | null = null
      if (resolvedPlayer) {
        const { data: mem } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('player_id', resolvedPlayer)
          .limit(1)
          .maybeSingle()
        resolvedTeam = mem?.team_id ?? null
      }
      setTeamId(resolvedTeam)

      // detect if rounds.round_type exists (if not, we hide the control)
      {
        const { error: rtErr } = await supabase
          .from('rounds')
          .select('round_type')
          .limit(1)
        setHasRoundType(!rtErr)
      }

      // load courses
      const { data: cs, error: cErr } = await supabase
        .from('courses')
        .select('id, name')
        .order('name', { ascending: true })
      if (cErr) {
        setError(cErr.message)
        setLoading(false)
        return
      }
      setCourses((cs ?? []) as Course[])
      const firstCourse = (cs?.[0]?.id as string) ?? ''
      const selectedCourse = courseId || firstCourse
      setCourseId(selectedCourse)

      // load tee sets for selected course (if any)
      if (selectedCourse) {
        const { data: ts } = await supabase
          .from('tee_sets')
          .select('id, name, course_id')
          .eq('course_id', selectedCourse)
          .order('name', { ascending: true })
        setTeeSets((ts ?? []) as TeeSet[])
        setTeeSetId(ts?.[0]?.id ?? '')
      }

      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  // When course changes, reload tee sets
  useEffect(() => {
    (async () => {
      if (!courseId) {
        setTeeSets([])
        setTeeSetId('')
        return
      }
      const { data: ts } = await supabase
        .from('tee_sets')
        .select('id, name, course_id')
        .eq('course_id', courseId)
        .order('name', { ascending: true })
      setTeeSets((ts ?? []) as TeeSet[])
      setTeeSetId(ts?.[0]?.id ?? '')
    })()
  }, [courseId, supabase])

  async function createRound(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      if (!authed) throw new Error('Please sign in.')
      if (!playerId) throw new Error('Link your login to a player on the Players page.')
      if (!courseId) throw new Error('Choose a course.')
      if (!teeSetId) throw new Error('Choose a tee set.')

      // Build payload
      const payload: Record<string, any> = {
        course_id: courseId,
        tee_set_id: teeSetId,
        player_id: playerId,
        team_id: teamId, // can be null
      }
      if (hasRoundType && roundType) {
        payload.round_type = roundType
      }

      // 1) Create round
      const { data: roundInsert, error: roundErr } = await supabase
        .from('rounds')
        .insert(payload)
        .select('id')
        .single()

      if (roundErr) throw roundErr
      const roundId = (roundInsert as any).id as string

      // 2) Seed round_holes
      let template: CourseHole[] = []
      const { data: ch } = await supabase
        .from('course_holes')
        .select('hole_number, par, yardage')
        .eq('course_id', courseId)
        .order('hole_number', { ascending: true })

      if (ch && ch.length > 0) {
        template = (ch as CourseHole[]).map(h => ({
          hole_number: h.hole_number,
          par: h.par ?? 4,
          yardage: h.yardage ?? null,
        }))
      } else {
        template = Array.from({ length: 18 }, (_, i) => ({
          hole_number: i + 1,
          par: 4,
          yardage: null,
        }))
      }

      const roundHoleRows = template.map(h => ({
        round_id: roundId,
        hole_number: h.hole_number,
        par: h.par ?? 4,
        yardage: h.yardage,
        strokes: null,
        putts: null,
        fairway_hit: null,
        gir: null,
        penalty_strokes: 0,
      }))

      const { error: rhErr } = await supabase
        .from('round_holes')
        .insert(roundHoleRows)

      if (rhErr) {
        // Non-fatal; navigate anyway but surface a console warning
        console.warn('round_holes insert failed:', rhErr)
      }

      // 3) Navigate to the round
      router.push(`/rounds/${roundId}`)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create round.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1>New Round</h1>
        <div className="flex gap-2">
          <Link href="/courses" className="btn-on-light-outline">Courses</Link>
          <Link href="/rounds" className="btn-on-light-outline">Back to Rounds</Link>
        </div>
      </div>

      {!authed && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Sign in required</div>
          </div>
          <p className="text-sm text-gray-600">
            Please <Link href="/auth/login" className="underline">sign in</Link> to create a round.
          </p>
        </div>
      )}

      {authed && !playerId && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Link your login to a player</div>
              <div className="card-subtle">This lets us personalize rounds and filters.</div>
            </div>
            <Link href="/players" className="btn-on-light">Open Players</Link>
          </div>
          <p className="text-sm text-gray-600">
            Go to the <Link href="/players" className="underline">Players</Link> page, create/select your player, and click <span className="chip chip-blue">Link me</span>.
          </p>
        </div>
      )}

      <form onSubmit={createRound} className="card">
        <div className="card-header">
          <div className="card-title">Round Setup</div>
          <div className="card-subtle">Choose course and tee set. We’ll prefill 18 holes.</div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Course */}
          <div>
            <label className="label">Course</label>
            <select
              className="select"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              disabled={loading || saving}
            >
              {!courseId && <option value="">— choose —</option>}
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="help">Manage courses & tee sets on the Courses page.</div>
          </div>

          {/* Tee Set */}
          <div>
            <label className="label">Tee Set</label>
            <select
              className="select"
              value={teeSetId}
              onChange={(e) => setTeeSetId(e.target.value)}
              disabled={!courseId || loading || saving}
            >
              {!teeSetId && <option value="">— choose —</option>}
              {teeSets.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <div className="help">Only tee sets for the selected course are shown.</div>
          </div>

          {/* Round Type (only if the column exists) */}
          {hasRoundType && (
            <div>
              <label className="label">Round Type</label>
              <select
                className="select"
                value={roundType}
                onChange={(e) => setRoundType(e.target.value as RoundType)}
                disabled={loading || saving}
              >
                {ROUND_TYPE_OPTIONS.map(rt => (
                  <option key={rt} value={rt}>{rt}</option>
                ))}
              </select>
              <div className="help">PRACTICE / QUALIFYING / TOURNAMENT</div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {playerId ? (
              <>Player linked • {teamId ? 'Team detected' : 'No team (optional)'} </>
            ) : (
              <>Player not linked</>
            )}
          </div>
          <div className="flex gap-2">
            <Link href="/rounds" className="btn-on-light-outline" aria-disabled={saving}>Cancel</Link>
            <button
              type="submit"
              className="btn-on-light"
              disabled={saving || !authed || !playerId || !courseId || !teeSetId}
            >
              {saving ? 'Creating…' : 'Create Round'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

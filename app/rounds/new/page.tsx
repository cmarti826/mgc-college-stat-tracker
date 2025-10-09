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

type CoachPlayer = {
  player_id: string
  full_name: string
  team_id: string | null
  team_name: string | null
}

function todayYMD() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

async function resolveTeamForPlayer(supabase: any, pid: string): Promise<string | null> {
  const { data } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('player_id', pid)
    .limit(1)
    .maybeSingle()
  return data?.team_id ?? null
}

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

  const [authed, setAuthed] = useState(false)
  const [playerId, setPlayerId] = useState<string | null>(null) // "me"
  const [teamId, setTeamId] = useState<string | null>(null)

  // Coach mode + picker
  const [isCoach, setIsCoach] = useState(false)
  const [coachPlayers, setCoachPlayers] = useState<CoachPlayer[]>([])
  const [createFor, setCreateFor] = useState<'me' | 'other'>('me')
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('')

  // Coach conveniences
  const [rememberDefaultLocal, setRememberDefaultLocal] = useState(true)
  const [alsoLinkMe, setAlsoLinkMe] = useState(false)

  // Feature detection
  const [hasRoundType, setHasRoundType] = useState(false)
  const [hasRoundDate, setHasRoundDate] = useState(false)

  // Form fields
  const [roundType, setRoundType] = useState<RoundType>('PRACTICE')
  const [roundDate, setRoundDate] = useState<string>(todayYMD())

  // Initial load
  useEffect(() => {
    (async () => {
      setLoading(true)
      setError(null)
      try {
        // Auth
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        if (authErr) throw authErr
        setAuthed(!!user)

        // Resolve "me" player
        let mePlayer: string | null = null
        if (user?.id) {
          const { data: up } = await supabase
            .from('user_players')
            .select('player_id')
            .eq('user_id', user.id)
            .maybeSingle()
          mePlayer = up?.player_id ?? null
        }
        setPlayerId(mePlayer)

        // Resolve team for "me"
        let meTeam: string | null = null
        if (mePlayer) {
          const { data: mem } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('player_id', mePlayer)
            .limit(1)
            .maybeSingle()
          meTeam = mem?.team_id ?? null
        }
        setTeamId(meTeam)

        // Detect columns
        setHasRoundType(!(await supabase.from('rounds').select('round_type').limit(1)).error)
        setHasRoundDate(!(await supabase.from('rounds').select('round_date').limit(1)).error)
        setRoundDate(todayYMD())

        // Detect coach & load team players
        let coach = false
        if (user?.id) {
          const { data: tm } = await supabase
            .from('team_members')
            .select('id')
            .eq('user_id', user.id)
            .eq('role', 'coach')
            .limit(1)
          coach = (tm ?? []).length > 0
        }
        setIsCoach(coach)

        if (coach) {
          const { data: plr } = await supabase.rpc('my_team_players')
          const list = (plr ?? []) as CoachPlayer[]
          const map = new Map<string, CoachPlayer>()
          list.forEach(p => { if (!map.has(p.player_id)) map.set(p.player_id, p) })
          const final = Array.from(map.values()).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
          setCoachPlayers(final)

          try {
            const stored = typeof window !== 'undefined' ? localStorage.getItem('mgc.coachDefaultPlayerId') : null
            if (stored && final.find(p => p.player_id === stored)) {
              setSelectedPlayerId(stored)
              setCreateFor('other')
            }
          } catch { /* ignore */ }
        }

        // Load courses & tee sets
        const { data: cs, error: cErr } = await supabase
          .from('courses').select('id, name').order('name')
        if (cErr) throw cErr
        setCourses((cs ?? []) as Course[])
        const firstCourse = cs?.[0]?.id ?? ''
        const selectedCourse = courseId || firstCourse
        setCourseId(selectedCourse)

        if (selectedCourse) {
          const { data: ts } = await supabase
            .from('tee_sets').select('id, name, course_id')
            .eq('course_id', selectedCourse).order('name')
          setTeeSets((ts ?? []) as TeeSet[])
          setTeeSetId(ts?.[0]?.id ?? '')
        }

        // Default who-for
        if (!mePlayer && coach) setCreateFor('other')
        else setCreateFor('me')
      } catch (e: any) {
        setError(e.message ?? 'Failed to initialize the New Round page.')
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  // Reload tee sets when course changes
  useEffect(() => {
    (async () => {
      if (!courseId) { setTeeSets([]); setTeeSetId(''); return }
      const { data: ts } = await supabase
        .from('tee_sets')
        .select('id, name, course_id')
        .eq('course_id', courseId)
        .order('name')
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
      if (!courseId) throw new Error('Choose a course.')
      if (!teeSetId) throw new Error('Choose a tee set.')
      if (hasRoundDate && !roundDate) throw new Error('Pick a round date.')

      // Determine target player
      const desiredPlayerId =
        createFor === 'me' ? playerId : (selectedPlayerId || null)

      if (!desiredPlayerId) {
        if (createFor === 'other') throw new Error('Choose a player to create a round for.')
        // For "me", we may auto-create after FK failure — proceed to try insert
      }

      // Determine team: for "other", derive from that player; for "me", keep my team
      const finalTeamId =
        createFor === 'other' && desiredPlayerId
          ? await resolveTeamForPlayer(supabase, desiredPlayerId)
          : teamId

      // Build insert payload
      const payload: Record<string, any> = {
        course_id: courseId,
        tee_set_id: teeSetId,
        player_id: desiredPlayerId,      // might be null in "me" mode; FK retry below will auto-create/link
        team_id: finalTeamId ?? null,
      }
      if (hasRoundType && roundType) payload.round_type = roundType
      if (hasRoundDate && roundDate) payload.round_date = roundDate

      // Helper to attempt insert
      async function tryInsert(body: any) {
        const { data, error } = await supabase
          .from('rounds')
          .insert(body)
          .select('id')
          .single()
        return { data, error }
      }

      // 1st attempt
      let { data: roundInsert, error: roundErr } = await tryInsert(payload)

      // If FK violation, handle:
      // - In "me" mode: auto-create & link a player for current user, update payload.player_id, retry once.
      // - In "other" mode: do NOT auto-create (not safe) -> show a clear error.
      if (roundErr && (roundErr as any).code === '23503') {
        if (createFor === 'other') {
          throw new Error('Selected player no longer exists. Pick another player and try again.')
        } else {
          // Auto-create & link me, then retry once
          const { data: auth } = await supabase.auth.getUser()
          const fallbackName = auth?.user?.email?.split('@')[0] || 'New Player'
          const { data: newPid, error: rpcErr } = await supabase.rpc('create_player_and_link_me', { p_full_name: fallbackName })
          if (rpcErr || !newPid) {
            throw new Error('Your player link is stale and auto-fix failed. Go to Players → “Create & link me”.')
          }
          payload.player_id = newPid
          // Optional: refresh my cached state so next time it’s good
          setPlayerId(newPid as string)

          // Retry
          const retry = await tryInsert(payload)
          roundInsert = retry.data
          roundErr = retry.error
        }
      }

      if (roundErr) {
        // Surface Postgres message if available
        throw new Error((roundErr as any).message ?? 'Failed to create round.')
      }

      const roundId = (roundInsert as any).id as string

      // Seed round_holes (best-effort)
      let template: CourseHole[] = []
      const { data: ch } = await supabase
        .from('course_holes')
        .select('hole_number, par, yardage')
        .eq('course_id', courseId)
        .order('hole_number')

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

      const { error: rhErr } = await supabase.from('round_holes').insert(roundHoleRows)
      if (rhErr) console.warn('round_holes insert failed:', rhErr) // non-fatal

      // Coach conveniences
      if (isCoach && createFor === 'other') {
        try {
          if (rememberDefaultLocal && selectedPlayerId) {
            localStorage.setItem('mgc.coachDefaultPlayerId', selectedPlayerId)
          }
        } catch { /* ignore */ }
        if (alsoLinkMe && selectedPlayerId) {
          await supabase.rpc('link_me_to_player', { p_player_id: selectedPlayerId })
        }
      }

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

      <form onSubmit={createRound} className="card">
        <div className="card-header">
          <div className="card-title">Round Setup</div>
          <div className="card-subtle">Choose course and tee set. We’ll prefill 18 holes.</div>
        </div>

        {/* Coach "who for" selector */}
        {authed && (
          <div className="grid gap-4 sm:grid-cols-2">
            {isCoach && (
              <div className="sm:col-span-2">
                <label className="label">Who is this round for?</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={[
                      'px-3 py-1.5 rounded-full text-sm border',
                      createFor === 'me'
                        ? 'bg-[#3C3B6E] text-white border-[#3C3B6E]'
                        : 'bg-white text-[#3C3B6E] border-gray-300 hover:bg-gray-50',
                    ].join(' ')}
                    onClick={() => setCreateFor('me')}
                  >
                    Me
                  </button>
                  <button
                    type="button"
                    className={[
                      'px-3 py-1.5 rounded-full text-sm border',
                      createFor === 'other'
                        ? 'bg-[#B22234] text-white border-[#B22234]'
                        : 'bg-white text-[#3C3B6E] border-gray-300 hover:bg-gray-50',
                    ].join(' ')}
                    onClick={() => setCreateFor('other')}
                  >
                    Another player
                  </button>
                </div>

                {createFor === 'other' && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label className="label">Player</label>
                      <select
                        className="select"
                        value={selectedPlayerId}
                        onChange={(e) => setSelectedPlayerId(e.target.value)}
                        disabled={loading || saving || coachPlayers.length === 0}
                      >
                        <option value="">— choose a player —</option>
                        {coachPlayers.map(p => (
                          <option key={p.player_id} value={p.player_id}>
                            {p.full_name}{p.team_name ? ` • ${p.team_name}` : ''}
                          </option>
                        ))}
                      </select>
                      <div className="help">Players pulled from your team(s).</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="label">Options</label>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={rememberDefaultLocal}
                          onChange={(e) => setRememberDefaultLocal(e.target.checked)}
                        />
                        Remember on this device
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={alsoLinkMe}
                          onChange={(e) => setAlsoLinkMe(e.target.checked)}
                        />
                        Also link me to this player
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

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

            {/* Round Type */}
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

            {/* Round Date */}
            {hasRoundDate && (
              <div>
                <label className="label">Round Date</label>
                <input
                  type="date"
                  className="input"
                  value={roundDate}
                  onChange={(e) => setRoundDate(e.target.value)}
                  disabled={loading || saving}
                />
                <div className="help">Defaults to today.</div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {isCoach
              ? 'Coach mode available'
              : (playerId ? 'Player linked' : 'Player not linked')}
          </div>
          <div className="flex gap-2">
            <Link href="/rounds" className="btn-on-light-outline" aria-disabled={saving}>Cancel</Link>
            <button
              type="submit"
              className="btn-on-light"
              disabled={
                saving ||
                !authed ||
                !courseId ||
                !teeSetId ||
                (hasRoundDate && !roundDate) ||
                (isCoach && createFor === 'other' && !selectedPlayerId)
              }
            >
              {saving ? 'Creating…' : 'Create Round'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

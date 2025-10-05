'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Team = { id: string; name: string }
type Course = { id: string; name: string }
type Tee = { id: string; tee_name?: string | null; name?: string | null; rating?: number | null; slope?: number | null }

type RoundStatus = 'open' | 'scheduled'
type SGModel = 'pga_tour' | 'ncaa_d1'

export default function SchedulePage() {
  const router = useRouter()

  // form state
  const [teamId, setTeamId] = useState<string>('')
  const [courseId, setCourseId] = useState<string>('')
  const [teeId, setTeeId] = useState<string>('')
  const [roundName, setRoundName] = useState<string>('')
  const [date, setDate] = useState<string>(today())
  const [status, setStatus] = useState<RoundStatus>('open')
  const [sgModel, setSgModel] = useState<SGModel>('pga_tour')
  const [autoAddPlayers, setAutoAddPlayers] = useState<boolean>(true)

  // data
  const [teams, setTeams] = useState<Team[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [tees, setTees] = useState<Tee[]>([])

  // ui
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string>('')

  // load teams + default team
  useEffect(() => {
    ;(async () => {
      setMsg('')
      // teams
      const { data: tms, error: e1 } = await supabase
        .from('teams')
        .select('id,name')
        .order('created_at', { ascending: true })
      if (e1) { setMsg(e1.message); return }
      setTeams((tms as Team[]) || [])

      // default team from profile (if exists)
      const { data: me } = await supabase.auth.getUser()
      if (me?.user?.id) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('default_team_id')
          .eq('id', me.user.id)
          .maybeSingle()
        const defTeam = (prof as any)?.default_team_id as string | undefined
        if (defTeam) setTeamId(defTeam)
      } else if (tms && tms.length) {
        setTeamId(tms[0].id)
      }
    })()
  }, [])

  // load courses
  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id,name')
        .order('name', { ascending: true })
      if (error) { setMsg(error.message); return }
      setCourses((data as Course[]) || [])
    })()
  }, [])

  // load tee sets when course changes
  useEffect(() => {
    setTeeId('')
    if (!courseId) { setTees([]); return }
    ;(async () => {
      const { data, error } = await supabase
        .from('tee_sets')
        .select('id, tee_name, name, rating, slope')
        .eq('course_id', courseId)
        .order('rating', { ascending: false })
      if (error) { setMsg(error.message); return }
      setTees((data as Tee[]) || [])
    })()
  }, [courseId])

  // default round name when course changes (only if name empty)
  useEffect(() => {
    if (!roundName) {
      const c = courses.find(c => c.id === courseId)
      if (c) setRoundName(`Round at ${c.name}`)
    }
  }, [courseId, courses, roundName])

  const teeLabel = (t: Tee) => {
    const nm = t.tee_name || t.name || 'Tee'
    const rs = (t.rating ? `${t.rating}` : '') + (t.slope ? `/${t.slope}` : '')
    return rs ? `${nm} (${rs})` : nm
  }

  const canCreate = useMemo(
    () => !!teamId && !!courseId && !!teeId && !!date && !!roundName.trim(),
    [teamId, courseId, teeId, date, roundName]
  )

  const createRound = async () => {
    try {
      setBusy(true)
      setMsg('')

      if (!canCreate) {
        setMsg('Missing fields.')
        return
      }

      // insert round
      const payload: any = {
        team_id: teamId,
        course_id: courseId,
        tee_set_id: teeId,
        round_date: date,       // expects ISO yyyy-mm-dd
        name: roundName.trim(),
        status,                 // enum round_status: 'open' | 'scheduled'
        sg_model: sgModel,      // enum sg_model
      }

      const { data: ins, error } = await supabase
        .from('rounds')
        .insert(payload)
        .select('id')
        .single()
      if (error) throw error

      const roundId = (ins as any).id as string

      // optionally auto-add all team members to round_players
      if (autoAddPlayers) {
        const { data: members, error: e2 } = await supabase
          .from('team_members')
          .select('user_id')
          .eq('team_id', teamId)
        if (!e2 && members && members.length) {
          const rows = (members as any[]).map(m => ({
            round_id: roundId,
            user_id: m.user_id,
            role: 'player', // if your round_players has a role column
          }))
          // insert ignoring duplicates if re-run
          await supabase.from('round_players').insert(rows).select('round_id').maybeSingle()
        }
      }

      setMsg('Round created ✅ Redirecting to scoring…')
      router.push(`/rounds/${roundId}/score`)
    } catch (e: any) {
      setMsg(e.message || 'Error creating round')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: 12 }}>Schedule / Create Round</h1>

      <div style={{ display: 'grid', gap: 10, maxWidth: 760 }}>
        {/* Team */}
        <label style={label}>
          <span>Team</span>
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">Select team</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>

        {/* Course */}
        <label style={label}>
          <span>Course</span>
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">Select course</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>

        {/* Tee set */}
        <label style={label}>
          <span>Tee Set</span>
          <select value={teeId} onChange={(e) => setTeeId(e.target.value)} disabled={!courseId || tees.length === 0}>
            <option value="">{courseId ? (tees.length ? 'Select tee set' : 'No tees for this course') : 'Select a course first'}</option>
            {tees.map(t => <option key={t.id} value={t.id}>{teeLabel(t)}</option>)}
          </select>
        </label>

        {/* Date */}
        <label style={label}>
          <span>Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        {/* Round name */}
        <label style={label}>
          <span>Round Name</span>
          <input
            value={roundName}
            onChange={(e) => setRoundName(e.target.value)}
            placeholder="e.g., Conference Match vs. North"
          />
        </label>

        {/* Status */}
        <label style={label}>
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as RoundStatus)}>
            <option value="open">Open (live scoring)</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </label>

        {/* SG Model */}
        <label style={label}>
          <span>Strokes Gained Model</span>
          <select value={sgModel} onChange={(e) => setSgModel(e.target.value as SGModel)}>
            <option value="pga_tour">PGA Tour</option>
            <option value="ncaa_d1">NCAA D1</option>
          </select>
        </label>

        {/* Auto add */}
        <label style={{ ...label, alignItems: 'center', gap: 10 }}>
          <input
            type="checkbox"
            checked={autoAddPlayers}
            onChange={(e) => setAutoAddPlayers(e.target.checked)}
          />
          <span>Auto-add all team members to this round</span>
        </label>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
          <button onClick={createRound} disabled={!canCreate || busy}>
            {busy ? 'Creating…' : `Create Round (${status === 'open' ? 'Open' : 'Scheduled'})`}
          </button>
          {!canCreate && <span style={{ color: '#666' }}>Fill all fields to enable</span>}
        </div>

        {msg && (
          <div style={{ color: msg.toLowerCase().includes('error') ? '#c00' : '#2a6' }}>
            {msg}
          </div>
        )}
      </div>
    </div>
  )
}

function today() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const label: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '160px 1fr',
  gap: 8,
  alignItems: 'baseline',
}

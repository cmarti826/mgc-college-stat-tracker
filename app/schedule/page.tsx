'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabaseClient'

type Course = { id: string; name: string }
type TeeSet = {
  id: string
  course_id: string
  tee_name?: string | null
  name?: string | null
  rating?: number | null
  slope?: number | null
}
type ParRow = { hole_number: number; par: number | null }
type YdgRow = { hole_number: number; yardage: number | null }

export default function CreateRoundPage() {
  const supabase = getSupabaseBrowser()
  const router = useRouter()

  // form state
  const [teamId, setTeamId] = useState<string | ''>('')
  const [courseId, setCourseId] = useState<string | ''>('')
  const [teeSetId, setTeeSetId] = useState<string | ''>('')
  const [name, setName] = useState('')
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [sgModel, setSgModel] = useState<'pga_tour' | 'ncaa_d1'>('pga_tour')
  const [status, setStatus] = useState<'open' | 'scheduled'>('open')

  // data
  const [teams, setTeams] = useState<{ id: string; name: string | null }[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [teeSets, setTeeSets] = useState<TeeSet[]>([])
  const [pars, setPars] = useState<ParRow[]>([])
  const [ydgs, setYdgs] = useState<YdgRow[]>([])
  const [msg, setMsg] = useState('')

  // load teams (optional), courses
  useEffect(() => {
    ;(async () => {
      // Teams are optional; if you don’t use them, you can remove this block safely.
      const { data: t } = await supabase.from('teams').select('id, name').order('name', { ascending: true })
      setTeams((t as any[]) || [])

      const { data: c, error } = await supabase.from('courses').select('id, name').order('name', { ascending: true })
      if (error) setMsg(error.message)
      setCourses((c as Course[]) || [])
    })()
  }, [supabase])

  // when course changes, load tee sets and pars
  useEffect(() => {
    if (!courseId) {
      setTeeSets([])
      setPars([])
      setTeeSetId('')
      return
    }
    ;(async () => {
      // tee sets for the course
      const { data: ts, error: e1 } = await supabase
        .from('tee_sets')
        .select('id, course_id, tee_name, name, rating, slope')
        .eq('course_id', courseId)
        .order('tee_name', { ascending: true })
      if (e1) { setMsg(e1.message); return }
      setTeeSets((ts as TeeSet[]) || [])
      // default to first tee (if any)
      setTeeSetId((ts && ts[0]?.id) || '')

      // pars for the course
      const { data: ch, error: e2 } = await supabase
        .from('course_holes')
        .select('hole_number, par')
        .eq('course_id', courseId)
        .order('hole_number')
      if (e2) { setMsg(e2.message); return }
      setPars((ch as ParRow[]) || [])
    })()
  }, [courseId, supabase])

  // when tee set changes, load yardages
  useEffect(() => {
    if (!teeSetId) { setYdgs([]); return }
    ;(async () => {
      const { data: th, error } = await supabase
        .from('tee_set_holes')
        .select('hole_number, yardage')
        .eq('tee_set_id', teeSetId)
        .order('hole_number')
      if (error) { setMsg(error.message); return }
      setYdgs((th as YdgRow[]) || [])
    })()
  }, [teeSetId, supabase])

  const holes = useMemo(() => {
    // Show actual holes when we have them; otherwise show 1..18 so UI doesn't look empty
    const s = new Set<number>()
    pars.forEach(h => s.add(h.hole_number))
    ydgs.forEach(h => s.add(h.hole_number))
    const list = Array.from(s).sort((a, b) => a - b)
    return list.length ? list : Array.from({ length: 18 }, (_, i) => i + 1)
  }, [pars, ydgs])

  const parByHole = useMemo(() => {
    const m = new Map<number, number | null>()
    pars.forEach(h => m.set(h.hole_number, h.par))
    return m
  }, [pars])
  const ydgByHole = useMemo(() => {
    const m = new Map<number, number | null>()
    ydgs.forEach(h => m.set(h.hole_number, h.yardage))
    return m
  }, [ydgs])

  const selectedTee = teeSets.find(t => t.id === teeSetId)
  const teeLabel = selectedTee?.tee_name || selectedTee?.name || ''
  const teeRS = selectedTee ? [selectedTee.rating, selectedTee.slope].filter(Boolean).join('/') : ''

  async function createRound() {
    try {
      setMsg('')
      if (!courseId) throw new Error('Pick a course')
      if (!teeSetId) throw new Error('Pick a tee set')
      if (!name.trim()) throw new Error('Enter a round name')

      const payload = {
        team_id: teamId || null,
        name: name.trim(),
        round_date: date,                // YYYY-MM-DD
        status,                          // 'open' | 'scheduled'
        sg_model: sgModel,               // 'pga_tour' | 'ncaa_d1'
        tee_set_id: teeSetId,            // CRITICAL: ensures holes/yardage populate later
      }

      const { data, error } = await supabase.from('rounds').insert(payload).select('id').maybeSingle()
      if (error) throw error

      router.push(`/rounds/${data!.id}/score`)
    } catch (e: any) {
      setMsg(e.message || 'Failed to create round')
    }
  }

  return (
    <div style={{ padding: 16, display: 'grid', gap: 18 }}>
      <h2 style={{ margin: 0 }}>Create Round</h2>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, minmax(240px, 1fr))' }}>
        {/* Team (optional) */}
        <label>Team
          <select value={teamId} onChange={e => setTeamId(e.target.value)} style={input}>
            <option value="">(none)</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name || t.id}</option>)}
          </select>
        </label>

        <label>Round date
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={input} />
        </label>

        <label>Course
          <select
            value={courseId}
            onChange={e => setCourseId(e.target.value)}
            style={input}
          >
            <option value="">Pick a course</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>

        <label>Tee set
          <select
            value={teeSetId}
            onChange={e => setTeeSetId(e.target.value)}
            style={input}
            disabled={!courseId || teeSets.length === 0}
          >
            <option value="">{teeSets.length ? 'Pick a tee set' : 'No tees for this course'}</option>
            {teeSets.map(t => (
              <option key={t.id} value={t.id}>
                {(t.tee_name || t.name || 'Tee')} {t.rating && t.slope ? `(${t.rating}/${t.slope})` : ''}
              </option>
            ))}
          </select>
        </label>

        <label>Round name
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Bayou City Q Round 2" style={input} />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <label>SG model
            <select value={sgModel} onChange={e => setSgModel(e.target.value as any)} style={input}>
              <option value="pga_tour">PGA Tour Baseline</option>
              <option value="ncaa_d1">NCAA D1</option>
            </select>
          </label>
          <label>Status
            <select value={status} onChange={e => setStatus(e.target.value as any)} style={input}>
              <option value="open">Open</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </label>
        </div>
      </div>

      {/* Tee summary */}
      {courseId && teeSetId && (
        <div style={{ color: '#555' }}>
          <b>Selected:</b> {courses.find(c => c.id === courseId)?.name} • {teeLabel}
          {teeRS ? ` (${teeRS})` : ''}
        </div>
      )}

      {/* Hole preview */}
      <div style={{ overflowX: 'auto' }}>
        <h3 style={{ margin: '8px 0' }}>Hole Preview</h3>
        <table style={{ borderCollapse: 'collapse', minWidth: 760 }}>
          <thead>
            <tr>
              <th style={th}>#</th>
              {holes.map(h => <th key={h} style={th}>H{h}</th>)}
              <th style={th}>Out</th>
              <th style={th}>In</th>
              <th style={th}>Total</th>
            </tr>
          </thead>
          <tbody>
            {/* Par row */}
            <tr>
              <td style={td}><b>Par</b></td>
              {holes.map(h => <td key={h} style={tdCenter}>{parByHole.get(h) ?? '-'}</td>)}
              <td style={tdCenter}>{sumRange(parByHole, 1, 9) ?? '-'}</td>
              <td style={tdCenter}>{sumRange(parByHole, 10, 18) ?? '-'}</td>
              <td style={tdCenter}><b>{sumRange(parByHole, 1, 18) ?? '-'}</b></td>
            </tr>
            {/* Yardage row */}
            <tr>
              <td style={td}><b>Yards</b></td>
              {holes.map(h => <td key={h} style={tdRight}>{ydgByHole.get(h) ?? '-'}</td>)}
              <td style={tdRight}>{sumRange(ydgByHole, 1, 9) ?? '-'}</td>
              <td style={tdRight}>{sumRange(ydgByHole, 10, 18) ?? '-'}</td>
              <td style={tdRight}><b>{sumRange(ydgByHole, 1, 18) ?? '-'}</b></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <button
          onClick={createRound}
          disabled={!courseId || !teeSetId || !name.trim()}
          style={{ padding: '10px 14px' }}
        >
          Create Round
        </button>
      </div>

      {msg && <div style={{ color: '#c00' }}>{msg}</div>}
    </div>
  )
}

/* helpers + styles */
function sumRange(map: Map<number, number | null>, start: number, end: number) {
  let s = 0
  for (let h = start; h <= end; h++) {
    const v = map.get(h)
    if (typeof v === 'number') s += v
  }
  return s || null
}

const th: React.CSSProperties = { textAlign: 'left', padding: 6, borderBottom: '1px solid #eee', background: '#fafafa', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: 6, borderBottom: '1px solid #f2f2f2' }
const tdCenter: React.CSSProperties = { ...td, textAlign: 'center' }
const tdRight: React.CSSProperties = { ...td, textAlign: 'right' }
const input: React.CSSProperties = { width: '100%', padding: 6, border: '1px solid #ddd', borderRadius: 6 }

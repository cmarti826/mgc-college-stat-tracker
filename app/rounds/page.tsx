'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type TeamOpt = { id: string; name: string }
type RoundRow = {
  id: string
  team_id: string
  name: string | null
  round_date: string | null
  status: 'open' | 'scheduled' | 'closed' | string | null
  sg_model: 'pga_tour' | 'ncaa_d1' | string | null
  courses?: { name: string | null } | null
  tee_sets?: { tee_name?: string | null; name?: string | null; rating?: number | null; slope?: number | null } | null
}

export default function RoundsPage() {
  const [teams, setTeams] = useState<TeamOpt[]>([])
  const [teamId, setTeamId] = useState<string>('')     // filter
  const [status, setStatus] = useState<string>('all')  // filter
  const [rows, setRows] = useState<RoundRow[]>([])
  const [msg, setMsg] = useState<string>('')

  // load teams the user belongs to (via team_members), and select one by default
  useEffect(() => {
    ;(async () => {
      setMsg('')
      const { data: tm, error } = await supabase
        .from('team_members')
        .select('team_id, teams(name)')
        .order('team_id', { ascending: true })

      if (error) { setMsg(error.message); return }

      const seen = new Set<string>()
      const opts: TeamOpt[] = []
      ;(tm as any[] || []).forEach(t => {
        const id = t.team_id as string
        if (!seen.has(id)) {
          seen.add(id)
          opts.push({ id, name: t.teams?.name ?? '(unnamed team)' })
        }
      })
      setTeams(opts)
      if (!teamId && opts.length) setTeamId(opts[0].id)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // load rounds whenever filters change
  useEffect(() => {
    if (!teamId) { setRows([]); return }
    ;(async () => {
      setMsg('')
      let query = supabase
        .from('rounds')
        // related tables may come back as arrays -> normalize below
        .select('id, team_id, name, round_date, status, sg_model, courses(name), tee_sets(tee_name, name, rating, slope)')
        .eq('team_id', teamId)
        .order('round_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (status !== 'all') {
        query = query.eq('status', status)
      }

      const { data, error } = await query
      if (error) { setMsg(error.message); return }

      const list = ((data as any[]) || []).map((r) => {
        const c = Array.isArray(r.courses) ? (r.courses[0] ?? null) : (r.courses ?? null)
        const t = Array.isArray(r.tee_sets) ? (r.tee_sets[0] ?? null) : (r.tee_sets ?? null)
        const out: RoundRow = {
          id: r.id,
          team_id: r.team_id,
          name: r.name ?? null,
          round_date: r.round_date ?? null,
          status: r.status ?? null,
          sg_model: r.sg_model ?? null,
          courses: c ? { name: c.name ?? null } : null,
          tee_sets: t ? {
            tee_name: t.tee_name ?? null,
            name: t.name ?? null,
            rating: t.rating ?? null,
            slope: t.slope ?? null,
          } : null,
        }
        return out
      }) as RoundRow[]

      setRows(list)
    })()
  }, [teamId, status])

  const teamName = useMemo(
    () => teams.find(t => t.id === teamId)?.name || '',
    [teams, teamId]
  )

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 12 }}>Rounds</h1>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <label>
          Team{' '}
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">Select team</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>

        <label>
          Status{' '}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="scheduled">Scheduled</option>
            <option value="closed">Closed</option>
          </select>
        </label>

        <Link href="/schedule" style={{ marginLeft: 'auto' }}>
          <button>Create Round</button>
        </Link>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 780 }}>
          <thead>
            <tr>
              <Th>When</Th>
              <Th>Round</Th>
              <Th>Course / Tee</Th>
              <Th>Model</Th>
              <Th>Status</Th>
              <Th /> {/* empty header for action buttons */}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <Td colSpan={6} style={{ color: '#666' }}>
                  {teamId ? 'No rounds yet.' : 'Pick a team to view rounds.'}
                </Td>
              </tr>
            ) : (
              rows.map(r => {
                const d = r.round_date ? new Date(r.round_date) : null
                const date = d ? d.toLocaleDateString() : ''
                const course = r.courses?.name || ''
                const teeName = r.tee_sets?.tee_name || r.tee_sets?.name || ''
                const rs = [
                  (r.tee_sets?.rating ? `${r.tee_sets.rating}` : ''),
                  (r.tee_sets?.slope ? `/${r.tee_sets.slope}` : '')
                ].join('')
                return (
                  <tr key={r.id}>
                    <Td style={{ whiteSpace: 'nowrap' }}>{date}</Td>
                    <Td>
                      <div style={{ fontWeight: 600 }}>{r.name || '(unnamed round)'}</div>
                      <div style={{ color: '#777', fontSize: 12 }}>{teamName}</div>
                    </Td>
                    <Td>
                      <div>{course || '-'}</div>
                      <div style={{ color: '#777', fontSize: 12 }}>
                        {teeName ? teeName : '-'} {rs ? `(${rs})` : ''}
                      </div>
                    </Td>
                    <Td style={{ whiteSpace: 'nowrap' }}>
                      {r.sg_model || 'pga_tour'}
                    </Td>
                    <Td>
                      <StatusChip status={(r.status as any) || 'scheduled'} />
                    </Td>
                    <Td style={{ textAlign: 'right' }}>
                      <Link href={`/rounds/${r.id}/score`}>
                        <button>Score</button>
                      </Link>
                    </Td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {msg && <div style={{ marginTop: 10, color: '#c00' }}>{msg}</div>}
    </div>
  )
}

/* --- tiny presentational bits --- */
function StatusChip({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    open: { bg: '#e8f5e9', fg: '#1b5e20' },
    scheduled: { bg: '#fff8e1', fg: '#8d6e00' },
    closed: { bg: '#f3e5f5', fg: '#4a148c' },
  }
  const c = map[status] || { bg: '#eeeeee', fg: '#424242' }
  return (
    <span style={{
      background: c.bg,
      color: c.fg,
      padding: '2px 8px',
      borderRadius: 999,
      fontSize: 12,
      border: '1px solid #00000010',
      whiteSpace: 'nowrap'
    }}>
      {status}
    </span>
  )
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th style={{ textAlign: 'left', padding: 8, background: '#fafafa', borderBottom: '1px solid #eee' }}>{children}</th>
}
function Td({ children, ...rest }: React.DetailedHTMLProps<React.TdHTMLAttributes<HTMLTableCellElement>, HTMLTableCellElement>) {
  return <td {...rest} style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>{children}</td>
}

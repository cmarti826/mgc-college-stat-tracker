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

export default function OpenScoringPage() {
  const [userId, setUserId] = useState<string | null>(null)

  const [teams, setTeams] = useState<TeamOpt[]>([])
  const [teamId, setTeamId] = useState<string>('all')     // "all" or a specific team id
  const [onlyMine, setOnlyMine] = useState<boolean>(false)

  const [rows, setRows] = useState<RoundRow[]>([])
  const [mineSet, setMineSet] = useState<Set<string>>(new Set()) // round_ids I’m on
  const [msg, setMsg] = useState<string>('')

  // get current user id
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      setUserId(data?.user?.id ?? null)
    })()
  }, [])

  // load my teams (via membership)
  useEffect(() => {
    ;(async () => {
      setMsg('')
      const { data, error } = await supabase
        .from('team_members')
        .select('team_id, teams(name)')
        .order('team_id', { ascending: true })

      if (error) { setMsg(error.message); return }

      const seen = new Set<string>()
      const opts: TeamOpt[] = []
      ;(data as any[] || []).forEach(t => {
        const id = t.team_id as string
        if (!seen.has(id)) {
          seen.add(id)
          opts.push({ id, name: t.teams?.name ?? '(unnamed team)' })
        }
      })
      setTeams(opts)
      if (opts.length && teamId === 'all') {
        // keep 'all' as default; user can narrow to a team
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // load open rounds when filters change
  useEffect(() => {
    ;(async () => {
      setMsg('')
      let query = supabase
        .from('rounds')
        .select('id, team_id, name, round_date, status, sg_model, courses(name), tee_sets(tee_name, name, rating, slope)')
        .eq('status', 'open')
        .order('round_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (teamId !== 'all') {
        query = query.eq('team_id', teamId)
      }

      const { data, error } = await query
      if (error) { setRows([]); setMsg(error.message); return }

      const list = (data as RoundRow[]) || []
      setRows(list)

      // figure out which of these rounds I'm on
      if (userId && list.length) {
        const ids = list.map(r => r.id)
        const { data: rp, error: rpErr } = await supabase
          .from('round_players')
          .select('round_id')
          .eq('user_id', userId)
          .in('round_id', ids)

        if (!rpErr) {
          setMineSet(new Set((rp as any[]).map(r => r.round_id as string)))
        } else {
          setMineSet(new Set())
        }
      } else {
        setMineSet(new Set())
      }
    })()
  }, [teamId, userId])

  const filtered = useMemo(() => {
    if (!onlyMine || !userId) return rows
    return rows.filter(r => mineSet.has(r.id))
  }, [rows, onlyMine, mineSet, userId])

  const hasTeams = teams.length > 0

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 12 }}>Open Scoring</h1>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <label>
          Team{' '}
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="all">All my teams</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>

        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
          Only rounds I’m playing
        </label>

        <Link href="/schedule" style={{ marginLeft: 'auto' }}>
          <button>Create Round</button>
        </Link>
        <Link href="/rounds">
          <button>All Rounds</button>
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
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <Td colSpan={6} style={{ color: '#666' }}>
                  {!hasTeams
                    ? 'You don’t belong to any teams yet.'
                    : 'No open rounds match your filters.'}
                </Td>
              </tr>
            ) : (
              filtered.map(r => {
                const d = r.round_date ? new Date(r.round_date) : null
                const date = d ? d.toLocaleDateString() : ''
                const course = r.courses?.name || ''
                const teeName = r.tee_sets?.tee_name || r.tee_sets?.name || ''
                const rs = [
                  (r.tee_sets?.rating ? `${r.tee_sets.rating}` : ''),
                  (r.tee_sets?.slope ? `/${r.tee_sets.slope}` : '')
                ].join('')
                const mine = userId ? mineSet.has(r.id) : false
                return (
                  <tr key={r.id}>
                    <Td style={{ whiteSpace: 'nowrap' }}>{date}</Td>
                    <Td>
                      <div style={{ fontWeight: 600 }}>{r.name || '(unnamed round)'}</div>
                      <div style={{ color: '#777', fontSize: 12 }}>
                        {teams.find(t => t.id === r.team_id)?.name ?? ''}
                      </div>
                    </Td>
                    <Td>
                      <div>{course || '-'}</div>
                      <div style={{ color: '#777', fontSize: 12 }}>
                        {teeName ? teeName : '-'} {rs ? `(${rs})` : ''}
                      </div>
                    </Td>
                    <Td style={{ whiteSpace: 'nowrap' }}>{r.sg_model || 'pga_tour'}</Td>
                    <Td>
                      <StatusChip status={(r.status as any) || 'open'} />
                      {mine && <span style={{ marginLeft: 8, color: '#1b5e20', fontSize: 12 }}>(you)</span>}
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

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: 'left', padding: 8, background: '#fafafa', borderBottom: '1px solid #eee' }}>{children}</th>
}
function Td({ children, ...rest }: React.DetailedHTMLProps<React.TdHTMLAttributes<HTMLTableCellElement>, HTMLTableCellElement>) {
  return <td {...rest} style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>{children}</td>
}

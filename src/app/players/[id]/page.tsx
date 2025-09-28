'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Player = { id: string; display_name: string; graduation_year: number|null }
type Round = { id: string; team_id: string|null; event_id: string|null; start_time: string|null; status: string }
type VTotal = { round_id: string; strokes: number|null; to_par: number|null }
type SgAgg = { round_id: string; sg_ott: number|null; sg_app: number|null; sg_arg: number|null; sg_putt: number|null }

export default function PlayerReportPage() {
  const { id } = useParams<{ id: string }>()
  const playerId = id

  const [player, setPlayer] = useState<Player | null>(null)
  const [rounds, setRounds] = useState<Round[]>([])
  const [totals, setTotals] = useState<Record<string, VTotal>>({})
  const [sg, setSg] = useState<Record<string, SgAgg>>({})

  const [err, setErr] = useState<string|null>(null)

  useEffect(() => {
    ;(async () => {
      setErr(null)

      // player info
      const { data: p, error: ep } = await supabase
        .from('players')
        .select('id,display_name,graduation_year')
        .eq('id', playerId).single()
      if (ep) { setErr(ep.message); return }
      setPlayer(p as Player)

      // recent rounds (limit 50)
      const { data: rd } = await supabase
        .from('rounds')
        .select('id,team_id,event_id,start_time,status')
        .eq('player_id', playerId)
        .order('start_time', { ascending: false })
        .limit(50)
      const rds = (rd ?? []) as Round[]
      setRounds(rds)

      // v_round_totals
      if (rds.length) {
        const rids = rds.map(r => r.id)
        const [{ data: vt }, { data: ah }] = await Promise.all([
          supabase.from('v_round_totals').select('round_id,strokes,to_par').in('round_id', rids as any),
          supabase.from('round_holes')
            .select('round_id, sg_ott, sg_app, sg_arg, sg_putt')
            .in('round_id', rids as any)
        ])
        const tmap: Record<string, VTotal> = {}
        for (const row of (vt ?? []) as VTotal[]) tmap[row.round_id] = row
        setTotals(tmap)

        // aggregate SG by round
        const agg: Record<string, SgAgg> = {}
        for (const r of rids) agg[r] = { round_id: r, sg_ott: 0, sg_app: 0, sg_arg: 0, sg_putt: 0 }
        for (const row of (ah ?? []) as any[]) {
          const o = agg[row.round_id]
          if (!o) continue
          o.sg_ott = (o.sg_ott ?? 0) + (row.sg_ott ?? 0)
          o.sg_app = (o.sg_app ?? 0) + (row.sg_app ?? 0)
          o.sg_arg = (o.sg_arg ?? 0) + (row.sg_arg ?? 0)
          o.sg_putt = (o.sg_putt ?? 0) + (row.sg_putt ?? 0)
        }
        setSg(agg)
      } else {
        setTotals({}); setSg({})
      }
    })()
  }, [playerId])

  // KPIs from submitted rounds first, else all
  const submitted = useMemo(() => rounds.filter(r => r.status === 'submitted'), [rounds])
  const sample = submitted.length ? submitted : rounds

  const avgToPar = useMemo(() => {
    const vals = sample.map(r => totals[r.id]?.to_par).filter(v => typeof v === 'number') as number[]
    if (!vals.length) return null
    const avg = vals.reduce((a,b)=>a+b,0)/vals.length
    return Math.round(avg*10)/10
  }, [sample, totals])

  const avgSg = useMemo(() => {
    if (!sample.length) return null
    let o=0, a=0, g=0, p=0, c=0
    for (const r of sample) {
      const s = sg[r.id]
      if (!s) continue
      if (typeof s.sg_ott === 'number') o += s.sg_ott
      if (typeof s.sg_app === 'number') a += s.sg_app
      if (typeof s.sg_arg === 'number') g += s.sg_arg
      if (typeof s.sg_putt === 'number') p += s.sg_putt
      c++
    }
    if (!c) return null
    const f = (x:number)=>Math.round((x/c)*10)/10
    return { ott:f(o), app:f(a), arg:f(g), putt:f(p) }
  }, [sample, sg])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{player?.display_name ?? 'Player'}</h1>
          <div className="text-sm text-gray-600">
            Grad: {player?.graduation_year ?? '—'}
          </div>
        </div>
        <Link className="rounded border px-3 py-1.5" href="/reports/team">← Team Reports</Link>
      </div>

      {err && <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{err}</div>}

      {/* KPI tiles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile title="Rounds (shown)" value={String(sample.length)} />
        <Tile title="Avg To-Par" value={avgToPar == null ? '—' : (avgToPar > 0 ? `+${avgToPar}` : String(avgToPar))} />
        <Tile title="SG: Off-the-Tee" value={avgSg ? fmt(avgSg.ott) : '—'} />
        <Tile title="SG: Approach" value={avgSg ? fmt(avgSg.app) : '—'} />
        <Tile title="SG: Around-Green" value={avgSg ? fmt(avgSg.arg) : '—'} />
        <Tile title="SG: Putting" value={avgSg ? fmt(avgSg.putt) : '—'} />
      </div>

      {/* Recent rounds table */}
      <div className="rounded border bg-white">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="font-semibold">Recent Rounds</div>
          <div className="text-sm text-gray-600">{submitted.length}/{rounds.length} submitted</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">When</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Strokes</th>
                <th className="px-3 py-2 text-right">To-Par</th>
                <th className="px-3 py-2 text-right">SG OTT</th>
                <th className="px-3 py-2 text-right">SG APP</th>
                <th className="px-3 py-2 text-right">SG ARG</th>
                <th className="px-3 py-2 text-right">SG PUTT</th>
                <th className="px-3 py-2 text-right">Open</th>
              </tr>
            </thead>
            <tbody>
              {rounds.length ? rounds.map(r => {
                const vt = totals[r.id]
                const s  = sg[r.id]
                return (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">{r.start_time?.slice(0,19).replace('T',' ') ?? '—'}</td>
                    <td className="px-3 py-2">{r.status}</td>
                    <td className="px-3 py-2 text-right">{vt?.strokes ?? '—'}</td>
                    <td className="px-3 py-2 text-right">{vt?.to_par == null ? '—' : (vt.to_par > 0 ? `+${vt.to_par}` : vt.to_par)}</td>
                    <td className="px-3 py-2 text-right">{s?.sg_ott == null ? '—' : fixed1(s.sg_ott)}</td>
                    <td className="px-3 py-2 text-right">{s?.sg_app == null ? '—' : fixed1(s.sg_app)}</td>
                    <td className="px-3 py-2 text-right">{s?.sg_arg == null ? '—' : fixed1(s.sg_arg)}</td>
                    <td className="px-3 py-2 text-right">{s?.sg_putt == null ? '—' : fixed1(s.sg_putt)}</td>
                    <td className="px-3 py-2 text-right">
                      <Link href={`/rounds/${r.id}`} className="underline text-[#0033A0]">Open</Link>
                    </td>
                  </tr>
                )
              }) : (
                <tr><td className="px-3 py-4 text-gray-600" colSpan={9}>No rounds yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Tile({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded border bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{title}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  )
}
function fmt(v:number){ return v>0?`+${fixed1(v)}`:fixed1(v) }
function fixed1(n:number){ return (Math.round(n*10)/10).toFixed(1) }

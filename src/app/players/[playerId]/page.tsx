'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type RoundRow = {
  round_id:string; played_at:string|null; status:string;
  strokes:number|null; to_par:number|null;
  sg_ott:number|null; sg_app:number|null; sg_arg:number|null; sg_putt:number|null;
  fw_hits:number|null; fw_opps:number|null; gir_hits:number|null; holes:number|null
}

export default function PlayerReportPage() {
  const { playerId } = useParams<{playerId:string}>()
  const [name, setName] = useState<string>('Player')
  const [rows, setRows] = useState<RoundRow[]>([])
  const [err, setErr] = useState<string|null>(null)

  const load = async () => {
    setErr(null)
    const [{ data: p }, { data, error }] = await Promise.all([
      supabase.from('players').select('display_name').eq('id', playerId).single(),
      supabase.from('v_player_rounds').select('*').eq('player_id', playerId).order('played_at', { ascending:false }),
    ])
    if (p?.display_name) setName(p.display_name)
    if (error) setErr(error.message)
    else setRows((data ?? []) as RoundRow[])
  }
  useEffect(() => { load() }, [playerId])

  const totals = useMemo(() => {
    if (!rows.length) return null
    const s = (k: keyof RoundRow) => rows.reduce((a,r)=> a + Number(r[k] ?? 0), 0)
    const fwOpp = rows.reduce((a,r)=> a + Number(r.fw_opps ?? 0), 0)
    const res = {
      rds: rows.length,
      strokes: s('strokes'),
      to_par: s('to_par'),
      sg_ott: s('sg_ott'), sg_app: s('sg_app'), sg_arg: s('sg_arg'), sg_putt: s('sg_putt'),
      fw_pct: fwOpp ? (rows.reduce((a,r)=> a + Number(r.fw_hits ?? 0),0) / fwOpp) : null,
      gir_pct: (() => {
        const holes = rows.reduce((a,r)=> a + Number(r.holes ?? 0), 0)
        const gir = rows.reduce((a,r)=> a + Number(r.gir_hits ?? 0), 0)
        return holes ? gir/holes : null
      })(),
    }
    return res
  }, [rows])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{name} — Report</h1>
      {err && <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{err}</div>}

      {totals && (
        <div className="grid gap-3 rounded border bg-white p-3 sm:grid-cols-3">
          <Stat label="Rounds" value={totals.rds}/>
          <Stat label="To Par" value={totals.to_par}/>
          <Stat label="Strokes Gained (Total)" value={(totals.sg_ott+totals.sg_app+totals.sg_arg+totals.sg_putt).toFixed(2)}/>
          <Stat label="SG OTT" value={totals.sg_ott.toFixed(2)}/>
          <Stat label="SG APP" value={totals.sg_app.toFixed(2)}/>
          <Stat label="SG ARG" value={totals.sg_arg.toFixed(2)}/>
          <Stat label="SG PUTT" value={totals.sg_putt.toFixed(2)}/>
          <Stat label="Fairways" value={totals.fw_pct!=null ? `${Math.round(totals.fw_pct*100)}%` : '—'}/>
          <Stat label="GIR" value={totals.gir_pct!=null ? `${Math.round(totals.gir_pct*100)}%` : '—'}/>
        </div>
      )}

      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Played</th>
              <th className="px-3 py-2 text-right">Strokes</th>
              <th className="px-3 py-2 text-right">To Par</th>
              <th className="px-3 py-2 text-right">SG OTT</th>
              <th className="px-3 py-2 text-right">SG APP</th>
              <th className="px-3 py-2 text-right">SG ARG</th>
              <th className="px-3 py-2 text-right">SG PUTT</th>
              <th className="px-3 py-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.round_id} className="border-t">
                <td className="px-3 py-2">{r.played_at?.slice(0,10) ?? '—'}</td>
                <td className="px-3 py-2 text-right">{r.strokes ?? '—'}</td>
                <td className="px-3 py-2 text-right">{r.to_par!=null ? (r.to_par>0?`+${r.to_par}`:r.to_par) : '—'}</td>
                <td className="px-3 py-2 text-right">{fmt(r.sg_ott)}</td>
                <td className="px-3 py-2 text-right">{fmt(r.sg_app)}</td>
                <td className="px-3 py-2 text-right">{fmt(r.sg_arg)}</td>
                <td className="px-3 py-2 text-right">{fmt(r.sg_putt)}</td>
                <td className="px-3 py-2 text-right">{r.status}</td>
              </tr>
            ))}
            {!rows.length && <tr><td className="px-3 py-4 text-gray-600" colSpan={8}>No rounds yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
function Stat({label, value}:{label:string; value:any}) {
  return <div className="rounded border p-3"><div className="text-xs text-gray-600">{label}</div><div className="text-lg font-semibold">{value}</div></div>
}
function fmt(n:any){ return n==null ? '—' : Number(n).toFixed(2) }

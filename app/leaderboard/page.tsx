'use client'
import { supabase } from '@/lib/supabaseClient'
import { useEffect, useState } from 'react'


type LB = { round_id:string; round_date:string; name:string|null; player_name:string; total_strokes:number|null; sg_total:number|null }


export default function Leaderboard(){
const [rows,setRows]=useState<LB[]>([])
useEffect(()=>{
(async()=>{
const { data, error } = await supabase
.from('v_round_leaderboard')
.select('*')
.order('round_date',{ascending:false})
if(error) alert(error.message); else setRows(data as any||[])
})()
},[])
return (
<div>
<h2>Leaderboard (latest first)</h2>
<table>
<thead><tr><th>Date</th><th>Round</th><th>Player</th><th>Strokes</th><th>SG Total</th></tr></thead>
<tbody>
{rows.map((r,i)=> (
<tr key={i}>
<td>{new Date(r.round_date).toLocaleDateString()}</td>
<td>{r.name||r.round_id.slice(0,8)}</td>
<td>{r.player_name}</td>
<td>{r.total_strokes??''}</td>
<td>{r.sg_total??''}</td>
</tr>
))}
</tbody>
</table>
</div>
)
}
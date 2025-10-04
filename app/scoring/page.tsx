'use client'
},[])


useEffect(()=>{
if(!roundId) return
(async()=>{
const { data } = await supabase
.from('round_players')
.select('user_id: user_id, auth_users:auth.users!inner(id,email), profiles:profiles!inner(full_name)')
.eq('round_id', roundId)


// Map into Player shape
const mapped = (data||[]).map((d:any)=>({
id: d.auth_users.id,
email: d.auth_users.email,
profiles: { full_name: d.profiles?.full_name||null }
}))
setPlayers(mapped)
})()
},[roundId])


const save = async () => {
if(!roundId || !userId) return alert('Select round and player')
const payloads = rows.map(r=> ({
p_round: roundId,
p_user: userId,
p_hole: r.hole,
p_strokes: r.strokes,
p_putts: r.putts,
p_fir: r.fir,
p_gir: r.gir,
p_up_down: r.up_down,
p_sand_save: r.sand_save,
p_penalties: r.penalties,
p_sg_ott: r.sg_ott,
p_sg_app: r.sg_app,
p_sg_arg: r.sg_arg,
p_sg_putt: r.sg_putt,
p_notes: r.notes
}))


for (const p of payloads) {
const { error } = await supabase.rpc('upsert_score', p)
if(error) return alert(`Hole ${p.p_hole}: ${error.message}`)
}
alert('Saved!')
}


return (
<div>
<h2>Open Scoring</h2>
<div style={{display:'flex', gap:12, alignItems:'center'}}>
<label>Round
<select value={roundId} onChange={e=>{setRoundId(e.target.value); setUserId('')}}>
<option value="">Select</option>
{rounds.map(r=> (
<option key={r.id} value={r.id}>{new Date(r.round_date).toLocaleDateString()} — {r.courses?.name} {r.name?`(${r.name})`:''}</option>
))}
</select>
</label>
<label>Player
<select value={userId} onChange={e=>setUserId(e.target.value)}>
<option value="">Select</option>
{players.map(p=> (
<option key={p.id} value={p.id}>{p.profiles?.full_name || p.email}</option>
))}
</select>
</label>
<button onClick={save}>Save All 18</button>
</div>


<table style={{marginTop:16, borderCollapse:'collapse'}}>
<thead>
<tr>
<th>Hole</th><th>Strokes</th><th>Putts</th><th>FIR</th><th>GIR</th><th>Up&Down</th><th>Sand</th><th>Pen</th><th>SG OTT</th><th>SG APP</th><th>SG ARG</th><th>SG PUTT</th><th>Notes</th>
</tr>
</thead>
<tbody>
{rows.map((r,idx)=> (
<tr key={r.hole}>
<td>{r.hole}</td>
<td><input type="number" value={r.strokes} onChange={e=>{const v=[...rows]; v[idx].strokes=parseInt(e.target.value); setRows(v)}}/></td>
<td><input type="number" value={r.putts} onChange={e=>{const v=[...rows]; v[idx].putts=parseInt(e.target.value); setRows(v)}}/></td>
<td><input type="checkbox" checked={!!r.fir} onChange={e=>{const v=[...rows]; v[idx].fir=e.target.checked; setRows(v)}}/></td>
<td><input type="checkbox" checked={!!r.gir} onChange={e=>{const v=[...rows]; v[idx].gir=e.target.checked; setRows(v)}}/></td>
<td><input type="checkbox" checked={!!r.up_down} onChange={e=>{const v=[...rows]; v[idx].up_down=e.target.checked; setRows(v)}}/></td>
<td><input type="checkbox" checked={!!r.sand_save} onChange={e=>{const v=[...rows]; v[idx].sand_save=e.target.checked; setRows(v)}}/></td>
<td><input type="number" value={r.penalties} onChange={e=>{const v=[...rows]; v[idx].penalties=parseInt(e.target.value); setRows(v)}}/></td>
<td><input type="number" step="0.01" value={r.sg_ott} onChange={e=>{const v=[...rows]; v[idx].sg_ott=parseFloat(e.target.value); setRows(v)}}/></td>
<td><input type="number" step="0.01" value={r.sg_app} onChange={e=>{const v=[...rows]; v[idx].sg_app=parseFloat(e.target.value); setRows(v)}}/></td>
<td><input type="number" step="0.01" value={r.sg_arg} onChange={e=>{const v=[...rows]; v[idx].sg_arg=parseFloat(e.target.value); setRows(v)}}/></td>
<td><input type="number" step="0.01" value={r.sg_putt} onChange={e=>{const v=[...rows]; v[idx].sg_putt=parseFloat(e.target.value); setRows(v)}}/></td>
<td><input value={r.notes} onChange={e=>{const v=[...rows]; v[idx].notes=e.target.value; setRows(v)}}/></td>
</tr>
))}
</tbody>
</table>
</div>
)
}
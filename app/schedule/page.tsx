'use client'
import { supabase } from '@/lib/supabaseClient'
import { useEffect, useState } from 'react'


type Course = { id:string; name:string; tee_sets:{ id:string; name:string }[] }


type Team = { id:string; name:string }


export default function Schedule() {
const [teams,setTeams]=useState<Team[]>([])
const [courses,setCourses]=useState<Course[]>([])
const [teamId,setTeamId]=useState('')
const [courseId,setCourseId]=useState('')
const [teeId,setTeeId]=useState('')
const [date,setDate]=useState<string>('')
const [name,setName]=useState('')
const [type,setType]=useState<'tournament'|'qualifying'|'practice'>('practice')


useEffect(()=>{
(async()=>{
const t = await supabase.from('teams').select('id,name').order('name')
setTeams(t.data||[])
const c = await supabase.from('courses').select('id,name,tee_sets(id,name)').order('name')
setCourses(c.data as any||[])
})()
},[])


const createRound = async () => {
if(!teamId || !courseId || !teeId || !date) return alert('Missing fields')
const { data, error } = await supabase.from('rounds').insert({
team_id: teamId,
course_id: courseId,
tee_set_id: teeId,
round_date: date,
name,
type,
status: 'open'
}).select('id').single()
if(error) return alert(error.message)
alert(`Round created: ${data.id}`)
}


return (
<div>
<h2>Create Round</h2>
<div style={{display:'grid', gap:8, maxWidth:560}}>
<label>Team
<select value={teamId} onChange={e=>setTeamId(e.target.value)}>
<option value="">Select</option>
{teams.map(t=>(<option key={t.id} value={t.id}>{t.name}</option>))}
</select>
</label>
<label>Course
<select value={courseId} onChange={e=>{setCourseId(e.target.value); setTeeId('')}}>
<option value="">Select</option>
{courses.map(c=>(<option key={c.id} value={c.id}>{c.name}</option>))}
</select>
</label>
<label>Tee Set
<select value={teeId} onChange={e=>setTeeId(e.target.value)}>
<option value="">Select</option>
{courses.find(c=>c.id===courseId)?.tee_sets.map(t=>(<option key={t.id} value={t.id}>{t.name}</option>))}
</select>
</label>
<label>Date <input type="date" value={date} onChange={e=>setDate(e.target.value)} /></label>
<label>Name <input value={name} onChange={e=>setName(e.target.value)} placeholder="Optional label"/></label>
<label>Type
<select value={type} onChange={e=>setType(e.target.value as any)}>
<option value="practice">Practice</option>
<option value="qualifying">Qualifying</option>
<option value="tournament">Tournament</option>
</select>
</label>
<button onClick={createRound}>Create Round (Open)</button>
</div>
</div>
)
}
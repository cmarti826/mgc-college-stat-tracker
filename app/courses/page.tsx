'use client'
import { supabase } from '@/lib/supabaseClient'
import { useEffect, useState } from 'react'


type Course = { id: string; name: string }


export default function Courses() {
const [name,setName]=useState('')
const [courses,setCourses]=useState<Course[]>([])
const [teeName,setTeeName]=useState('Blue')
const [teePar,setTeePar]=useState(72)
const [teeRating,setTeeRating]=useState<number|''>('' as any)
const [teeSlope,setTeeSlope]=useState<number|''>('' as any)


const load = async () => {
const { data } = await supabase.from('courses').select('id,name').order('name')
setCourses(data||[])
}
useEffect(()=>{load()},[])


const addCourse = async () => {
if(!name) return
const { error } = await supabase.from('courses').insert({ name })
if(error) alert(error.message); else { setName(''); load() }
}


const addTee = async (courseId:string) => {
const { error } = await supabase.from('tee_sets').insert({
course_id: courseId,
name: teeName,
par: teePar,
rating: teeRating||null,
slope: teeSlope||null
})
if(error) alert(error.message); else alert('Tee set added')
}


return (
<div>
<h2>Courses</h2>
<div>
<input placeholder="Course name" value={name} onChange={e=>setName(e.target.value)} />
<button onClick={addCourse}>Add Course</button>
</div>
<hr/>
<h3>Add Tee Set to a Course</h3>
<div style={{display:'flex', gap:8, alignItems:'center'}}>
<label>Tee Name</label><input value={teeName} onChange={e=>setTeeName(e.target.value)} />
<label>Par</label><input type="number" value={teePar} onChange={e=>setTeePar(parseInt(e.target.value))} />
<label>Rating</label><input value={teeRating as any} onChange={e=>setTeeRating(e.target.value?parseFloat(e.target.value):'' as any)} />
<label>Slope</label><input value={teeSlope as any} onChange={e=>setTeeSlope(e.target.value?parseInt(e.target.value):'' as any)} />
</div>
<ul>
{courses.map(c=> (
<li key={c.id}>
{c.name} <button onClick={()=>addTee(c.id)}>Add Tee to this course</button>
</li>
))}
</ul>
</div>
)
}
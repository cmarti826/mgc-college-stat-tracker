'use client'
import { supabase } from '@/lib/supabaseClient'
import { useEffect, useState } from 'react'


export default function Home() {
const [email, setEmail] = useState('')
const [session, setSession] = useState<any>(null)


useEffect(() => {
supabase.auth.getSession().then(({ data }) => setSession(data.session))
const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
return () => sub.subscription.unsubscribe()
}, [])


const signIn = async () => {
await supabase.auth.signInWithOtp({ email })
alert('Magic link sent')
}


const signOut = async () => { await supabase.auth.signOut() }


if (!session) {
return (
<div>
<h1>MGC College Golf – MVP</h1>
<input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" />
<button onClick={signIn}>Send Magic Link</button>
</div>
)
}


return (
<div>
<h1>Dashboard</h1>
<p>{session.user.email}</p>
<nav style={{display:'flex', gap:12}}>
<a href="/courses">Courses</a>
<a href="/schedule">Schedule</a>
<a href="/scoring">Open Scoring</a>
<a href="/leaderboard">Leaderboard</a>
<button onClick={signOut}>Sign out</button>
</nav>
</div>
)
}
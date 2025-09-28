'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Course = { id: string; name: string; city: string | null; state: string | null }

export default function TestPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [errorText, setErrorText] = useState<string | null>(null)
  const [sessionInfo, setSessionInfo] = useState('checking...')

  useEffect(() => {
    const load = async () => {
      try {
        const { data: sess } = await supabase.auth.getSession()
        setSessionInfo(sess.session ? 'signed-in' : 'anon')

        const { data, error } = await supabase
          .from('courses')
          .select('id,name,city,state')
          .order('name', { ascending: true })

        if (error) {
          setErrorText(`${error.code ?? ''} ${error.message} ${((error as any).details ?? '')}`)
          console.error('Supabase select error:', error)
          return
        }
        setCourses(data ?? [])
      } catch (e: any) {
        setErrorText(e?.message ?? 'Unknown client error')
        console.error('Client error:', e)
      }
    }
    load()
  }, [])

  return (
    <div className="p-6 space-y-3">
      <h1 className="text-2xl font-bold">Supabase Connectivity Test</h1>
      <p className="text-sm text-gray-600">Session: {sessionInfo}</p>
      {errorText && <pre className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{errorText}</pre>}
      <ul className="list-disc pl-6">
        {courses.map((c) => (
          <li key={c.id}>{c.name}{c.city ? ` — ${c.city}, ${c.state ?? ''}` : ''}</li>
        ))}
      </ul>
      {!errorText && courses.length === 0 && <p>No courses yet. (Run the seed or create one on /courses)</p>}
    </div>
  )
}

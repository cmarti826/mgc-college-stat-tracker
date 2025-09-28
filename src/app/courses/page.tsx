'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Course = { id: string; name: string; city: string | null; state: string | null }

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('id,name,city,state')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setCourses(data ?? [])
  }

  useEffect(() => {
    const init = async () => {
      const { data: u } = await supabase.auth.getUser()
      setUserId(u.user?.id ?? null)
      await load()
    }
    init()
  }, [])

  const createCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!userId) {
      setError('You must be signed in to create a course.')
      return
    }
    try {
      setLoading(true)
      const { error } = await supabase.from('courses').insert({
        name,
        city: city || null,
        state: state || null,
        created_by: userId, // RLS requires you own the course to edit later
      })
      if (error) throw error
      setName(''); setCity(''); setState('')
      await load()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create course')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Courses</h1>

      <form onSubmit={createCourse} className="space-y-2 rounded border bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Course name"
            className="min-w-[240px] flex-1 rounded border px-3 py-2"
            required
          />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="w-40 rounded border px-3 py-2"
          />
          <input
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="State"
            className="w-24 rounded border px-3 py-2"
          />
          <button type="submit" disabled={loading} className="rounded bg-[#0B6B3A] px-3 py-2 text-white disabled:opacity-50">
            {loading ? 'Creating…' : 'Create'}
          </button>
        </div>
        {error && <p className="text-red-600">{error}</p>}
      </form>

      <ul className="space-y-2">
        {courses.map((c) => (
          <li key={c.id} className="rounded border bg-white p-3">
            <div className="font-medium">
              <Link href={`/courses/${c.id}`} className="text-[#0033A0] underline">
                {c.name}
              </Link>
            </div>
            <div className="text-sm text-gray-600">
              {[c.city, c.state].filter(Boolean).join(', ')}
            </div>
          </li>
        ))}
      </ul>

      {!error && courses.length === 0 && (
        <p className="text-gray-700">No courses yet. Create your first course above.</p>
      )}
    </div>
  )
}

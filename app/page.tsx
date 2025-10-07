'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

type Course = { id: string; name: string; city: string | null; state: string | null }
type TeeSet = { id: string; course_id: string }

export default function HomePage() {
  const supabase = useMemo(() => supabaseBrowser(), [])
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [teeCounts, setTeeCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)

      // require login
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      // load user's courses
      const { data: courseRows, error: cErr } = await supabase
        .from('courses')
        .select('id,name,city,state')
        .order('name', { ascending: true })
      if (cErr) { alert(`Error loading courses: ${cErr.message}`); return }
      if (!alive) return

      setCourses(courseRows ?? [])

      // load tee sets (to compute counts per course)
      const { data: tees, error: tErr } = await supabase
        .from('tee_sets')
        .select('id,course_id')
      if (tErr) { console.warn('tee_sets load:', tErr.message) }

      const counts: Record<string, number> = {}
      ;(tees ?? []).forEach((t: TeeSet) => {
        counts[t.course_id] = (counts[t.course_id] ?? 0) + 1
      })
      if (!alive) return
      setTeeCounts(counts)

      setLoading(false)
    })()
    return () => { alive = false }
  }, [router, supabase])

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Courses</h1>
          <div className="flex gap-2">
            <span className="rounded-xl border px-3 py-1.5 bg-gray-50 animate-pulse">New Course</span>
            <span className="rounded-xl border px-3 py-1.5 bg-gray-50 animate-pulse">New Tee Set</span>
          </div>
        </div>
        <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Courses</h1>
        <div className="flex gap-2">
          <Link href="/courses/new" className="rounded-2xl border px-3 py-1.5 shadow hover:bg-gray-50">New Course</Link>
          <Link href="/tee-sets/new" className="rounded-2xl border px-3 py-1.5 shadow hover:bg-gray-50">New Tee Set</Link>
          <Link href="/rounds/new" className="rounded-2xl border px-3 py-1.5 shadow hover:bg-gray-50">Start Round</Link>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm">
          No courses yet. Create your first one:
          <Link href="/courses/new" className="ml-2 underline">Add Course</Link>
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map(c => {
            const count = teeCounts[c.id] ?? 0
            const location = [c.city, c.state].filter(Boolean).join(', ')
            return (
              <li key={c.id} className="rounded-2xl border p-4 shadow-sm bg-white flex flex-col gap-3">
                <div>
                  <div className="text-base font-semibold">{c.name}</div>
                  <div className="text-xs text-gray-500">{location || '—'}</div>
                </div>
                <div className="text-xs text-gray-600">
                  Tee sets: <span className="font-medium">{count}</span>
                </div>
                <div className="mt-auto flex gap-2">
                  <Link
                    href="/tee-sets/new"
                    className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
                    title="Create a tee set for this course"
                  >
                    Add Tee Set
                  </Link>
                  <Link
                    href="/rounds/new"
                    className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
                    title="Start a new round"
                  >
                    Start Round
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

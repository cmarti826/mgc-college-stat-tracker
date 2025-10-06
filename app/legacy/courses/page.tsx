'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Course = { id: string; name: string; city: string | null; state: string | null }

export default function CoursesIndex() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string>('')

  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase.from('courses').select('id,name,city,state').order('name')
      if (error) setMsg(error.message)
      setCourses((data as any) || [])
      setLoading(false)
    })()
  }, [])

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ margin: 0 }}>Courses</h1>
        <a href="/courses/new">
          <button>+ New Course</button>
        </a>
      </div>
      {msg && <div style={{ color: '#c00', marginTop: 8 }}>{msg}</div>}

      <div style={{ marginTop: 12, overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 640 }}>
          <thead>
            <tr>
              <th style={th}>Name</th>
              <th style={th}>City</th>
              <th style={th}>State</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td style={td} colSpan={4}>Loading…</td></tr>
            ) : courses.length === 0 ? (
              <tr><td style={td} colSpan={4}>No courses yet. Click “New Course”.</td></tr>
            ) : (
              courses.map((c) => (
                <tr key={c.id}>
                  <td style={td}>{c.name}</td>
                  <td style={td}>{c.city || ''}</td>
                  <td style={td}>{c.state || ''}</td>
                  <td style={td}>
                    <a href={`/courses/${c.id}`}>Edit Holes</a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const th: React.CSSProperties = { textAlign: 'left', padding: 8, borderBottom: '1px solid #eee', background: '#fafafa' }
const td: React.CSSProperties = { padding: 8, borderBottom: '1px solid #f2f2f2' }

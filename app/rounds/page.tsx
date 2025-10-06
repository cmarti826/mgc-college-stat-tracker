'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'

type RoundRow = {
  id: string
  round_date: string
  round_type: 'PRACTICE' | 'QUALIFYING' | 'TOURNAMENT'
  course: { name: string } | null
  tee: { name: string } | null
}

export default function RoundsIndexPage() {
  const supabase = useMemo(() => supabaseBrowser(), [])
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<RoundRow[]>([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/auth/login'; return }

      const { data, error } = await supabase
        .from('rounds')
        .select('id, round_date, round_type, course:courses(name), tee:tee_sets(name)')
        .order('round_date', { ascending: false })

      if (error) { alert(error.message); return }
      if (!alive) return
      setRows((data ?? []) as any)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [supabase])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Rounds</h1>
        <Link href="/rounds/new" className="rounded-2xl px-3 py-1.5 border">New Round</Link>
      </div>

      {loading ? (
        <div className="animate-pulse h-24 rounded-xl bg-gray-200" />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border p-4 text-sm">No rounds yet.</div>
      ) : (
        <div className="rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Course</th>
                <th className="p-2 text-left">Tee</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                  <td className="p-2">{r.round_date}</td>
                  <td className="p-2">{r.round_type}</td>
                  <td className="p-2">{r.course?.name ?? ''}</td>
                  <td className="p-2">{r.tee?.name ?? ''}</td>
                  <td className="p-2">
                    <Link className="underline" href={`/rounds/${r.id}`}>Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'

type Row = {
  id: string
  created_at: string
  course: { name: string }[] | { name: string } | null
  tee: { name: string }[] | { name: string } | null
  event_id: string | null
}

export default function RoundsListPage() {
  const supabase = useMemo(() => supabaseBrowser(), [])
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('rounds')
        .select(`
          id,
          created_at,
          event_id,
          course:courses ( name ),
          tee:tee_sets ( name )
        `)
        .order('created_at', { ascending: false })
        .limit(100)
      setRows((data as Row[]) ?? [])
      setLoading(false)
    })()
  }, [supabase])

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Rounds</h1>
        <Link
          href="/rounds/new"
          className="rounded-xl border px-3 py-1.5 hover:bg-gray-50"
        >
          New Round
        </Link>
      </div>

      <div className="rounded-2xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Course</th>
              <th className="p-2 text-left">Tee</th>
              <th className="p-2 text-left">Event?</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-3" colSpan={5}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="p-3" colSpan={5}>No rounds yet.</td></tr>
            ) : (
              rows.map(r => {
                const courseName = Array.isArray(r.course) ? r.course[0]?.name : (r.course as any)?.name
                const teeName = Array.isArray(r.tee) ? r.tee[0]?.name : (r.tee as any)?.name
                return (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="p-2">{courseName ?? '—'}</td>
                    <td className="p-2">{teeName ?? '—'}</td>
                    <td className="p-2">{r.event_id ? 'Yes' : '—'}</td>
                    <td className="p-2">
                      <Link href={`/rounds/${r.id}`} className="underline">Open</Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

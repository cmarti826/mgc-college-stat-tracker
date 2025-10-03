import { getSupabaseServer } from '@/lib/supabaseServer'
import Link from 'next/link'

export default async function SchedulePage() {
  const supabase = getSupabaseServer()
  const { data: rounds, error } = await supabase
    .from('v_schedule')
    .select('*')
    .order('date', { ascending: false })

  if (error) {
    return <div className="card">Error loading schedule: {error.message}</div>
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Schedule</h1>
      {(!rounds || rounds.length===0) && <div className="card">No rounds yet. <Link className="underline" href="/rounds/new">Create one</Link>.</div>}
      {rounds?.map(r => (
        <div key={r.round_id} className="card">
          <div className="flex justify-between">
            <div>
              <div className="font-semibold">{r.round_name ?? `${r.type} @ ${r.course_name}`}</div>
              <div className="text-sm text-gray-600">{r.date} • {r.team_name} • {r.course_name} ({r.tee_name})</div>
            </div>
            <div className="flex gap-2">
              <Link className="btn" href={`/rounds/${r.round_id}/score`}>Open Scoring</Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

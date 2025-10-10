'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function NewRoundPage() {
  const supabase = useMemo(() => supabaseBrowser(), [])
  const router = useRouter()

  const [courseId, setCourseId] = useState<string>('')
  const [teeSetId, setTeeSetId] = useState<string>('')
  const [eventId, setEventId] = useState<string>('') // optional
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function createRound(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      // Ensure authenticated
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Please sign in.')

      // (Optional) ensure player exists; DB trigger/default handles this anyway
      await supabase.rpc('ensure_player_for_current_user')

      const { data, error } = await supabase
        .from('rounds')
        .insert([{
          course_id: courseId || null,
          tee_set_id: teeSetId || null,
          event_id: eventId || null, // optional
          created_at: new Date().toISOString()
        }])
        .select('id')
        .single()

      if (error) throw error
      router.replace(`/rounds/${data!.id}`)
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to create round')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">New Round</h1>

      <form onSubmit={createRound} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Course ID (optional)</label>
          <input
            className="w-full rounded-xl border px-3 py-2"
            value={courseId}
            onChange={e => setCourseId(e.target.value)}
            placeholder="uuid"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Tee Set ID (optional)</label>
          <input
            className="w-full rounded-xl border px-3 py-2"
            value={teeSetId}
            onChange={e => setTeeSetId(e.target.value)}
            placeholder="uuid"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Event ID (optional)</label>
          <input
            className="w-full rounded-xl border px-3 py-2"
            value={eventId}
            onChange={e => setEventId(e.target.value)}
            placeholder="uuid (leave blank for open round)"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl border px-4 py-2 hover:bg-gray-50"
        >
          {saving ? 'Creating…' : 'Create Round'}
        </button>

        {err && <p className="text-sm text-red-600">{err}</p>}
      </form>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import ScoreForm from './ui'
import { getSupabaseBrowser } from '@/lib/supabaseClient'

type PageProps = { params: { id: string } }

export default function ScorePage({ params }: PageProps) {
  const supabase = getSupabaseBrowser()
  const [round, setRound] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string>('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setErr('')
      const { data, error } = await supabase
        .from('rounds')
        .select('id, name, round_date, status, sg_model, tee_set_id, team_id')
        .eq('id', params.id)
        .maybeSingle()
      if (!mounted) return
      if (error) { setErr(error.message); setRound(null) }
      else setRound(data)
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [params.id, supabase])

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>
  if (err) return <div style={{ padding: 16, color: '#c00' }}>{err}</div>
  if (!round) return <div style={{ padding: 16 }}>Round not found.</div>

  // NOTE: ScoreForm now only expects { round }.
  return <ScoreForm round={round} />
}

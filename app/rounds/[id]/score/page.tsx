import { getSupabaseServer } from '@/lib/supabaseServer'
import ScoreForm from './ui'

type Params = { params: { id: string } }

export default async function ScorePage({ params }: Params) {
  const supabase = getSupabaseServer()
  const roundId = params.id

  const [{ data: round }, { data: players }] = await Promise.all([
    supabase.from('v_schedule').select('*').eq('round_id', roundId).single(),
    supabase.from('profiles').select('id,full_name,email')
  ])

  return <ScoreForm round={round} players={players ?? []} />
}

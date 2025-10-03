import { getSupabaseServer } from '@/lib/supabaseServer'
import NewRoundForm from './ui'

export default async function NewRoundPage() {
  const supabase = getSupabaseServer()

  const [{ data: courses }, { data: tees }, { data: teams }] = await Promise.all([
    supabase.from('courses').select('id,name').order('name'),
    supabase.from('tee_sets').select('id,name,course_id').order('name'),
    supabase.from('teams').select('id,name').order('name')
  ])

  return <NewRoundForm courses={courses ?? []} tees={tees ?? []} teams={teams ?? []} />
}

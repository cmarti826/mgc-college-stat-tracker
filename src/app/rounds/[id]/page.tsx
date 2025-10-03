'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'

type RoundStatus = 'in_progress' | 'submitted' | 'final' | 'abandoned'

type RoundRow = {
  id: string
  player_id: string
  team_id: string | null
  event_id: string | null
  course_id: string | null
  course_tee_id: string | null
  status: RoundStatus
  start_time: string
}

type Course = { id: string; name: string; city: string | null; state: string | null }
type Tee = { id: string; tee_name: string; color: string | null; course_rating: number | null; slope_rating: number | null; total_yardage: number | null }
type HolePar = { hole_number: number; par: number }
type HoleYdg = { hole_number: number; yardage: number | null }
type HoleStat = { hole_number: number; strokes: number | null; to_par?: number | null; putts: number | null; penalties: number | null }

export default function RoundPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const [round, setRound] = useState<RoundRow | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [tee, setTee] = useState<Tee | null>(null)
  const [pars, setPars] = useState<HolePar[]>([])
  const [ydgs, setYdgs] = useState<HoleYdg[]>([])
  const [holes, setHoles] = useState<HoleStat[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true); setErr(null)

      const { data: r, error: re } = await supabase
        .from('rounds')
        .select('id, player_id, team_id, event_id, course_id, course_tee_id, status, start_time')
        .eq('id', params.id)
        .single()

      if (re || !r) {
        setErr(re?.message || 'Round not found')
        setLoading(false)
        return
      }
      setRound(r)

      const promises: Promise<any>[] = [
        supabase.from('round_holes').select('hole_number, strokes, putts, penalties').eq('round_id', r.id).order('hole_number'),
      ]

      if (r.course_id) {
        promises.push(
          supabase.from('courses').select('id,name,city,state').eq('id', r.course_id).single(),
          supabase.from('course_holes').select('hole_number, par').eq('course_id', r.course_id).order('hole_number'),
        )
      }
      if (r.course_tee_id) {
        promises.push(
          supabase.from('course_tees').select('id, tee_name, color, course_rating, slope_rating, total_yardage').eq('id', r.course_tee_id).single(),
          supabase.from('course_tee_holes').select('hole_number, yardage').eq('course_tee_id', r.course_tee_id).order('hole_number'),
        )
      }

      const results = await Promise.all(promises)

      // round_holes
      const rhRes = results[0]
      if (rhRes.error) console.error(rhRes.error)
      setHoles(rhRes.data ?? [])

      // course & pars
      if (r.course_id) {
        const courseRes = results[1]
        if (!courseRes.error) setCourse(courseRes.data)
        const parsRes = results[2]
        if (!parsRes.error) setPars(parsRes.data ?? [])
      }

      // tee & yardages
      if (r.course_tee_id) {
        const teeRes = results[r.course_id ? 3 : 1]
        if (!teeRes.error) setTee(teeRes.data)
        const ydgsRes = results[r.course_id ? 4 : 2]
        if (!ydgsRes.error) setYdgs(ydgsRes.data ?? [])
      }

      setLoading(false)
    }
    load()
  }, [params.id, supabase])

  const parMap = useMemo(() => Object.fromEntries(pars.map(p => [p.hole_number, p.par])), [pars])
  const ydgMap = useMemo(() => Object.fromEntries(ydgs.map(y => [y.hole_number, y.yardage])), [ydgs])

  if (loading) return <div className="p-4">Loading…</div>
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>
  if (!round) return <div className="p-4">Round not found.</div>

  return (
    <div className="mx-auto max-w-5xl p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Round</h1>
          <div className="text-gray-600">
            {course ? `${course.name}${course.city ? ` • ${course.city}, ${course.state ?? ''}` : ''}` : 'Course: —'}
          </div>
          <div className="text-gray-600">
            {tee ? `Tee: ${tee.tee_name}${tee.total_yardage ? ` • ${tee.total_yardage} yds` : ''}` : 'Tee: —'}
          </div>
        </div>
        <span className="text-xs rounded px-2 py-0.5 border">{round.status}</span>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Holes</h2>
        <ul className="grid gap-2 md:grid-cols-2">
          {Array.from({ length: 18 }, (_, i) => i + 1).map(hn => {
            const row = holes.find(h => h.hole_number === hn)
            const par = parMap[hn]
            const ydg = ydgMap[hn]
            return (
              <li key={hn} className="rounded border bg-white p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">
                    <Link href={`/rounds/${round.id}/holes/${hn}`} className="text-[#0033A0] underline">
                      Hole {hn}
                    </Link>
                  </div>
                  <div className="text-sm text-gray-600">
                    {par ? `Par ${par}` : 'Par —'} {ydg ? `• ${ydg} yds` : ''}
                  </div>
                </div>
                <div className="mt-1 text-sm">
                  {row
                    ? <>Strokes: {row.strokes ?? '—'} &middot; Putts: {row.putts ?? '—'} &middot; Pen: {row.penalties ?? '—'}</>
                    : <>No stats yet</>}
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

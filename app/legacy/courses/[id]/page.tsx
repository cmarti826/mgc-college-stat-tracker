'use client'
import { supabase } from '@/lib/supabaseClient'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'

type HoleRow = { number: number; par: number; yards: number | '' }
type Course = { id: string; name: string }
type Tee = { id: string; name: string; rating: number | null; slope: number | null; par: number | null; yards: number | null }

export default function EditCoursePage() {
  const params = useParams<{ id: string }>()
  const courseId = params?.id as string

  const [course, setCourse] = useState<Course | null>(null)
  const [tees, setTees] = useState<Tee[]>([])
  const [rows, setRows] = useState<HoleRow[]>(
    Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: 4, yards: '' }))
  )
  const [savingHoles, setSavingHoles] = useState(false)
  const [msg, setMsg] = useState('')

  // Add-tee form
  const [teeName, setTeeName] = useState('Blue')
  const [teeRating, setTeeRating] = useState<string>('') // allow blank -> null
  const [teeSlope, setTeeSlope] = useState<string>('')   // allow blank -> null
  const [teeYards, setTeeYards] = useState<string>('')   // optional override

  const totalPar = useMemo(() => rows.reduce((a, r) => a + Number(r.par || 0), 0), [rows])
  const totalYards = useMemo(() => rows.reduce((a, r) => a + Number(r.yards || 0), 0), [rows])

  useEffect(() => {
    if (!courseId) return
    ;(async () => {
      const { data: c, error: e0 } = await supabase
        .from('courses')
        .select('id,name')
        .eq('id', courseId)
        .single()
      if (e0) return alert(e0.message)
      setCourse(c as any)

      const { data: h, error: e1 } = await supabase
        .from('holes')
        .select('number, par, yards')
        .eq('course_id', courseId)
        .order('number')
      if (e1) return alert(e1.message)

      if (h && h.length) {
        const byNum = new Map(h.map((x: any) => [x.number, x]))
        setRows(Array.from({ length: 18 }, (_, i) => {
          const num = i + 1
          const curr = byNum.get(num)
          return { number: num, par: curr?.par ?? 4, yards: curr?.yards ?? '' }
        }))
      }

      await loadTees()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  const loadTees = async () => {
    const { data, error } = await supabase
      .from('tee_sets')
      .select('id,name,rating,slope,par,yards')
      .eq('course_id', courseId)
      .order('name')
    if (error) return alert(error.message)
    setTees((data as any) || [])
  }

  const saveHoles = async () => {
    setSavingHoles(true)
    setMsg('')
    try {
      const payload = rows.map(r => ({
        number: r.number,
        par: Number(r.par || 0),
        yards: r.yards === '' ? null : Number(r.yards),
      }))
      const { error } = await supabase.rpc('upsert_course_holes', {
        p_course: courseId,
        p_holes: payload as any
      })
      if (error) throw error
      setMsg('Holes saved ✅')
    } catch (e: any) {
      setMsg(`Error: ${e.message || 'saving holes'}`)
    } finally {
      setSavingHoles(false)
    }
  }

  const addTee = async () => {
    try {
      const { error } = await supabase.from('tee_sets').insert({
        course_id: courseId,
        name: teeName.trim() || 'Tee',
        par: totalPar, // tee par = sum of course holes (edit if your tee has different total)
        rating: teeRating === '' ? null : Number(teeRating),
        slope: teeSlope === '' ? null : Number(teeSlope),
        yards: teeYards === '' ? (totalYards || null) : Number(teeYards),
      })
      if (error) throw error
      setTeeName('Blue')
      setTeeRating('')
      setTeeSlope('')
      setTeeYards('')
      await loadTees()
      setMsg('Tee added ✅')
    } catch (e: any) {
      setMsg(`Error: ${e.message || 'adding tee'}`)
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>{course?.name || 'Course'}</h1>

      {/* Tee manager */}
      <section style={{ marginTop: 4, marginBottom: 16 }}>
        <h3 style={{ marginBottom: 8 }}>Tee Sets</h3>
        {tees.length === 0 ? (
          <div style={{ color: '#666' }}>No tees yet. Add one below.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 680 }}>
              <thead>
                <tr>
                  <th style={th}>Name</th>
                  <th style={th}>Rating</th>
                  <th style={th}>Slope</th>
                  <th style={th}>Par</th>
                  <th style={th}>Yards</th>
                </tr>
              </thead>
              <tbody>
                {tees.map(t => (
                  <tr key={t.id}>
                    <td style={td}>{t.name}</td>
                    <td style={td}>{t.rating ?? ''}</td>
                    <td style={td}>{t.slope ?? ''}</td>
                    <td style={td}>{t.par ?? ''}</td>
                    <td style={td}>{t.yards ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.8fr 0.8fr 1fr auto', gap: 8, maxWidth: 900, marginTop: 10 }}>
          <input placeholder="Tee Name" value={teeName} onChange={(e) => setTeeName(e.target.value)} />
          <input type="number" step="0.1" placeholder="Rating" value={teeRating} onChange={(e) => setTeeRating(e.target.value)} />
          <input type="number" placeholder="Slope" value={teeSlope} onChange={(e) => setTeeSlope(e.target.value)} />
          <input type="number" placeholder={`Yards (default ${totalYards || 0})`} value={teeYards} onChange={(e) => setTeeYards(e.target.value)} />
          <button onClick={addTee}>Add Tee</button>
        </div>
      </section>

      {/* Holes editor */}
      <section>
        <h3>Edit Holes (Par & Yardage)</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 680 }}>
            <thead>
              <tr>
                <th style={th}>#</th>
                <th style={th}>Par</th>
                <th style={th}>Yards</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.number}>
                  <td style={td}>{r.number}</td>
                  <td style={td}>
                    <input
                      type="number"
                      min={3}
                      max={6}
                      value={r.par}
                      onChange={(e) => {
                        const v = Number(e.target.value || 0)
                        const next = [...rows]; next[idx].par = v; setRows(next)
                      }}
                      style={{ width: 80 }}
                    />
                  </td>
                  <td style={td}>
                    <input
                      type="number"
                      value={r.yards as any}
                      onChange={(e) => {
                        const val = e.target.value
                        const next = [...rows]; next[idx].yards = val === '' ? '' : Number(val); setRows(next)
                      }}
                      style={{ width: 120 }}
                      placeholder="(optional)"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ ...td, fontWeight: 700 }}>Totals</td>
                <td style={{ ...td, fontWeight: 700 }}>{totalPar}</td>
                <td style={{ ...td, fontWeight: 700 }}>{totalYards || ''}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={saveHoles} disabled={savingHoles}>{savingHoles ? 'Saving…' : 'Save All 18'}</button>
          {msg && <span style={{ color: msg.startsWith('Error') ? '#c00' : '#2a6' }}>{msg}</span>}
          <a href="/courses" style={{ marginLeft: 'auto' }}>← Back to Courses</a>
        </div>
      </section>
    </div>
  )
}

const th: React.CSSProperties = { textAlign: 'left', padding: 8, borderBottom: '1px solid #eee', background: '#fafafa' }
const td: React.CSSProperties = { padding: 8, borderBottom: '1px solid #f2f2f2' }

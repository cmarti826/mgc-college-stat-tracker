'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type HoleRow = { number: number; par: number; yards: number | '' }

export default function CourseSetupPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')

  const [teeName, setTeeName] = useState('Blue')
  const [rating, setRating] = useState<string>('') // allow empty -> null
  const [slope, setSlope] = useState<string>('')   // allow empty -> null

  const [holes, setHoles] = useState<HoleRow[]>(
    Array.from({ length: 18 }, (_, i) => ({
      number: i + 1,
      par: [3, 7, 11, 16].includes(i + 1) ? 3 : [5, 8, 13, 17].includes(i + 1) ? 5 : 4,
      yards: '',
    }))
  )

  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string>('')

  const totalPar = useMemo(() => holes.reduce((a, h) => a + Number(h.par || 0), 0), [holes])
  const totalYards = useMemo(() => holes.reduce((a, h) => a + Number(h.yards || 0), 0), [holes])

  const setAllPar = (value: number) => setHoles((prev) => prev.map((h) => ({ ...h, par: value })))
  const setFrontBackPar = (front: number, back: number) =>
    setHoles((prev) => prev.map((h) => ({ ...h, par: h.number <= 9 ? front : back })))

  async function handleSave() {
    try {
      setSaving(true)
      setMsg('')

      if (!name.trim()) throw new Error('Course name is required.')
      if (!teeName.trim()) throw new Error('Tee name is required.')

      // 1) Create course
      const { data: courseInsert, error: cErr } = await supabase
        .from('courses')
        .insert({ name: name.trim(), city: city.trim() || null, state: state.trim() || null })
        .select('id')
        .single()
      if (cErr) throw cErr
      const courseId = courseInsert!.id as string

      // 2) Create tee set
      const { error: tErr } = await supabase.from('tee_sets').insert({
        course_id: courseId,
        name: teeName.trim(),
        par: totalPar,
        rating: rating === '' ? null : Number(rating),
        slope: slope === '' ? null : Number(slope),
        yards: totalYards || null,
      })
      if (tErr) throw tErr

      // 3) Upsert 18 holes
      const holesPayload = holes.map((h) => ({
        number: h.number,
        par: Number(h.par || 0),
        yards: h.yards === '' ? null : Number(h.yards),
      }))
      const { error: hErr } = await supabase.rpc('upsert_course_holes', {
        p_course: courseId,
        p_holes: holesPayload as any,
      })
      if (hErr) throw hErr

      setMsg('Course created ✅')
      router.push('/courses')
    } catch (e: any) {
      setMsg(e.message || 'Error saving course')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: 12 }}>Set Up a Course</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.8fr', gap: 8, maxWidth: 820 }}>
        <input placeholder="Course name *" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <input placeholder="State" value={state} onChange={(e) => setState(e.target.value)} />
      </div>

      <h3 style={{ marginTop: 18 }}>Tee Setup</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.8fr 0.8fr 0.8fr', gap: 8, maxWidth: 820 }}>
        <input placeholder="Tee Name *" value={teeName} onChange={(e) => setTeeName(e.target.value)} />
        <input type="number" step="0.1" placeholder="Rating" value={rating} onChange={(e) => setRating(e.target.value)} />
        <input type="number" placeholder="Slope" value={slope} onChange={(e) => setSlope(e.target.value)} />
        <input value={`Par: ${totalPar}`} readOnly style={{ background: '#f7f7f7' }} />
      </div>

      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => setAllPar(4)}>Set All Holes Par 4</button>
        <button onClick={() => setFrontBackPar(4, 4)}>Front 4 / Back 4</button>
        <button onClick={() => {
          const pattern = [4,4,3,4,5,4,3,5,4, 4,4,3,5,4,4,3,5,4]
          setHoles((prev) => prev.map((h, i) => ({ ...h, par: pattern[i] })))
        }}>
          Par-72 pattern
        </button>
      </div>

      <h3 style={{ marginTop: 18 }}>Per-Hole Par and Yardage</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 680 }}>
          <thead>
            <tr><th style={th}>Hole</th><th style={th}>Par</th><th style={th}>Yards</th></tr>
          </thead>
          <tbody>
            {holes.map((h, idx) => (
              <tr key={h.number}>
                <td style={td}>{h.number}</td>
                <td style={td}>
                  <input type="number" min={3} max={6} value={h.par}
                    onChange={(e) => {
                      const v = Number(e.target.value || 0)
                      const next = [...holes]; next[idx].par = v; setHoles(next)
                    }} style={{ width: 80 }} />
                </td>
                <td style={td}>
                  <input type="number" value={h.yards as any}
                    onChange={(e) => {
                      const val = e.target.value
                      const next = [...holes]; next[idx].yards = val === '' ? '' : Number(val); setHoles(next)
                    }} style={{ width: 120 }} placeholder="(optional)" />
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

      <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={handleSave} disabled={saving || !name.trim() || !teeName.trim()}>
          {saving ? 'Saving…' : 'Create Course'}
        </button>
        {msg && <span style={{ color: msg.includes('Error') ? '#c00' : '#2a6' }}>{msg}</span>}
        <a href="/courses" style={{ marginLeft: 'auto' }}>← Back to Courses</a>
      </div>
    </div>
  )
}

const th: React.CSSProperties = { textAlign: 'left', padding: 8, borderBottom: '1px solid #eee', background: '#fafafa' }
const td: React.CSSProperties = { padding: 8, borderBottom: '1px solid #f2f2f2' }

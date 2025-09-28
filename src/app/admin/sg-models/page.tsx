'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Lie = 'tee' | 'fairway' | 'rough' | 'sand' | 'recovery'

const LIES: Lie[] = ['tee','fairway','rough','sand','recovery']

// Tiny CSV parser for simple numeric/string data (no quoted commas needed for our templates)
function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim() !== '')
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(s => s.trim())
  const rows = lines.slice(1).map(l => l.split(',').map(s => s.trim()))
  return { headers, rows }
}

function chunk<T>(arr: T[], size = 500): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export default function SGModelsAdminPage() {
  const [model, setModel] = useState('ncaa_d1_men') // default for your team
  const [replacePutt, setReplacePutt] = useState(true)
  const [replaceOff, setReplaceOff] = useState(true)
  const [busy, setBusy] = useState<'putt'|'off'|null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const puttInputRef = useRef<HTMLInputElement>(null)
  const offInputRef  = useRef<HTMLInputElement>(null)

  const puttTemplate = useMemo(() => {
    return [
      'dist_ft,exp_strokes',
      '1,1.00',
      '2,1.03',
      '3,1.10',
      '5,1.25',
      '8,1.55',
      '10,1.68',
      '12,1.76',
      '15,1.88',
      '20,2.03',
      '25,2.15',
      '30,2.25',
      '40,2.40',
      '50,2.52',
      '60,2.60',
    ].join('\n')
  }, [])

  const offTemplate = useMemo(() => {
    return [
      'lie,dist_yd,exp_strokes',
      'tee,300,4.05',
      'tee,270,3.92',
      'fairway,200,3.15',
      'fairway,150,2.92',
      'rough,200,3.32',
      'rough,100,2.88',
      'sand,40,2.45',
      'sand,20,2.30',
      'recovery,40,2.70',
      'recovery,20,2.50',
      'fairway,50,2.28',
      'fairway,30,2.18',
      'fairway,20,2.08',
    ].join('\n')
  }, [])

  const download = (name: string, content: string) => {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([content], { type: 'text/csv' }))
    link.download = name
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const handlePuttUpload = async (file: File) => {
    setErr(null); setMsg(null); setBusy('putt')
    try {
      const text = await file.text()
      const { headers, rows } = parseCSV(text)
      // Validate headers
      if (headers.length < 2 || headers[0] !== 'dist_ft' || headers[1] !== 'exp_strokes') {
        throw new Error(`Expected headers: "dist_ft,exp_strokes" (got: ${headers.join(',')})`)
      }
      // Build records
      const data = rows.map((r, idx) => {
        const dist = Number(r[0]); const exp = Number(r[1])
        if (!isFinite(dist) || !isFinite(exp)) throw new Error(`Row ${idx+2}: invalid number`)
        return { model, dist_ft: dist, exp_strokes: exp }
      })
      if (data.length === 0) throw new Error('No rows found')
      // Replace?
      if (replacePutt) {
        const { error } = await supabase
          .from('sg_expect_putt')
          .delete()
          .eq('model', model)
        if (error) throw error
      }
      // Upsert in chunks
      for (const block of chunk(data, 800)) {
        const { error } = await supabase
          .from('sg_expect_putt')
          .upsert(block, { onConflict: 'model,dist_ft' })
        if (error) throw error
      }
      setMsg(`Uploaded ${data.length} putting rows to model "${model}".`)
    } catch (e: any) {
      setErr(e?.message ?? 'Upload failed')
    } finally {
      setBusy(null)
      if (puttInputRef.current) puttInputRef.current.value = ''
    }
  }

  const handleOffUpload = async (file: File) => {
    setErr(null); setMsg(null); setBusy('off')
    try {
      const text = await file.text()
      const { headers, rows } = parseCSV(text)
      if (headers.length < 3 || headers[0] !== 'lie' || headers[1] !== 'dist_yd' || headers[2] !== 'exp_strokes') {
        throw new Error(`Expected headers: "lie,dist_yd,exp_strokes" (got: ${headers.join(',')})`)
      }
      const data = rows.map((r, idx) => {
        const lie = r[0] as Lie
        if (!LIES.includes(lie)) throw new Error(`Row ${idx+2}: invalid lie "${r[0]}"`)
        const dist = Number(r[1]); const exp = Number(r[2])
        if (!isFinite(dist) || !isFinite(exp)) throw new Error(`Row ${idx+2}: invalid number`)
        return { model, lie, dist_yd: dist, exp_strokes: exp }
      })
      if (data.length === 0) throw new Error('No rows found')
      if (replaceOff) {
        const { error } = await supabase
          .from('sg_expect_offgreen')
          .delete()
          .eq('model', model)
        if (error) throw error
      }
      for (const block of chunk(data, 600)) {
        const { error } = await supabase
          .from('sg_expect_offgreen')
          .upsert(block, { onConflict: 'model,lie,dist_yd' })
        if (error) throw error
      }
      setMsg(`Uploaded ${data.length} off-green rows to model "${model}".`)
    } catch (e: any) {
      setErr(e?.message ?? 'Upload failed')
    } finally {
      setBusy(null)
      if (offInputRef.current) offInputRef.current.value = ''
    }
  }

  // Optional: quick counts for current model
  const [counts, setCounts] = useState<{ putt: number; off: number } | null>(null)
  const refreshCounts = async () => {
    const { count: cp } = await supabase
      .from('sg_expect_putt').select('*', { count: 'exact', head: true }).eq('model', model)
    const { count: co } = await supabase
      .from('sg_expect_offgreen').select('*', { count: 'exact', head: true }).eq('model', model)
    setCounts({ putt: cp ?? 0, off: co ?? 0 })
  }
  useEffect(() => { refreshCounts() }, [model])

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-bold">SG Models & Curve Upload</h1>
        <button className="rounded bg-[#0033A0] px-3 py-1.5 text-white" onClick={refreshCounts}>Refresh</button>
      </div>

      <div className="rounded border bg-white p-3 text-sm">
        <div className="mb-2">Active model to edit:</div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="w-64 rounded border px-2 py-1"
            value={model}
            onChange={e => setModel(e.target.value.trim())}
            placeholder="e.g. pga, ncaa_d1_men, default"
          />
          {counts && (
            <div className="text-gray-600">
              Rows — Putting: <b>{counts.putt}</b>, Off-green: <b>{counts.off}</b>
            </div>
          )}
        </div>
      </div>

      {err && <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{err}</div>}
      {msg && <div className="rounded border border-green-200 bg-green-50 p-3 text-green-700">{msg}</div>}

      {/* Putting uploader */}
      <section className="space-y-3 rounded border bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Putting Expectations (green)</h2>
          <button
            className="rounded border px-2 py-1 text-sm"
            onClick={() => download(`putting_template_${model}.csv`, puttTemplate)}
          >
            Download template
          </button>
        </div>
        <p className="text-sm text-gray-600">
          CSV headers: <code>dist_ft,exp_strokes</code> — distance in <b>feet</b>.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input ref={puttInputRef} type="file" accept=".csv,text/csv"
                 onChange={e => e.target.files?.[0] && handlePuttUpload(e.target.files[0])}/>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={replacePutt} onChange={e => setReplacePutt(e.target.checked)}/>
            Replace existing rows for this model
          </label>
          <button
            disabled={busy === 'putt'}
            onClick={() => puttInputRef.current?.click()}
            className="rounded bg-[#0B6B3A] px-3 py-1.5 text-white disabled:opacity-50"
          >
            {busy === 'putt' ? 'Uploading…' : 'Upload CSV'}
          </button>
        </div>
      </section>

      {/* Off-green uploader */}
      <section className="space-y-3 rounded border bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Off-Green Expectations (tee/fairway/rough/sand/recovery)</h2>
          <button
            className="rounded border px-2 py-1 text-sm"
            onClick={() => download(`offgreen_template_${model}.csv`, offTemplate)}
          >
            Download template
          </button>
        </div>
        <p className="text-sm text-gray-600">
          CSV headers: <code>lie,dist_yd,exp_strokes</code> — distance in <b>yards</b>. Valid lies: {LIES.join(', ')}.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input ref={offInputRef} type="file" accept=".csv,text/csv"
                 onChange={e => e.target.files?.[0] && handleOffUpload(e.target.files[0])}/>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={replaceOff} onChange={e => setReplaceOff(e.target.checked)}/>
            Replace existing rows for this model
          </label>
          <button
            disabled={busy === 'off'}
            onClick={() => offInputRef.current?.click()}
            className="rounded bg-[#0B6B3A] px-3 py-1.5 text-white disabled:opacity-50"
          >
            {busy === 'off' ? 'Uploading…' : 'Upload CSV'}
          </button>
        </div>
      </section>
    </div>
  )
}

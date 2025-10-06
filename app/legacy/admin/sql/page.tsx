'use client'

import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Row = Record<string, any>

export default function SqlEditorPage() {
  const [sql, setSql] = useState<string>('select now() as server_time;')
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState<string>('')
  const [rows, setRows] = useState<Row[] | null>(null)

  const isSelect = useMemo(() => /^\s*select/i.test(sql || ''), [sql])

  const run = async () => {
    setRunning(true)
    setMessage('')
    setRows(null)

    try {
      if (isSelect) {
        const { data, error } = await supabase.rpc('run_select_admin', { p_sql: sql })
        if (error) throw error
        // Supabase returns jsonb already parsed into JS
        setRows((data as any[]) ?? [])
        setMessage(`Returned ${(data as any[])?.length ?? 0} row(s).`)
      } else {
        const { data, error } = await supabase.rpc('run_command_admin', { p_sql: sql })
        if (error) throw error
        setMessage(String(data ?? 'ok'))
      }
    } catch (e: any) {
      setMessage(e.message || 'Error')
    } finally {
      setRunning(false)
    }
  }

  const columns = useMemo(() => {
    if (!rows || rows.length === 0) return []
    const keys = new Set<string>()
    rows.forEach((r) => Object.keys(r || {}).forEach((k) => keys.add(k)))
    return Array.from(keys)
  }, [rows])

  return (
    <div style={{ maxWidth: 1200, margin: '24px auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: 12 }}>Admin SQL Editor</h1>
      <p style={{ color: '#555', marginTop: 0 }}>
        Runs on the server via RPC. <strong>Admins only.</strong> Use <code>SELECT</code> to view results,
        or <code>CREATE/ALTER/DROP/INSERT/UPDATE/DELETE/GRANT/REVOKE/COMMENT</code> for commands.
      </p>

      <textarea
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        placeholder="Write SQL here…"
        style={{
          width: '100%',
          minHeight: 220,
          padding: 12,
          borderRadius: 12,
          border: '1px solid #ddd',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          fontSize: 14,
        }}
      />

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <button
          onClick={run}
          disabled={running || !sql.trim()}
          style={{
            padding: '8px 14px',
            borderRadius: 10,
            border: '1px solid #ccc',
            cursor: running ? 'not-allowed' : 'pointer',
            background: running ? '#eee' : '#fafafa',
          }}
        >
          {running ? 'Running…' : isSelect ? 'Run SELECT' : 'Run Command'}
        </button>
        <span style={{ color: message?.startsWith('Error') ? '#c00' : '#333' }}>{message}</span>
      </div>

      {rows && rows.length > 0 && (
        <div style={{ marginTop: 16, overflowX: 'auto', border: '1px solid #eee', borderRadius: 12 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th
                    key={c}
                    style={{
                      textAlign: 'left',
                      padding: 10,
                      borderBottom: '1px solid #eee',
                      background: '#fafafa',
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                    }}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c} style={{ padding: 10, borderBottom: '1px solid #f2f2f2', verticalAlign: 'top' }}>
                      {formatCell(r?.[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows && rows.length === 0 && (
        <div style={{ marginTop: 16, color: '#666' }}>No rows returned.</div>
      )}
    </div>
  )
}

function formatCell(v: any) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v, null, 2)
    } catch {
      return String(v)
    }
  }
  return String(v)
}

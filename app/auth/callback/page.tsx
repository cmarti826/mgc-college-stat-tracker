'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallback() {
  const router = useRouter()
  const params = useSearchParams()
  const [msg, setMsg] = useState('Finishing sign-in…')

  useEffect(() => {
    ;(async () => {
      try {
        // Supabase will read the code+state query params and set the session
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
        if (error) throw error

        // Optional: redirect back to a 'next' param if you passed one
        const next = params.get('next') || '/'
        router.replace(next)
      } catch (e: any) {
        setMsg(e?.message || 'Error completing sign-in')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Signing you in…</h1>
      <div>{msg}</div>
    </div>
  )
}

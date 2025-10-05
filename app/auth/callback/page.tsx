'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

// Prevent static prerender; this route depends on client query params.
export const dynamic = 'force-dynamic'

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackStatus text="Finishing sign-in…" />}>
      <CallbackInner />
    </Suspense>
  )
}

function CallbackInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [msg, setMsg] = useState('Finishing sign-in…')

  useEffect(() => {
    ;(async () => {
      try {
        // Completes the session exchange from the magic link / email link
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
        if (error) throw error

        const next = params.get('next') || '/'
        router.replace(next)
      } catch (e: any) {
        setMsg(e?.message || 'Error completing sign-in')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <CallbackStatus text={msg} />
}

function CallbackStatus({ text }: { text: string }) {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Signing you in…</h1>
      <div>{text}</div>
    </div>
  )
}

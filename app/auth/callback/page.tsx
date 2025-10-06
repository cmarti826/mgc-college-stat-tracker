'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [msg, setMsg] = useState('Signing you in...')

  useEffect(() => {
    const run = async () => {
      try {
        // Parse both search (?a=b) and hash (#a=b) forms
        const url = new URL(window.location.href)
        const search = url.searchParams
        const hash = new URLSearchParams(url.hash.replace(/^#/, ''))

        // 1) PKCE code flow (?code=...)
        const code = search.get('code')
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          setMsg('Signed in! Redirecting…')
          router.replace('/')
          return
        }

        // 2) OTP hash flow (?token_hash=...&type=...)
        const tokenHash = search.get('token_hash')
        let type = search.get('type') // magiclink | signup | recovery | email_change | invite
        if (tokenHash && type) {
          // supabase sometimes uses "invite" in the URL; the SDK expects "signup"
          if (type === 'invite') type = 'signup'

          const { error } = await supabase.auth.verifyOtp({
            type: type as any,
            token_hash: tokenHash,
          })
          if (error) throw error
          setMsg('Email verified! Redirecting…')
          router.replace('/')
          return
        }

        // 3) Hash token flow (#access_token=...&refresh_token=...)
        const accessToken = hash.get('access_token')
        const refreshToken = hash.get('refresh_token')
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) throw error
          setMsg('Signed in! Redirecting…')
          router.replace('/')
          return
        }

        // Nothing usable found
        setMsg('invalid request: both auth code and code verifier should be non-empty')
      } catch (e: any) {
        setMsg(e?.message || 'Sign-in failed')
      }
    }

    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ padding: 24 }}>
      <h2>Signing you in…</h2>
      <div>{msg}</div>
    </div>
  )
}

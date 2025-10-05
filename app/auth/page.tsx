'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

/**
 * Auth page:
 * - Magic Link for EXISTING users (shouldCreateUser:false)
 * - Email + Password signup/signin for first-time users
 * - 60s cooldown on OTP to avoid 429 rate limits
 * - Retries transient 504 "AuthRetryableFetchError"
 */

const COOLDOWN_SEC = 60
const LS_KEY = 'mgc_otp_last_sent_at'

export default function AuthPage() {
  const [tab, setTab] = useState<'magic' | 'password'>('magic')
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string>('')
  const [cooldown, setCooldown] = useState(0)

  // Restore cooldown on mount
  useEffect(() => {
    try {
      const t = Number(localStorage.getItem(LS_KEY) || '0')
      if (!t) return
      const elapsed = Math.floor((Date.now() - t) / 1000)
      const left = Math.max(0, COOLDOWN_SEC - elapsed)
      if (left) setCooldown(left)
    } catch {}
  }, [])

  // Tick cooldown
  useEffect(() => {
    if (!cooldown) return
    const id = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  // Helpers
  const setError = (e: any, fallback = 'Something went wrong') => {
    const text =
      (e?.name ? `${e.name} ` : '') +
      (e?.status ? `${e.status} – ` : '') +
      (e?.message || fallback)
    setMsg(text)
  }

  const retry = async <T,>(fn: () => Promise<T>, tries = 2, delayMs = 700) => {
    let lastErr: any
    for (let i = 0; i < tries; i++) {
      try {
        return await fn()
      } catch (e) {
        lastErr = e
        if (i < tries - 1) await new Promise((r) => setTimeout(r, delayMs))
      }
    }
    throw lastErr
  }

  // Magic link for EXISTING users (keeps shouldCreateUser:false)
  const onMagic = async () => {
    setMsg('')
    const em = email.trim()
    if (!em) return setMsg('Enter your email.')
    if (cooldown) return

    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: em,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: false, // do NOT create users via OTP here
        },
      })
      if (error) throw error

      // start cooldown
      try { localStorage.setItem(LS_KEY, String(Date.now())) } catch {}
      setCooldown(COOLDOWN_SEC)
      setMsg('Magic link sent. Check Inbox/Junk (Outlook may put it in “Other”).')
    } catch (e: any) {
      if (e?.status === 429) {
        try { localStorage.setItem(LS_KEY, String(Date.now())) } catch {}
        setCooldown(COOLDOWN_SEC)
        setMsg('Too many requests. Try again shortly or use Email + Password below.')
        setTab('password')
      } else if (e?.status === 422) {
        // OTP signups disabled or user not found
        setMsg('This email is not registered. Create an account with Email + Password below.')
        setTab('password')
      } else {
        setError(e, 'Error sending magic link')
      }
    } finally {
      setLoading(false)
    }
  }

  // Email + Password — sign up
  const onSignUp = async () => {
    setMsg('')
    const em = email.trim()
    if (!em || !pwd) return setMsg('Email and password required.')
    setLoading(true)
    try {
      await retry(async () => {
        const { error } = await supabase.auth.signUp({ email: em, password: pwd })
        if (error) throw error
        return null
      })
      setMsg('Account created. If email confirmation is on, check your inbox.')
    } catch (e: any) {
      if (e?.status === 504 || e?.name === 'AuthRetryableFetchError') {
        setMsg('Network timeout creating the account. Please try again.')
      } else {
        setError(e, 'Error creating account')
      }
    } finally {
      setLoading(false)
    }
  }

  // Email + Password — sign in
  const onSignIn = async () => {
    setMsg('')
    const em = email.trim()
    if (!em || !pwd) return setMsg('Email and password required.')
    setLoading(true)
    try {
      await retry(async () => {
        const { error } = await supabase.auth.signInWithPassword({ email: em, password: pwd })
        if (error) throw error
        return null
      })
      window.location.replace('/')
    } catch (e: any) {
      if (e?.status === 504 || e?.name === 'AuthRetryableFetchError') {
        setMsg('Network timeout talking to the auth server. Please try again, or use Magic Link.')
      } else {
        setError(e, 'Error signing in')
      }
    } finally {
      setLoading(false)
    }
  }

  const cooldownLabel = cooldown ? ` (${cooldown}s)` : ''

  return (
    <div style={{ padding: 24, maxWidth: 520, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: 12 }}>Sign in</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => setTab('magic')}
          disabled={tab === 'magic'}
          style={{ padding: '6px 10px' }}
        >
          Magic Link
        </button>
        <button
          onClick={() => setTab('password')}
          disabled={tab === 'password'}
          style={{ padding: '6px 10px' }}
        >
          Email + Password
        </button>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <input
          type="email"
          placeholder="email@domain.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        {tab === 'magic' ? (
          <>
            <button
              onClick={onMagic}
              disabled={loading || !email.trim() || !!cooldown}
              style={{ padding: '8px 10px', opacity: cooldown ? 0.6 : 1 }}
              title={cooldown ? 'Rate limited; try again soon' : ''}
            >
              {loading ? 'Sending…' : `Send Magic Link${cooldownLabel}`}
            </button>
            <div style={{ fontSize: 12, color: '#666' }}>
              Tip: If this is your first time, use Email + Password to create your account, then you can use Magic Links.
            </div>
          </>
        ) : (
          <>
            <input
              type="password"
              placeholder="Password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              autoComplete="current-password"
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={onSignIn}
                disabled={loading || !email.trim() || !pwd}
                style={{ padding: '8px 10px' }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
              <button
                onClick={onSignUp}
                disabled={loading || !email.trim() || !pwd}
                style={{ padding: '8px 10px' }}
              >
                {loading ? 'Creating…' : 'Sign Up'}
              </button>
            </div>
          </>
        )}

        {msg && (
          <div style={{ marginTop: 6, color: msg.toLowerCase().includes('error') ? '#c00' : '#2a6' }}>
            {msg}
          </div>
        )}
      </div>
    </div>
  )
}

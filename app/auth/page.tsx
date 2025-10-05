'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function AuthPage() {
  const [tab, setTab] = useState<'magic' | 'password'>('magic')
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string>('')

  const setError = (e: any, fallback = 'Something went wrong') => {
    const text =
      (e?.name ? `${e.name} ` : '') +
      (e?.status ? `${e.status} – ` : '') +
      (e?.message || fallback)
    setMsg(text)
  }

  // Magic link for EXISTING users only (prevents the “Database error saving new user” path)
  const onMagic = async () => {
    setMsg('')
    if (!email.trim()) return setMsg('Enter your email.')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          // set shouldCreateUser to true to allow OTP signups
shouldCreateUser: true

        },
      })
      if (error) throw error
      setMsg(
        'Magic link sent. Check your inbox/junk (Outlook may put it in "Other").'
      )
    } catch (e: any) {
      setError(e, 'Error sending magic link')
    } finally {
      setLoading(false)
    }
  }

  // Email + Password — create a new user
  const onSignUp = async () => {
    setMsg('')
    if (!email.trim() || !pwd) return setMsg('Email and password required.')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pwd,
      })
      if (error) throw error
      setMsg(
        'Account created. If email confirmation is enabled, check your inbox.'
      )
    } catch (e: any) {
      setError(e, 'Error creating account')
    } finally {
      setLoading(false)
    }
  }

  // Email + Password — sign in existing user
  const onSignIn = async () => {
    setMsg('')
    if (!email.trim() || !pwd) return setMsg('Email and password required.')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pwd,
      })
      if (error) throw error
      // go home
      window.location.replace('/')
    } catch (e: any) {
      setError(e, 'Error signing in')
    } finally {
      setLoading(false)
    }
  }

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
              disabled={loading || !email.trim()}
              style={{ padding: '8px 10px' }}
            >
              {loading ? 'Sending…' : 'Send Magic Link'}
            </button>
            <div style={{ fontSize: 12, color: '#666' }}>
              Tip: Magic link only works for accounts that already exist. New
              players can use Email + Password the first time, then magic links
              later.
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
          <div
            style={{
              marginTop: 6,
              color: msg.toLowerCase().includes('error') ? '#c00' : '#2a6',
            }}
          >
            {msg}
          </div>
        )}
      </div>
    </div>
  )
}

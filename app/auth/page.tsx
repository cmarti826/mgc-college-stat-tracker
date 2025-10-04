'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function AuthPage() {
  const [tab, setTab] = useState<'magic' | 'password'>('magic')
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string>('')

  const onMagic = async () => {
    setMsg(''); setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
    shouldCreateUser: false,   // 🔐 only send to existing users
  },
})

      if (error) throw error
      setMsg('Magic link sent. Check your inbox/junk (Outlook may put it in "Other").')
    } catch (e: any) {
      setMsg(e.message || 'Error sending magic link')
    } finally { setLoading(false) }
  }

  const onSignUp = async () => {
    setMsg(''); setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({ email, password: pwd })
      if (error) throw error
      setMsg('Account created. If email confirmation is on, check your inbox.')
    } catch (e: any) {
      setMsg(e.message || 'Error signing up')
    } finally { setLoading(false) }
  }

  const onSignIn = async () => {
    setMsg(''); setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pwd })
      if (error) throw error
      window.location.replace('/')
    } catch (e: any) {
      setMsg(e.message || 'Error signing in')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <h1>Sign in</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => setTab('magic')} disabled={tab==='magic'}>Magic Link</button>
        <button onClick={() => setTab('password')} disabled={tab==='password'}>Email + Password</button>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <input
          type="email"
          placeholder="email@domain.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {tab === 'magic' ? (
          <button onClick={onMagic} disabled={loading || !email.trim()}>
            {loading ? 'Sending…' : 'Send Magic Link'}
          </button>
        ) : (
          <>
            <input
              type="password"
              placeholder="Password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onSignIn} disabled={loading || !email.trim() || !pwd}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
              <button onClick={onSignUp} disabled={loading || !email.trim() || !pwd}>
                {loading ? 'Creating…' : 'Sign Up'}
              </button>
            </div>
          </>
        )}

        {msg && <div style={{ color: msg.startsWith('Error') ? '#c00' : '#2a6' }}>{msg}</div>}
      </div>
    </div>
  )
}

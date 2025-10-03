'use client'
import { useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabaseClient'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const supabase = getSupabaseBrowser()

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setStatus('Sending...')
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + '/schedule' } })
    setStatus(error ? error.message : 'Check your email for a login link.')
  }

  return (
    <div className="card max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      <form onSubmit={sendMagicLink} className="space-y-3">
        <input className="input" placeholder="you@example.com" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <button className="btn btn-primary w-full" type="submit">Send Magic Link</button>
      </form>
      {status && <p className="mt-3 text-sm text-gray-600">{status}</p>}
    </div>
  )
}

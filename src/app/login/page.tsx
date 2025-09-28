'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
    })
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold">Sign in</h1>
      {sent ? (
        <p>Check your email for the sign-in link.</p>
      ) : (
        <form onSubmit={sendLink} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded border px-3 py-2"
          />
          {error && <p className="text-red-600">{error}</p>}
          <button className="rounded bg-hcu-blue px-4 py-2 text-white">Send magic link</button>
        </form>
      )}
    </div>
  )
}

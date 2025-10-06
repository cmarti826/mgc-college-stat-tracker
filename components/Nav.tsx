// components/Nav.tsx
'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function Nav() {
  const supabase = useMemo(() => supabaseBrowser(), [])
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setEmail(user?.email ?? null)
    })()
  }, [supabase])

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/auth/login' // adjust if your route differs
  }

  return (
    <header className="border-b">
      <nav className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-semibold">MGC Stats</Link>
          <Link href="/rounds" className="px-3 py-1.5 rounded-xl hover:bg-gray-100">Rounds</Link>
          <Link href="/rounds/new" className="px-3 py-1.5 rounded-xl hover:bg-gray-100">New Round</Link>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {email ? (
            <>
              <span className="opacity-70">{email}</span>
              <button onClick={handleSignOut} className="px-3 py-1.5 rounded-xl border">Sign out</button>
            </>
          ) : (
            <Link href="/auth/login" className="px-3 py-1.5 rounded-xl border">Sign in</Link>
          )}
        </div>
      </nav>
    </header>
  )
}

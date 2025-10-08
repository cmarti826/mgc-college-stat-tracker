// components/Nav.tsx
'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { NAV_ITEMS } from '@/config/nav'

export default function Nav() {
  const pathname = usePathname()
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
    window.location.href = '/auth/login'
  }

  return (
    <header className="sticky top-0 z-40 shadow-sm">
      <div className="bg-[#3C3B6E] text-white">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 font-extrabold tracking-wide"
              aria-label="MGC Stats Home"
            >
              <span className="text-lg">🏌️‍♂️</span>
              <span className="text-base sm:text-lg">MGC Stats</span>
            </Link>

            <div className="hidden md:flex items-center gap-1 sm:gap-2 ml-2 sm:ml-4">
              {NAV_ITEMS.map((item) => {
                const isActive = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={[
                      'px-3 py-1.5 rounded-xl text-sm transition-colors border',
                      isActive
                        ? 'bg-white text-[#3C3B6E] border-white shadow-sm'
                        : 'border-transparent hover:bg-white/10'
                    ].join(' ')}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            {email ? (
              <>
                <span className="opacity-90 hidden sm:inline">{email}</span>
                <button className="btn-on-dark" onClick={handleSignOut}>
                  Sign out
                </button>
              </>
            ) : (
              <Link href="/auth/login" className="btn-on-dark">
                Sign in
              </Link>
            )}
          </div>
        </nav>
      </div>

      <div className="h-1 w-full bg-gradient-to-r from-[#B22234] via-white to-[#3C3B6E]" />
    </header>
  )
}

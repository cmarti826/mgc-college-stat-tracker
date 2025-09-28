'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type UserLite = { id: string; email?: string | null }

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<UserLite | null>(null)
  const [loading, setLoading] = useState(true)
  const [adminOpen, setAdminOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (mounted) {
        setUser(error ? null : (data.user ? { id: data.user.id, email: data.user.email } : null))
        setLoading(false)
      }
    }
    load()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null)
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const isActive = (href: string) => pathname?.startsWith(href)

  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Left: Brand + nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-[#0033A0]">
            MGC Golf
          </Link>

          {/* === MAIN NAV (edit here to add links) === */}
          <nav className="hidden gap-4 sm:flex">
            <Link className={navCls(isActive('/courses'))} href="/courses">Courses</Link>
            <Link className={navCls(isActive('/stats'))} href="/stats">Stats</Link>
            <Link className={navCls(isActive('/events'))} href="/events">Events</Link>
            <Link className={navCls(isActive('/reports'))} href="/reports/team">Reports</Link>

            {/* Admin dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setAdminOpen(v => !v)}
                onBlur={() => setTimeout(() => setAdminOpen(false), 150)}
                className={navCls(isActive('/admin'))}
              >
                Admin ▾
              </button>
              {adminOpen && (
                <div className="absolute left-0 mt-1 w-44 rounded border bg-white shadow">
                  <Link className={menuItemCls(isActive('/admin/team'))} href="/admin/team">Team</Link>
                  <Link className={menuItemCls(isActive('/admin/roster'))} href="/admin/roster">Roster</Link>
                  <Link className={menuItemCls(isActive('/admin/sg-models'))} href="/admin/sg-models">SG Models</Link>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Right: auth */}
        <div className="flex items-center gap-3">
          {!loading && user && (
            <>
              <span className="hidden text-sm text-gray-600 sm:inline">{user.email}</span>
              <button
                onClick={logout}
                className="rounded bg-[#0033A0] px-3 py-1.5 text-sm text-white hover:opacity-90"
              >
                Logout
              </button>
            </>
          )}
          {!loading && !user && (
            <Link
              href="/login"
              className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

function navCls(active: boolean) {
  return [
    'text-sm',
    active ? 'text-[#0033A0] font-medium underline' : 'text-gray-700 hover:text-[#0033A0]'
  ].join(' ')
}

function menuItemCls(active: boolean) {
  return [
    'block px-3 py-2 text-sm',
    active ? 'bg-gray-100 text-[#0033A0] font-medium' : 'hover:bg-gray-50 text-gray-800'
  ].join(' ')
}

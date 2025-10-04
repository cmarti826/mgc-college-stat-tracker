'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function Nav() {
  const pathname = usePathname()
  const [email, setEmail] = useState<string | null>(null)

  // Keep the auth badge in sync (optional; works in DEV mode too)
  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setEmail(data.user?.email ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null)
    })
    return () => {
      mounted = false
      sub?.subscription?.unsubscribe()
    }
  }, [])

    const items = useMemo(
    () => [
      { href: '/', label: 'Dashboard' },
      { href: '/teams', label: 'Teams' },          // ← add this
      { href: '/courses', label: 'Courses' },
      { href: '/courses/new', label: 'New Course' },
      { href: '/schedule', label: 'Schedule' },
      { href: '/scoring', label: 'Open Scoring' },
      { href: '/leaderboard', label: 'Leaderboard' },
      { href: '/admin/sql', label: 'SQL' },
    ],
    []
  )


  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href))

  const linkStyle: React.CSSProperties = {
    padding: '6px 8px',
    borderRadius: 8,
    textDecoration: 'none',
    color: '#222',
  }
  const activeStyle: React.CSSProperties = {
    background: '#e9eefc',
    color: '#1a3ea9',
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.replace('/') // simple reset
  }

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: '#f7f7f7',
        borderBottom: '1px solid #e5e5e5',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          maxWidth: 1200,
          margin: '0 auto',
        }}
      >
        <span style={{ fontWeight: 800, marginRight: 6 }}>MGC Stats</span>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {items.map((it) => (
            <Link key={it.href} href={it.href} style={{ ...linkStyle, ...(isActive(it.href) ? activeStyle : {}) }}>
              {it.label}
            </Link>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {email ? (
            <>
              <span style={{ fontSize: 13, color: '#555' }}>{email}</span>
              <button
                onClick={signOut}
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link href="/auth" style={{ ...linkStyle, border: '1px solid #ddd', background: '#fff' }}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

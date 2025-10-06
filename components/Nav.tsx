'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useProfile } from '@/lib/useProfile'

const linkStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 8,
  textDecoration: 'none',
  display: 'inline-block',
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const active = pathname === href || pathname?.startsWith(href + '/')
  return (
    <Link
      href={href}
      style={{
        ...linkStyle,
        background: active ? '#eef4ff' : undefined,
        color: active ? '#1849a9' : '#111',
        border: active ? '1px solid #cfe0ff' : '1px solid transparent',
      }}
    >
      {label}
    </Link>
  )
}

export default function Nav() {
  const { loading, role } = useProfile()

  const common = [
    { href: '/', label: 'Home' },
    { href: '/schedule', label: 'Schedule' },
    { href: '/scoring', label: 'Open Scoring' },
    { href: '/rounds', label: 'Rounds' },
  ]

  const coachAdmin = [
    { href: '/teams', label: 'Teams' },
    { href: '/courses', label: 'Courses' },
    { href: '/players', label: 'Players' },
  ]

  return (
    <header style={{ borderBottom: '1px solid #eee', background: '#fff' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 700, marginRight: 8 }}>MGC Stats</div>
        {common.map(l => <NavLink key={l.href} {...l} />)}
        {!loading && (role === 'coach' || role === 'admin') &&
          coachAdmin.map(l => <NavLink key={l.href} {...l} />)
        }
        <div style={{ marginLeft: 'auto' }}>
          <NavLink href="/auth" label="Sign in" />
        </div>
      </div>
    </header>
  )
}

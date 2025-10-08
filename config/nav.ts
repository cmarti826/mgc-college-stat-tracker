// config/nav.ts
export type NavItem = { href: string; label: string }

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/rounds', label: 'Rounds' },
  { href: '/rounds/new', label: 'New Round' },
  { href: '/players', label: 'Players' },
  { href: '/teams', label: 'Teams' },
  { href: '/courses', label: 'Courses' },
  { href: '/leaderboard', label: 'Leaderboard' },
]

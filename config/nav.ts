// config/nav.ts
export type NavItem = { href: string; label: string }

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/rounds', label: 'Rounds' },
  { href: '/rounds/new', label: 'New Round' },
  { href: '/players', label: 'Players' },
  { href: '/courses', label: 'Courses' },
  // Add more when you create pages:
  // { href: '/teams', label: 'Teams' },
  // { href: '/schedule', label: 'Schedule' },
  // { href: '/leaderboard', label: 'Leaderboard' },
  // { href: '/analytics', label: 'Analytics' },
  // { href: '/settings', label: 'Settings' },
]

// components/FooterNav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from '@/config/nav'

export default function FooterNav() {
  const pathname = usePathname()

  return (
    <footer className="mt-12 border-t">
      <div className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-3 text-sm font-semibold text-gray-700">
            Quick links
          </div>
          <div className="flex flex-wrap gap-2">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'px-3 py-1.5 rounded-full text-sm border transition-colors',
                    isActive
                      ? 'bg-[#3C3B6E] text-white border-[#3C3B6E]'
                      : 'bg-white hover:bg-gray-50 text-[#3C3B6E] border-gray-300',
                  ].join(' ')}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>

          <div className="mt-6 h-1 w-full bg-gradient-to-r from-[#B22234] via-white to-[#3C3B6E]" />
          <div className="mt-4 text-xs text-gray-500">
            © {new Date().getFullYear()} MGC Stats Tracker — Built for College Golf 🇺🇸
          </div>
        </div>
      </div>
    </footer>
  )
}

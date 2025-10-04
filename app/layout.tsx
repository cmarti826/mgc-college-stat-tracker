import type { Metadata } from 'next'
import { ReactNode } from 'react'
import Nav from '@/components/Nav'

export const metadata: Metadata = {
  title: 'MGC Stats',
  description: 'Marti Golf Center — College Stat Tracker',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', color: '#111' }}>
        <Nav />
        <main style={{ padding: '16px 24px', maxWidth: 1200, margin: '0 auto' }}>
          {children}
        </main>
      </body>
    </html>
  )
}

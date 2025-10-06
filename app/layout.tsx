// /app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'
import Nav from '@/components/Nav'

export const metadata: Metadata = { title: 'MGC Stats', description: 'College golf stat tracker' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: '#fcfcfc' }}>
        <Nav />
        <main style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
          {children}
        </main>
      </body>
    </html>
  )
}

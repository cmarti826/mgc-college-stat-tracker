import './globals.css'
import type { Metadata, Viewport } from 'next'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'MGC College Golf Stat Tracker',
  description: 'Rounds, strokes gained, live leaderboards',
  icons: { icon: '/favicon.ico' },
}

export const viewport: Viewport = { themeColor: '#0033A0', colorScheme: 'light' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-gray-50 text-gray-900 antialiased">
        <Navbar />
        <main className="mx-auto max-w-5xl p-4">{children}</main>
      </body>
    </html>
  )
}

// app/layout.tsx
import './globals.css'
import Nav from '@/components/Nav'
import FooterNav from '@/components/FooterNav'

export const metadata = {
  title: 'MGC Golf Stat Tracker',
  description: 'Track collegiate golf performance with MGC Stats.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900">
        <Nav />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <FooterNav />
      </body>
    </html>
  )
}

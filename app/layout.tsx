import './globals.css'
import Link from 'next/link'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="bg-white border-b">
          <div className="container flex items-center justify-between py-3">
            <div className="font-bold">MGC College Golf Stats</div>
            <nav className="flex gap-3">
              <Link className="btn" href="/schedule">Schedule</Link>
              <Link className="btn" href="/rounds/new">New Round</Link>
              <Link className="btn" href="/auth">Auth</Link>
            </nav>
          </div>
        </header>
        <main className="container py-6">{children}</main>
      </body>
    </html>
  )
}

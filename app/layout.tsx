// app/layout.tsx
import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'MGC Golf Stat Tracker',
  description: 'Track your golf performance – the American way 🇺🇸',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} min-h-screen bg-gradient-to-b from-mgc-blue via-mgc-white to-mgc-red text-gray-900`}
      >
        {children}
      </body>
    </html>
  )
}

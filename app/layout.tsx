// app/layout.tsx
import './globals.css'
import type { Metadata, Viewport } from 'next'
import Nav from '@/components/Nav'

export const metadata: Metadata = {
  title: 'MGC Stats',
  description: 'College golf stat tracker',
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  colorScheme: 'light',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#fcfcfc] text-gray-900">
        <Nav />
        <main className="mx-auto max-w-[1100px] p-4">{children}</main>
      </body>
    </html>
  )
}

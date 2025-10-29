// app/page.tsx
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server' // ← FIXED

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = createServerSupabase() // ← NOW WORKS
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">MGC College Stat Tracker</h1>
          <p className="text-lg text-gray-700">Track strokes gained, team performance, and player trends.</p>
        </div>

        {user ? (
          <div className="space-y-3">
            <p className="text-gray-800">Welcome back!</p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-black text-white rounded-xl font-medium hover:opacity-90 transition"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-black text-white rounded-xl font-medium hover:opacity-90 transition"
          >
            Sign In with Google
          </Link>
        )}
      </div>
    </div>
  )
}
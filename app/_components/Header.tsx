// app/_components/Header.tsx
import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function Header() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Home */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg" />
            <span className="font-bold text-xl">MGC Stats</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="text-gray-700 hover:text-black font-medium">
              Dashboard
            </Link>
            <Link href="/rounds/new" className="text-gray-700 hover:text-black font-medium">
              + Round
            </Link>
            <Link href="/leaderboard" className="text-gray-700 hover:text-black font-medium">
              Leaderboard
            </Link>
            {user && (
              <Link href="/profile" className="text-gray-700 hover:text-black font-medium">
                Profile
              </Link>
            )}
          </nav>

          {/* Auth */}
          <div className="flex items-center gap-3">
            {user ? (
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
                >
                  Sign Out
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-white bg-black rounded-xl hover:opacity-90 transition"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
// app/page.tsx
import { createServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <h1 className="text-5xl font-bold text-gray-900">MGC College Stat Tracker</h1>
        <p className="text-xl text-gray-700">Track strokes gained, trends, and team performance.</p>

        {user ? (
          <div className="space-x-4">
            <Link href="/dashboard" className="px-6 py-3 bg-black text-white rounded-xl font-medium hover:opacity-90">
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <Link href="/login" className="inline-block px-6 py-3 bg-black text-white rounded-xl font-medium hover:opacity-90">
            Sign In with Google
          </Link>
        )}
      </div>
    </div>
  );
}
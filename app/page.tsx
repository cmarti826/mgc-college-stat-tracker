// app/page.tsx

import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { Trophy, TrendingUp, Users, Flag } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Hero Section */}
      <section className="px-4 py-16 sm:py-24 lg:py-32">
        <div className="max-w-7xl mx-auto text-center">
          {/* Logo + Headline */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[var(--mgc-red)] to-[var(--mgc-blue)] p-0.5">
                <div className="h-full w-full rounded-lg bg-white flex items-center justify-center">
                  <span className="text-lg font-bold text-[var(--mgc-blue)]">MGC</span>
                </div>
              </div>
              <span className="text-2xl font-bold text-gray-900">MGC Golf</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight">
              College Stat Tracker
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-gray-700 max-w-3xl mx-auto">
              Track strokes gained, team performance, and player trends with precision.
            </p>
          </div>

          {/* CTA */}
          <div className="mt-8">
            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-[var(--mgc-red)] to-[var(--mgc-blue)] text-white font-semibold shadow-sm hover:opacity-95 transition-opacity"
              >
                <TrendingUp className="h-5 w-5" />
                Go to Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-[var(--mgc-red)] to-[var(--mgc-blue)] text-white font-semibold shadow-sm hover:opacity-95 transition-opacity"
              >
                <Flag className="h-5 w-5" />
                Sign In with Google
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 py-16 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Everything You Need to Win
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Trophy className="h-10 w-10 text-[var(--mgc-red)]" />,
                title: "Tournament Ready",
                desc: "Schedule events, manage rounds, and track live leaderboards.",
              },
              {
                icon: <Users className="h-10 w-10 text-[var(--mgc-blue)]" />,
                title: "Team Management",
                desc: "Rosters, roles, and performance analytics for every player.",
              },
              {
                icon: <TrendingUp className="h-10 w-10 text-green-600" />,
                title: "Strokes Gained",
                desc: "Advanced stats: driving, approach, short game, putting.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="text-center p-6 rounded-2xl border border-gray-200 bg-gray-50 hover:shadow-md transition-shadow"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Elevate Your Game?
          </h2>
          <p className="text-lg text-gray-700 mb-8">
            Join coaches and players using MGC to dominate the competition.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-br from-[var(--mgc-red)] to-[var(--mgc-blue)] text-white font-semibold shadow-sm hover:opacity-95 transition-opacity"
            >
              Get Started Free
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
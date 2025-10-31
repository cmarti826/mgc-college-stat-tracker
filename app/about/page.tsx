// app/about/page.tsx

import Link from "next/link";
import { Button } from "@/components/Button";
import { Trophy, Users, Flag, MapPin, Award, Clock } from "lucide-react";

export const metadata = {
  title: "About Marti Golf Center | 93 Years of Houston Golf Excellence",
  description:
    "Founded in 1989 by Chad Marti, 3rd-generation golf professional and former D1 golfer. Serving Houston with elite coaching, club fitting, and stat tracking.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <section className="px-4 py-16 sm:py-20 lg:py-28">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-3 text-sm font-medium text-[var(--mgc-blue)]">
                <Clock className="h-4 w-4" />
                ESTABLISHED 1989
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight">
                Marti Golf Center
              </h1>
              <p className="text-xl text-gray-700 leading-relaxed">
                <strong className="text-[var(--mgc-red)]">93 years</strong> of Houston golf tradition. 
                From D1 fairways to your local practice facility — we build better golfers.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" variant="primary">
                  <Link href="/login">Get Started</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/contact">Book a Fitting</Link>
                </Button>
              </div>
            </div>

            {/* Hero Image / Logo */}
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                <div className="h-full w-full bg-gradient-to-br from-[var(--mgc-red)] to-[var(--mgc-blue)] p-1">
                  <div className="h-full w-full bg-white rounded-xl flex items-center justify-center">
                    <div className="text-center p-8">
                      <div className="text-6xl font-bold text-[var(--mgc-blue)]">MGC</div>
                      <p className="mt-2 text-sm font-medium text-gray-600">Since 1989</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-lg p-4 border">
                <p className="text-sm font-semibold text-gray-900">Chad Marti</p>
                <p className="text-xs text-gray-600">Owner & Master Club Fitter</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chad Marti Bio */}
      <section className="px-4 py-16 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-3xl font-bold text-gray-900">Meet Chad Marti</h2>
              <div className="prose prose-lg text-gray-700 max-w-none">
                <p>
                  I’m <strong>Chad Marti</strong> — a <strong>3rd-generation golf professional</strong> with a lifetime in the game.
                </p>
                <p>
                  A former <strong>D1 college golfer at the University of Houston</strong>, I’ve competed at the highest levels for over{" "}
                  <strong>18 years</strong>. From Assistant Golf Professional to Head Golf Professional, and now owner of{" "}
                  <strong>Marti Golf Center</strong>, I’ve lived every role in this sport.
                </p>
                <p>
                  As a <strong>Master Club Fitter with 20+ years of experience</strong> and a former{" "}
                  <strong>Assistant D1 College Golf Coach</strong>, I know what it takes to build a winning swing — and a winning program.
                </p>
                <p className="text-lg font-medium text-[var(--mgc-blue)]">
                  My family has been serving the Greater Houston area as Golf Professionals for <strong>over 93 years</strong>.
                </p>
              </div>
            </div>

            {/* Credentials */}
            <div className="bg-gray-50 rounded-2xl p-6 space-y-4 border">
              <h3 className="text-lg font-semibold text-gray-900">Credentials</h3>
              <ul className="space-y-3 text-sm">
                {[
                  { icon: <Trophy className="h-5 w-5 text-[var(--mgc-red)]" />, label: "Former D1 Golfer – University of Houston" },
                  { icon: <Award className="h-5 w-5 text-[var(--mgc-blue)]" />, label: "Master Club Fitter – 20+ Years" },
                  { icon: <Users className="h-5 w-5 text-green-600" />, label: "Assistant D1 College Golf Coach" },
                  { icon: <Flag className="h-5 w-5 text-purple-600" />, label: "18+ Years Professional Competition" },
                  { icon: <MapPin className="h-5 w-5 text-amber-600" />, label: "Owner – Marti Golf Center (Est. 1989)" },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    {item.icon}
                    <span className="text-gray-700">{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Legacy Timeline */}
      <section className="px-4 py-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            A Legacy of Excellence
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                year: "1931",
                title: "The Marti Era Begins",
                desc: "First generation enters golf instruction in Houston.",
              },
              {
                year: "1989",
                title: "Marti Golf Center Founded",
                desc: "Chad’s vision: a premier practice & coaching facility.",
              },
              {
                year: "Today",
                title: "93 Years Strong",
                desc: "3 generations. 1 mission: Build better golfers.",
              },
            ].map((milestone, i) => (
              <div
                key={i}
                className="text-center p-6 rounded-2xl border border-gray-200 bg-white hover:shadow-md transition-shadow"
              >
                <div className="text-4xl font-bold text-[var(--mgc-blue)] mb-2">
                  {milestone.year}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {milestone.title}
                </h3>
                <p className="text-sm text-gray-600">{milestone.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 bg-[var(--mgc-blue)] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Train Like a Champion?
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Join the Marti Golf Center family — where tradition meets technology.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="secondary">
              <Link href="/login">Start Tracking Stats</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-white text-[var(--mgc-blue)] border-white hover:bg-gray-100">
              <Link href="/contact">Schedule a Fitting</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
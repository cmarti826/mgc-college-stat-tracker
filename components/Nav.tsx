// components/Nav.tsx

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Home, Users, Flag, LayoutDashboard, LogOut, User, Edit } from "lucide-react";

// Fallback stub for useUser to avoid build errors when '@supabase/auth-helpers-react' is not installed.
// Replace this stub with the real auth hook (e.g., from Supabase) when you add that dependency.
function useUser(): { email?: string } | null {
  return null;
}
import { Button } from "@/components/Button";
import LogoutButton from "@/components/LogoutButton";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: <Home className="h-4 w-4" /> },
  { href: "/teams", label: "Teams", icon: <Users className="h-4 w-4" /> },
  { href: "/rounds", label: "Rounds", icon: <Flag className="h-4 w-4" /> },
  { href: "/courses", label: "Courses", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/admin", label: "Admin", icon: <Edit className="h-4 w-4" /> },
];

export function Nav() {
  const pathname = usePathname();
  const user = useUser();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[var(--mgc-red)] to-[var(--mgc-blue)] p-0.5">
              <div className="h-full w-full rounded-md bg-white flex items-center justify-center">
                <span className="text-[var(--mgc-blue)] font-bold text-sm">MGC</span>
              </div>
            </div>
            <span className="font-bold text-xl text-gray-900 hidden sm:block">
              MGC Golf
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all
                  ${isActive(item.href)
                    ? "bg-[var(--mgc-blue)] text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-100 hover:text-[var(--mgc-blue)]"
                  }
                `}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-600" />
                  <span className="text-gray-700 font-medium">
                    {user.email?.split("@")[0]}
                  </span>
                </div>
                <LogoutButton />
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium bg-[var(--mgc-blue)] text-white shadow-sm"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${isActive(item.href)
                      ? "bg-[var(--mgc-blue)] text-white"
                      : "text-gray-700 hover:bg-gray-50"
                    }
                  `}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}

              <div className="pt-3 border-t border-gray-200">
                {user ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      <span>{user.email}</span>
                    </div>
                    <div className="px-3">
                      <LogoutButton />
                    </div>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex items-center justify-center w-full gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--mgc-blue)] text-white"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
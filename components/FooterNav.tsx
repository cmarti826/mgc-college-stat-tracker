// components/FooterNav.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/config/nav";

export default function FooterNav() {
  const pathname = usePathname();

  return (
    <footer className="mt-16 border-t border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
              Quick Links
            </h3>
            <nav className="flex flex-wrap gap-2">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname?.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                      focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--mgc-blue)]
                      ${isActive
                        ? "bg-[var(--mgc-blue)] text-white border border-[var(--mgc-blue)] shadow-sm"
                        : "bg-white text-[var(--mgc-blue)] border border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                      }
                    `}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {(item as any).icon && <span className="mr-1.5">{(item as any).icon}</span>}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Patriotic Accent Bar */}
          <div className="h-1 w-full rounded-full bg-gradient-to-r from-[var(--mgc-red)] via-white to-[var(--mgc-blue)]" />

          {/* Copyright */}
          <div className="text-center text-xs text-gray-500">
            © {new Date().getFullYear()} MGC Golf Stats Tracker —{" "}
            <span className="inline-flex items-center gap-1">
              Built for College Golf
              <span role="img" aria-label="USA flag">
                USA
              </span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
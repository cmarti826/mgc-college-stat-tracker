// components/Nav.tsx

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home" },
  { href: "/players", label: "Players" },
  { href: "/teams", label: "Teams" },
  { href: "/rounds", label: "Rounds" },
  { href: "/events", label: "Events" },
  { href: "/courses", label: "Courses" },
  { href: "/tees", label: "Tees" },
  { href: "/rounds/new", label: "Create Round" },
  { href: "/admin", label: "Admin" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="border-b bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="h-14 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">
            MGC Golf
          </Link>
          <nav className="flex gap-3 text-sm">
            {items.map((it) => {
              const active = pathname === it.href || pathname?.startsWith(it.href + "/");
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`px-2 py-1 rounded-md hover:bg-neutral-100 ${
                    active ? "bg-neutral-200 font-medium" : ""
                  }`}
                >
                  {it.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}

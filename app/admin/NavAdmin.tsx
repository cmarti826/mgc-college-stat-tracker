"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/players", label: "Players" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/rounds", label: "Rounds" },
  { href: "/admin/events", label: "Events" }, // NEW
];

export default function NavAdmin() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2">
      {items.map((it) => {
        const active = pathname === it.href || pathname.startsWith(it.href + "/");
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`px-3 py-1 rounded-lg border ${
              active ? "bg-blue-600 text-white" : "bg-white hover:bg-gray-50"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

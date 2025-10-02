'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';

function navCls(active: boolean) {
  return `rounded px-3 py-1.5 hover:bg-gray-100 ${active ? 'bg-gray-100' : ''}`;
}

export default function Navbar() {
  const path = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
    })();
  }, []);

  return (
    <nav className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <Link href="/" className="font-semibold text-[#0033A0]">MGC Stats</Link>
          <Link href="/events" className={navCls(path.startsWith('/events'))}>Events</Link>
          <Link href="/courses" className={navCls(path.startsWith('/courses'))}>Courses</Link>
          <Link href="/stats" className={navCls(path.startsWith('/stats'))}>Stats</Link>
          <Link href="/reports/team" className={navCls(path.startsWith('/reports'))}>Reports</Link>
          <div className="ml-2 border-l pl-2">
            <Link href="/admin/team" className={navCls(path.startsWith('/admin/team'))}>Admin</Link>
            <Link href="/admin/roster" className={navCls(path.startsWith('/admin/roster'))}>Roster</Link>
            <Link href="/admin/sg-models" className={navCls(path.startsWith('/admin/sg-models'))}>SG Models</Link>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {email ? (
            <>
              <span className="text-gray-600">{email}</span>
              <button
                className="rounded border px-3 py-1.5 hover:bg-gray-50"
                onClick={async () => {
                  await supabase.auth.signOut();
                  location.href = '/login';
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="rounded border px-3 py-1.5 hover:bg-gray-50">Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
}

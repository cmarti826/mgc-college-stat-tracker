// app/players/Nav.tsx

import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';

export default function NavPlayers() {
  return (
    <nav className="flex items-center justify-between border-b bg-white px-4 py-3">
      {/* Left links */}
      <div className="flex items-center gap-4">
        <Link href="/players" className="text-sm font-medium hover:underline">
          My Rounds
        </Link>
        <Link href="/players/stats" className="text-sm font-medium hover:underline">
          Stats
        </Link>
        <Link href="/players/profile" className="text-sm font-medium hover:underline">
          Profile
        </Link>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <LogoutButton />
      </div>
    </nav>
  );
}

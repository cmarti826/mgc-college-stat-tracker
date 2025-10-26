// app/admin/NavAdmin.tsx
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';

export default function NavAdmin() {
  return (
    <nav className="flex items-center justify-between border-b bg-white px-4 py-3">
      {/* Left side links */}
      <div className="flex items-center gap-4">
        <Link href="/admin" className="text-sm font-medium hover:underline">
          Dashboard
        </Link>
        <Link href="/admin/teams" className="text-sm font-medium hover:underline">
          Teams
        </Link>
        <Link href="/admin/players" className="text-sm font-medium hover:underline">
          Players
        </Link>
        <Link href="/admin/courses" className="text-sm font-medium hover:underline">
          Courses
        </Link>
        <Link href="/admin/tee-sets" className="text-sm font-medium hover:underline">
          Tee Sets
        </Link>
        <Link href="/admin/rounds" className="text-sm font-medium hover:underline">
          Rounds
        </Link>
      </div>

      {/* Right side: Sign out */}
      <div className="flex items-center gap-3">
        <LogoutButton />
      </div>
    </nav>
  );
}

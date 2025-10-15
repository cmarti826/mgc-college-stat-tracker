// app/_components/Header.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Header() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="border-b">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
        <Link href="/" className="font-semibold">MGC Golf</Link>
        <nav className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <Link href="/rounds" className="px-2">Rounds</Link>
              <Link href="/players" className="px-2">Players</Link>
              <form action="/logout" method="post">
                <button className="rounded border px-3 py-1">Sign out</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="rounded border px-3 py-1">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

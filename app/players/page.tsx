import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type Player = { id: string; full_name: string | null };

export default async function PlayersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <div className="p-6">Please <Link href="/login">log in</Link>.</div>;

  // If you created the v_my_players view, this is super simple:
  const { data: players, error } = await supabase.from('v_my_players').select('*');
  if (error) {
    return <div className="p-6 text-red-600">Error loading players: {error.message}</div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Players</h1>
        <Link href="/players/attach" className="rounded border px-3 py-2 hover:shadow">
          Link Player
        </Link>
      </div>

      {players?.length ? (
        <ul className="space-y-2">
          {players.map((p: Player) => (
            <li key={p.id} className="rounded border p-3">
              <div className="font-medium">{p.full_name ?? 'Unnamed Player'}</div>
              <div className="text-xs text-gray-500">{p.id}</div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-gray-600">
          No players linked to your account yet.{' '}
          <Link href="/players/attach" className="underline">
            Link one now
          </Link>
          .
        </div>
      )}
    </div>
  );
}

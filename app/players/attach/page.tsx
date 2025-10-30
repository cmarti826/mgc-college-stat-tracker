// app/players/attach/page.tsx

import { createServerSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AttachPlayer from '../_components/AttachPlayer';

export const dynamic = 'force-dynamic';

type Player = { id: string; full_name: string };
type Team = { id: string; name: string };

export default async function AttachPlayerPage() {
  const supabase = createServerSupabase();

  // 1. Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/(auth)/login');
  }

  // 2. Fetch players
  const { data: players, error: pErr } = await supabase
    .from('mgc.players')
    .select('id, full_name')
    .order('full_name', { ascending: true });

  if (pErr) {
    console.error('Players fetch error:', pErr);
  }

  // 3. Fetch teams
  const { data: teams, error: tErr } = await supabase
    .from('mgc.teams')
    .select('id, name')
    .order('name', { ascending: true });

  if (tErr) {
    console.error('Teams fetch error:', tErr);
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attach Player to Team</h1>
        <p className="text-sm text-gray-600 mt-1">
          Link a player to your account and assign them to a team.
        </p>
      </div>

      {/* Only one instance — remove duplicate */}
      <AttachPlayer players={players ?? []} teams={teams ?? []} />
    </div>
  );
}
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import AttachPlayer from '../_components/AttachPlayer';

export default async function AttachPlayerPage() {
  const supabase = createBrowserSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/players/attach');
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Link your account to a player</h1>
      </div>
      <p className="text-sm text-gray-600">
        Enter the player’s full name. If the player doesn’t exist yet, we’ll create it and link your account.
      </p>
      <AttachPlayer />
    </div>
  );
}

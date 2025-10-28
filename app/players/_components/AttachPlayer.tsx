'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';

export default function AttachPlayer() {
  const supabase = createBrowserSupabase();
  const [name, setName] = useState('');
  const [role, setRole] = useState<'player' | 'coach' | 'admin'>('player');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function attach() {
    setBusy(true);
    setStatus(null);
    const { data, error } = await supabase.rpc('claim_player', {
      p_full_name: name,
      p_role: role,
    });
    if (error) setStatus(error.message);
    else setStatus(`Linked to player id: ${data}`);
    setBusy(false);
  }

  return (
    <div className="max-w-md space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Player full name</label>
        <input
          className="w-full rounded border p-2"
          placeholder="e.g., Chad Test '28"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Role</label>
        <select
          className="w-full rounded border p-2"
          value={role}
          onChange={(e) => setRole(e.target.value as any)}
        >
          <option value="player">Player</option>
          <option value="coach">Coach</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <button
        onClick={attach}
        disabled={!name.trim() || busy}
        className="rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {busy ? 'Linking…' : 'Link Player'}
      </button>

      {status && <p className="text-sm">{status}</p>}
    </div>
  );
}

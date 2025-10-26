// app/admin/players/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import NavAdmin from '../NavAdmin';

export default function AdminPlayersPage() {
  const supabase = createClient();
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('players')
        .select('id, full_name, grad_year, team_id, teams(name)')
        .order('full_name');
      if (error) setError(error.message);
      setPlayers(data ?? []);
      setLoading(false);
    })();
  }, [supabase]);

  const handleSendReset = async (email: string) => {
    if (!email) return alert('Player does not have an email.');
    if (!confirm(`Send password reset email to ${email}?`)) return;

    try {
      setSending(email);
      const res = await fetch('/api/admin/send-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reset email.');
      alert(`Password reset link sent to ${email}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <NavAdmin />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Players</h1>
        <Link
          href="/admin/players/new"
          className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
        >
          + Add Player
        </Link>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div>Loading players…</div>
      ) : (
        <table className="w-full border text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2">Name</th>
              <th className="p-2">Team</th>
              <th className="p-2">Grad Year</th>
              <th className="p-2">Email</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2">{p.full_name}</td>
                <td className="p-2">{p.teams?.name || '—'}</td>
                <td className="p-2">{p.grad_year || '—'}</td>
                <td className="p-2">{p.email || '—'}</td>
                <td className="p-2 text-right space-x-2">
                  <button
                    onClick={() => handleSendReset(p.email)}
                    disabled={!p.email || sending === p.email}
                    className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-60"
                  >
                    {sending === p.email ? 'Sending…' : 'Send Reset'}
                  </button>
                  <Link
                    href={`/admin/players/${p.id}`}
                    className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

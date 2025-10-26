'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import NavAdmin from '../NavAdmin';

type PlayerRow = {
  id: string;
  full_name: string;
  grad_year: number | null;
  email: string | null;
  team_members?: Array<{ team_id: string; teams?: { name: string | null } | null }>;
};

export default function AdminPlayersPage() {
  const supabase = createClient();
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('players')
        // ✅ Read teams via team_members join (no direct players.team_id)
        .select('id, full_name, grad_year, email, team_members(team_id, teams(name))')
        .order('full_name', { ascending: true });

      if (error) setError(error.message);
      setPlayers((data ?? []) as PlayerRow[]);
      setLoading(false);
    })();
  }, [supabase]);

  const handleSendReset = async (email: string | null) => {
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
              <th className="p-2">Team(s)</th>
              <th className="p-2">Grad Year</th>
              <th className="p-2">Email</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const teamNames =
                (p.team_members ?? [])
                  .map((tm) => tm?.teams?.name)
                  .filter(Boolean)
                  .join(', ') || '—';

              return (
                <tr key={p.id} className="border-t">
                  <td className="p-2">{p.full_name}</td>
                  <td className="p-2">{teamNames}</td>
                  <td className="p-2">{p.grad_year ?? '—'}</td>
                  <td className="p-2">{p.email ?? '—'}</td>
                  <td className="p-2 text-right space-x-2">
                    <button
                      onClick={() => handleSendReset(p.email ?? null)}
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
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

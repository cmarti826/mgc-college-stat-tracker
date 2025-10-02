'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function sendMagicLink() {
    setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin } });
    setMsg(error ? error.message : 'Check your email for a login link.');
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Login</h1>
      <input
        className="w-full rounded border px-3 py-2"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button className="rounded bg-[#0033A0] px-4 py-2 text-white" onClick={sendMagicLink}>
        Send link
      </button>
      {msg && <div className="rounded border bg-gray-50 p-2 text-sm">{msg}</div>}
    </div>
  );
}

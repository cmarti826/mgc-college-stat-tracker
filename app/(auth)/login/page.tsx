'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup' | 'magic'>('signin');
  const [error, setError] = useState<string | null>(null);
  const redirectTo = params.get('redirectTo') || '/';

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace(redirectTo);
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // If email confirmation is required, they’ll get a link. Otherwise, session is active.
    router.replace(redirectTo);
  };

  const handleMagicLink = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_SITE_URL
            ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
            : `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    alert('Magic link sent. Check your email!');
  };

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-bold">Player Login</h1>

      <div className="mb-3 flex gap-2">
        <button
          onClick={() => setMode('signin')}
          className={`rounded-md border px-3 py-1 text-sm ${mode === 'signin' ? 'bg-gray-100' : ''}`}
        >
          Sign In
        </button>
        <button
          onClick={() => setMode('signup')}
          className={`rounded-md border px-3 py-1 text-sm ${mode === 'signup' ? 'bg-gray-100' : ''}`}
        >
          Sign Up
        </button>
        <button
          onClick={() => setMode('magic')}
          className={`rounded-md border px-3 py-1 text-sm ${mode === 'magic' ? 'bg-gray-100' : ''}`}
        >
          Magic Link
        </button>
      </div>

      <div className="space-y-3 rounded-2xl border bg-white p-4">
        <div>
          <label className="block text-sm">Email</label>
          <input
            type="email"
            className="w-full rounded border p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@school.edu"
          />
        </div>

        {mode !== 'magic' && (
          <div>
            <label className="block text-sm">Password</label>
            <input
              type="password"
              className="w-full rounded border p-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2">
          {mode === 'signin' && (
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="rounded-xl bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          )}
          {mode === 'signup' && (
            <button
              onClick={handleSignUp}
              disabled={loading}
              className="rounded-xl bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {loading ? 'Creating…' : 'Create Account'}
            </button>
          )}
          {mode === 'magic' && (
            <button
              onClick={handleMagicLink}
              disabled={loading || !email}
              className="rounded-xl bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send Magic Link'}
            </button>
          )}
          <Link href="/" className="text-sm text-gray-600 hover:underline">
            Cancel
          </Link>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        Need help? Ask your coach to link your account to a player in <code>user_players</code>.
      </p>
    </div>
  );
}

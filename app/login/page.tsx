// app/login/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

const ALLOWED_DOMAIN = undefined; // e.g. "martigolfcenter.com" to restrict signup; or leave undefined

type Mode = "signin" | "signup";

export default function LoginPage() {
  const supabase = createClient();
  const params = useSearchParams();
  const router = useRouter();

  const redirect = params.get("redirect") || "/rounds";
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    if (mode === "signup" && ALLOWED_DOMAIN) {
      const domain = email.split("@")[1]?.toLowerCase();
      if (domain !== ALLOWED_DOMAIN) {
        setError(`Only ${ALLOWED_DOMAIN} emails may sign up.`);
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(redirect);
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        // If email confirmations are ON, tell the user to verify.
        if (data.user && !data.session) {
          setNotice("Account created. Check your email to confirm before signing in.");
        } else {
          router.replace(redirect);
        }
      }
    } catch (err: any) {
      setError(err?.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Sign {mode === "signin" ? "in" : "up"}</h1>

      <div className="flex gap-2">
        <button
          className={`rounded px-3 py-1 border ${mode === "signin" ? "bg-indigo-600 text-white" : ""}`}
          onClick={() => setMode("signin")}
        >
          Sign in
        </button>
        <button
          className={`rounded px-3 py-1 border ${mode === "signup" ? "bg-indigo-600 text-white" : ""}`}
          onClick={() => setMode("signup")}
        >
          Create account
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          className="w-full rounded border p-2"
          placeholder="you@school.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          type="password"
          className="w-full rounded border p-2"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          minLength={6}
          required
        />

        <button
          disabled={busy}
          className="rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-60"
        >
          {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice && <p className="text-sm text-amber-700">{notice}</p>}
      </form>

      <p className="text-sm text-gray-600">
        After signing {mode === "signin" ? "in" : "up"}, you’ll be redirected to <code>{redirect}</code>.
      </p>
    </div>
  );
}

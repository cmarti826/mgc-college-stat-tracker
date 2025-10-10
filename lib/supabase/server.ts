// lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Server-side Supabase client for Next.js App Router.
 * Uses signed cookies so RLS/auth work in server components & actions.
 */
export function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies().get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // Next's cookies() is read-only in server components, but
          // createServerClient requires set/remove. No-ops are fine here.
        },
        remove(name: string, options: any) {
          // no-op
        },
      },
    }
  );
}

// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Read-only Supabase client for Server Components / loaders.
 * Important: set/remove are NO-OPs to avoid
 * "Cookies can only be modified in a Server Action or Route Handler".
 */
export function createServerSupabaseReadOnly() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // No-ops in Server Components
        set() {
          /* no-op */
        },
        remove() {
          /* no-op */
        },
      },
    }
  );
}

/**
 * Mutable Supabase client for Server Actions / Route Handlers ONLY.
 * Safe to call cookies.set/delete here.
 */
export function createServerSupabaseAction() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // Next.js 14+ accepts object form
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string) {
          // Next.js 14+ delete API
          cookieStore.delete(name);
        },
      },
    }
  );
}

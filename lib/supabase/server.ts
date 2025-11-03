// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Read-only Supabase client for Server Components / loaders.
 * Schema is pinned to 'mgc'.
 * set/remove are NO-OPs => avoids "Cookies can only be modified..." errors.
 */
export function createServerSupabaseReadOnly() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: "mgc" }, // 👈 force all reads to mgc schema
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
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
 * Schema is pinned to 'mgc'.
 * OK to set/delete cookies here.
 */
export function createServerSupabaseAction() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: "mgc" }, // 👈 same fix for mutations
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options?: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string) {
          cookieStore.delete(name);
        },
      },
    }
  );
}

/**
 * TEMP compatibility alias so existing files that import
 * `createServerSupabase` keep compiling. It is READ-ONLY.
 * Migrate call sites that run inside "use server" or Route Handlers
 * to `createServerSupabaseAction()`.
 */
export const createServerSupabase = createServerSupabaseReadOnly;

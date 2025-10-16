// lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // @supabase/ssr expects getAll() on the server
        getAll() {
          // Next.js returns { name, value, ... } objects; we just pass them through
          return cookieStore.getAll().map((c) => ({ name: c.name, value: c.value }));
        },
        set(name: string, value: string, options?: any) {
          try {
            cookieStore.set({ name, value, ...(options ?? {}) });
          } catch {
            // no-op in pure RSC contexts
          }
        },
        remove(name: string, options?: any) {
          try {
            cookieStore.set({ name, value: "", ...(options ?? {}) });
          } catch {
            // no-op in pure RSC contexts
          }
        },
      },
    }
  );
}

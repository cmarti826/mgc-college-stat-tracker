// lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function createClient() {
  const store = cookies();

  // Support BOTH old and new @supabase/ssr cookie contracts.
  const cookieAdapter: any = {
    // Old (deprecated) shape:
    get(name: string) {
      return store.get(name)?.value;
    },
    set(name: string, value: string, options?: any) {
      try {
        store.set({ name, value, ...(options ?? {}) });
      } catch {
        /* no-op in pure RSC */
      }
    },
    remove(name: string, options?: any) {
      try {
        store.set({ name, value: "", ...(options ?? {}) });
      } catch {
        /* no-op in pure RSC */
      }
    },

    // New shape:
    getAll() {
      return store.getAll().map((c) => ({ name: c.name, value: c.value }));
    },
    setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          store.set({ name, value, ...(options ?? {}) })
        );
      } catch {
        /* no-op in pure RSC */
      }
    },
  };

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: cookieAdapter, // casted to any above to satisfy both overloads
    }
  );
}

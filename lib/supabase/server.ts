// lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Use the function form that returns getAll/setAll (matches CookieMethodsServer)
      cookies: () => {
        const store = cookies();
        return {
          getAll() {
            // Map to the shape @supabase/ssr expects: { name, value }
            return store.getAll().map((c) => ({ name: c.name, value: c.value }));
          },
          setAll(cookiesToSet) {
            // Safely set cookies in environments where it's allowed
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                store.set({ name, value, ...(options ?? {}) });
              });
            } catch {
              // no-op in pure RSC where set() isn't available
            }
          },
        };
      },
    }
  );
}

// lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Use this in Server Components (pages, layouts, headers).
 * It only READS cookies. set/remove are NO-OPs to avoid Next.js errors.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // IMPORTANT: NO-OPs in Server Components
        set() {},
        remove() {},
      },
    }
  );
}

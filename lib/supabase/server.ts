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
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options?: Parameters<typeof cookieStore.set>[0]) {
          try {
            cookieStore.set(typeof options === "object" ? { ...options, name, value } : { name, value });
          } catch {
            // no-op in pure RSC where set/remove aren't available
          }
        },
        remove(name: string, options?: Parameters<typeof cookieStore.set>[0]) {
          try {
            cookieStore.set(typeof options === "object" ? { ...options, name, value: "" } : { name, value: "" });
          } catch {
            // no-op in pure RSC
          }
        },
      },
    }
  );
}

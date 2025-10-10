// ==========================
// File: lib/supabase/server.ts
// (If you already have this, keep your existing helper.)
// ==========================
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookies().get(name)?.value } }
  );
}

// lib/supabase/browser.ts
import { createBrowserClient } from "@supabase/ssr";

/**
 * Client-side Supabase instance for use in Client Components/hooks.
 * Reads public env vars (must be set in Vercel project settings).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

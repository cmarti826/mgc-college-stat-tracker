import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Singleton so the browser only instantiates once during HMR/build
let browserClient: SupabaseClient | null = null

export function getSupabaseBrowser(): SupabaseClient {
  if (browserClient) return browserClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  browserClient = createClient(url, anon)
  return browserClient
}

// Optional convenience export for files that expect `supabase` directly
export const supabase = getSupabaseBrowser()

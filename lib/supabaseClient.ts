// /lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

// Make sure these env vars are set in Vercel
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Single browser client used across the app
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: { 'x-application-name': 'mgcstats' },
  },
})

/**
 * Back-compat helper for files that import getSupabaseBrowser()
 * (e.g., app/rounds/[id]/score/ui.tsx and app/rounds/new/ui.tsx)
 */
export function getSupabaseBrowser() {
  return supabase
}

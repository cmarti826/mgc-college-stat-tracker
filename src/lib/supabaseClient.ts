// src/lib/supabaseClient.ts
'use client'

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anon) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Set them in your .env.local and in Vercel Project → Settings → Environment Variables.'
    )
  }

  _client = createSupabaseClient(url, anon)
  return _client
}

// (Optional) If you like importing a singleton:
// export const supabase = createClient()

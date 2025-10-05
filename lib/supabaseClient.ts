import { createClient } from '@supabase/supabase-js'

// IMPORTANT: these must be the production project's values (no trailing slash)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // keep a single session in the browser and refresh automatically
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    // Identify your app; helps support track requests
    headers: { 'x-application-name': 'mgcstats' },
  },
})

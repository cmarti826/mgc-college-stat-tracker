// lib/supabase/server.ts
'use server';

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const createServerSupabase = () => {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll().map(c => ({ name: c.name, value: c.value })); },
        setAll(cookiesToSet) { cookiesToSet.forEach(c => cookieStore.set(c.name, c.value, c.options)); },
      },
      db: {
        schema: "mgc", // ← SET DEFAULT SCHEMA HERE
      },
    }
  );
};
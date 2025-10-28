// lib/supabase/client.ts
import { createClient } from "@supabase/ssr";
import type { Database } from "./types";

export const createClient = () =>
  createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
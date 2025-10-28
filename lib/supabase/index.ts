// lib/supabase/index.ts
export { createBrowserSupabase } from "./client";
export { createServerSupabase } from "./server";
export { createRouteSupabase } from "./route";
export type { Database } from "./types";

// Alias for backward compatibility
export const createClient = createBrowserSupabase;
export const createServerClient = createServerSupabase;
export const createRouteClient = createRouteSupabase;
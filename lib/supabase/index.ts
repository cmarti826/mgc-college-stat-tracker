// lib/supabase/index.ts

// Client-safe: can be used in browser components
export { createBrowserSupabase } from "./client";

// Types
export type { Database } from "./types";

// === BACKWARD COMPATIBILITY ALIASES ===
// These allow old code using `createClient` to still work
// Remove them later when all files are updated

/** @deprecated Use `createBrowserSupabase` instead */
export const createClient = createBrowserSupabase;

/** @deprecated Import directly from `./server` in server files */
export const createServerClient = createBrowserSupabase;

/** @deprecated Import directly from `./route` in route handlers */
export const createRouteClient = createBrowserSupabase;
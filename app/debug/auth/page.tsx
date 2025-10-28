import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AuthDebug() {
  const supabase = createBrowserSupabase();
  const { data } = await supabase.auth.getUser();
  return (
    <pre className="p-4 bg-white border rounded">
      {JSON.stringify({ user: data.user ?? null }, null, 2)}
    </pre>
  );
}

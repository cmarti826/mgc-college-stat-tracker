// app/rounds/new/review/page.tsx
import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReviewRound() {
  const supabase = createServerSupabase();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) redirect("/login");

  const { data: round } = await supabase
    .from("mgc.scheduled_rounds")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!round) return <div>No round found.</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Review Round</h1>
      <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
        {JSON.stringify(round, null, 2)}
      </pre>
    </div>
  );
}
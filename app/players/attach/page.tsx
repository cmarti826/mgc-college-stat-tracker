// app/players/attach/page.tsx
import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AttachPlayer from "app/players/_components/AttachPlayer";

export const dynamic = "force-dynamic";

export default async function AttachPlayerPage() {
  const supabase = createServerSupabase();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) redirect("/login");

  const playersResult = await supabase
    .from("mgc.players")
    .select("id, full_name")
    .order("full_name");

  const teamsResult = await supabase
    .from("mgc.teams")
    .select("id, name")
    .order("name");

  const players = playersResult.data ?? [];
  const teams = teamsResult.data ?? [];

  // cast to any to allow passing props when the component's props are not typed
  const AttachPlayerAny = AttachPlayer as any;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Attach Player to Team</h1>
      <AttachPlayerAny players={players} teams={teams} />
    </div>
  );
}
// app/page.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DashboardPanel from "./_components/DashboardPanel";

type Player = { id: string; full_name: string | null };

type RoundTotals = {
  round_id: string;
  player_id: string;
  round_date: string | null;
  strokes_total: number | null;
  putts_total: number | null;
  fir_hits: number | null;
  fir_opps: number | null;
  fir_measured: number | null;
  gir_hits: number | null;
  gir_opps: number | null;
  penalties_total: number | null;
};

type RoundMeta = {
  id: string;             // round id
  player_id: string;
  tee_id: string | null;
  date: string | null;
  tee_name: string | null;
  rating: number | null;
  slope: number | null;
  course_par: number | null;
};

type SGRows = {
  round_id: string;
  sg_ott: number | null;
  sg_app: number | null;
  sg_arg: number | null;
  sg_putt: number | null;
  sg_total: number | null;
};

export default async function DashboardPage() {
  const supabase = createBrowserSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-semibold mb-4">Welcome</h1>
        <p>
          Please <Link className="underline" href="/login">sign in</Link> to see your dashboard.
        </p>
      </div>
    );
  }

  // Players linked to this user
  let players: Player[] = [];
  const viewPlayers = await supabase.from("v_my_players").select("*");
  if (!viewPlayers.error && viewPlayers.data) {
    players = viewPlayers.data as Player[];
  } else {
    const links = await supabase
      .from("user_players")
      .select("player_id")
      .eq("user_id", user.id);

    // ✅ FIX: type the map row
    const ids: string[] = (links.data ?? []).map(
      (r: { player_id: string }) => r.player_id
    );

    if (ids.length) {
      const { data } = await supabase
        .from("players")
        .select("id, full_name")
        .in("id", ids);
      players = (data ?? []) as Player[];
    }
  }

  const playerIds = players.map((p) => p.id);

  // Recent rounds totals (limit 50 for charts)
  let rounds: RoundTotals[] = [];
  if (playerIds.length) {
    const { data } = await supabase
      .from("v_round_totals")
      .select("*")
      .in("player_id", playerIds)
      .order("round_date", { ascending: false })
      .limit(50);
    rounds = (data ?? []) as RoundTotals[];
  }

  // Meta (par, tee name, etc.)
  const roundIds = rounds.map((r) => r.round_id);
  const metaMap: Record<string, RoundMeta> = {};
  if (roundIds.length) {
    const { data } = await supabase
      .from("v_rounds_enriched")
      .select("*")
      .in("id", roundIds);
    for (const m of (data ?? []) as any[]) {
      metaMap[m.id] = m as RoundMeta;
    }
  }

  // Optional Strokes Gained view (skip silently if missing)
  const sgMap: Record<string, SGRows> = {};
  if (roundIds.length) {
    const sg = await supabase
      .from("v_round_sg_totals") // if you don’t have this view, it will just be undefined/error and we ignore
      .select("*")
      .in("round_id", roundIds);
    if (!sg.error && sg.data) {
      for (const row of sg.data as any[]) {
        sgMap[row.round_id] = row as SGRows;
      }
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/rounds/new" className="rounded-xl border px-4 py-2 hover:shadow">
            + New Round
          </Link>
          <Link href="/players/attach" className="rounded-xl border px-4 py-2 hover:shadow">
            Link Player
          </Link>
        </div>
      </div>

      <DashboardPanel players={players} rounds={rounds} meta={metaMap} sg={sgMap} />
    </div>
  );
}

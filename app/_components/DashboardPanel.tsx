// app/_components/DashboardPanel.tsx
"use client";

import { useMemo, useState } from "react";
import DashboardCharts from "./DashboardCharts";
import Link from "next/link";

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

function pct(n?: number | null, d?: number | null) {
  if (!n || !d || d <= 0) return 0;
  return Math.round((100 * n) / d);
}

export default function DashboardPanel({
  players,
  rounds,
  meta,
  sg,
}: {
  players: Player[];
  rounds: RoundTotals[];
  meta: Record<string, RoundMeta>;
  sg: Record<string, SGRows>;
}) {
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all");

  const filtered = useMemo(() => {
    if (selectedPlayer === "all") return rounds;
    return rounds.filter((r) => r.player_id === selectedPlayer);
  }, [rounds, selectedPlayer]);

  const playersById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of players) m[p.id] = p.full_name ?? "Player";
    return m;
  }, [players]);

  // KPIs on filtered set (last 10)
  const kpi = useMemo(() => {
    const last10 = filtered.slice(0, 10);
    if (!last10.length) {
      return { avgScore: 0, firPct: 0, girPct: 0, puttsPerRound: 0, sgTotal: 0 };
    }
    let scoreSum = 0, roundsScored = 0;
    let firH = 0, firD = 0, girH = 0, girD = 0, puttSum = 0, sgSum = 0, sgCount = 0;
    for (const r of last10) {
      const m = meta[r.round_id];
      const par = m?.course_par ?? 72;
      if (r.strokes_total != null) {
        scoreSum += r.strokes_total - par;
        roundsScored++;
      }
      firH += r.fir_hits ?? 0;  firD += r.fir_measured ?? 0;
      girH += r.gir_hits ?? 0;  girD += r.gir_opps ?? 0;
      puttSum += r.putts_total ?? 0;

      const s = sg[r.round_id]?.sg_total;
      if (typeof s === "number") { sgSum += s; sgCount++; }
    }
    return {
      avgScore: roundsScored ? Math.round((10 * scoreSum) / roundsScored) / 10 : 0,
      firPct: pct(firH, firD),
      girPct: pct(girH, girD),
      puttsPerRound: last10.length ? Math.round((10 * puttSum) / last10.length) / 10 : 0,
      sgTotal: sgCount ? Math.round((10 * sgSum) / sgCount) / 10 : 0,
    };
  }, [filtered, meta, sg]);

  return (
    <div className="space-y-8">
      {/* Player Switcher */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">Player:</label>
        <select
          className="rounded border px-3 py-2"
          value={selectedPlayer}
          onChange={(e) => setSelectedPlayer(e.target.value)}
        >
          <option value="all">All Players</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name ?? "Player"}
            </option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card title="Players Linked" value={players.length} />
        <Card title="Recent Rounds" value={filtered.length} />
        <Card title="Avg Score (Last 10)" value={(kpi.avgScore >= 0 ? "+" : "") + kpi.avgScore} />
        <Card title="Putts / Round" value={kpi.puttsPerRound} />
        <Card title="Avg SG Total" value={(kpi.sgTotal >= 0 ? "+" : "") + kpi.sgTotal} />
      </div>

      {/* Charts (filtered + SG aware) */}
      <DashboardCharts
        players={players}
        rounds={filtered}
        meta={meta}
        sg={sg}
      />

      {/* Recent rounds table (filtered) */}
      <div className="rounded-2xl border">
        <div className="p-4 border-b">
          <h2 className="font-medium">Recent Rounds</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <Th>Date</Th>
                <Th>Player</Th>
                <Th>Course / Tee</Th>
                <Th className="text-right">Score</Th>
                <Th className="text-right">FIR</Th>
                <Th className="text-right">GIR</Th>
                <Th className="text-right">Putts</Th>
                <Th className="text-right">SG Total</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const m = meta[r.round_id];
                const par = m?.course_par ?? 72;
                const score =
                  r.strokes_total != null ? r.strokes_total - par : null;
                const teeLabel =
                  (m?.tee_name ? ` / ${m.tee_name}` : "") +
                  (m?.course_par ? ` (Par ${m.course_par})` : "");
                const sgTotal = sg[r.round_id]?.sg_total;
                return (
                  <tr key={r.round_id} className="border-t">
                    <td className="p-3">{r.round_date ?? "—"}</td>
                    <td className="p-3">{playersById[r.player_id] ?? "Player"}</td>
                    <td className="p-3">{teeLabel.slice(3) || "—"}</td>
                    <td className="p-3 text-right">
                      {score !== null ? (score >= 0 ? `+${score}` : score) : "—"}
                    </td>
                    <td className="p-3 text-right">{pct(r.fir_hits ?? 0, r.fir_measured ?? 0)}%</td>
                    <td className="p-3 text-right">{pct(r.gir_hits ?? 0, r.gir_opps ?? 0)}%</td>
                    <td className="p-3 text-right">{r.putts_total ?? "—"}</td>
                    <td className="p-3 text-right">
                      {typeof sgTotal === "number" ? (sgTotal >= 0 ? `+${sgTotal}` : sgTotal) : "—"}
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-500">
                    No rounds yet.{" "}
                    <Link className="underline" href="/rounds/new">
                      Create your first round
                    </Link>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`p-3 text-left font-medium ${className}`}>{children}</th>;
}

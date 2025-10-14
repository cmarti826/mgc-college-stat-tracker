// app/_components/DashboardCharts.tsx
"use client";

import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";

type Player = { id: string; full_name: string | null };
type Totals = {
  round_id: string; player_id: string; round_date: string | null;
  strokes_total: number | null; putts_total: number | null;
  fir_hits: number | null; fir_measured: number | null;
  gir_hits: number | null; gir_opps: number | null;
};
type Meta = Record<string, { course_par: number | null }>;
type SG = Record<string, { sg_ott: number | null; sg_app: number | null; sg_arg: number | null; sg_putt: number | null; sg_total: number | null }>;

export default function DashboardCharts({
  players,
  rounds,
  meta,
  sg,
}: {
  players: Player[];
  rounds: Totals[];
  meta: Meta;
  sg: SG;
}) {
  const playersById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of players) m[p.id] = p.full_name ?? "Player";
    return m;
  }, [players]);

  // Score trend (vs par), colored implicitly per series if split later
  const scoreTrend = useMemo(() => {
    return rounds
      .slice()
      .reverse()
      .map((r) => {
        const par = meta[r.round_id]?.course_par ?? 72;
        const score = (r.strokes_total ?? 0) - par;
        return {
          date: r.round_date ?? "",
          player: playersById[r.player_id] ?? "Player",
          score,
        };
      });
  }, [rounds, meta, playersById]);

  // Group by player for stacked/split views if desired
  const byPlayer = useMemo(() => {
    const map: Record<string, Totals[]> = {};
    for (const r of rounds) {
      (map[r.player_id] ||= []).push(r);
    }
    return map;
  }, [rounds]);

  // FIR/GIR last 10 (of current filtered rounds)
  const firGir = useMemo(() => {
    const last10 = rounds.slice(0, 10);
    let firH = 0, firD = 0, girH = 0, girD = 0;
    for (const r of last10) {
      firH += r.fir_hits ?? 0;
      firD += r.fir_measured ?? 0;
      girH += r.gir_hits ?? 0;
      girD += r.gir_opps ?? 0;
    }
    const pct = (n: number, d: number) => (!d ? 0 : Math.round((100 * n) / d));
    return [
      { name: "FIR", value: pct(firH, firD) },
      { name: "GIR", value: pct(girH, girD) },
    ];
  }, [rounds]);

  // SG bars (avg last 10) — show only if sg data exists
  const sgAverages = useMemo(() => {
    const last10 = rounds.slice(0, 10);
    let n = 0, ott = 0, app = 0, arg = 0, putt = 0, total = 0;
    for (const r of last10) {
      const s = sg[r.round_id];
      if (!s) continue;
      n++;
      ott  += s.sg_ott  ?? 0;
      app  += s.sg_app  ?? 0;
      arg  += s.sg_arg  ?? 0;
      putt += s.sg_putt ?? 0;
      total+= s.sg_total?? 0;
    }
    if (!n) return null;
    const avg = (x: number) => Math.round((10 * x) / n) / 10;
    return [
      { name: "Off Tee", value: avg(ott) },
      { name: "Approach", value: avg(app) },
      { name: "Around", value: avg(arg) },
      { name: "Putting", value: avg(putt) },
      { name: "Total", value: avg(total) },
    ];
  }, [rounds, sg]);

  // Putting composition pie (last 10)
  const puttPie = useMemo(() => {
    const last10 = rounds.slice(0, 10);
    const totalPutts = last10.reduce((s, r) => s + (r.putts_total ?? 0), 0);
    const totalStrokes = last10.reduce((s, r) => s + (r.strokes_total ?? 0), 0);
    const nonPutts = Math.max(totalStrokes - totalPutts, 0);
    return [
      { name: "Putts", value: totalPutts },
      { name: "Other Strokes", value: nonPutts },
    ];
  }, [rounds]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Score trend */}
      <div className="rounded-2xl border p-4">
        <div className="mb-3 font-medium">Score vs Par (Recent)</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={scoreTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="score" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FIR/GIR bars */}
      <div className="rounded-2xl border p-4">
        <div className="mb-3 font-medium">FIR / GIR % (Last 10)</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={firGir}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SG Averages (if present) */}
      <div className="rounded-2xl border p-4">
        <div className="mb-3 font-medium">Strokes Gained (Avg Last 10)</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {sgAverages ? (
              <BarChart data={sgAverages}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" />
              </BarChart>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                No SG data yet
              </div>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie: putting vs other */}
      <div className="xl:col-span-3 rounded-2xl border p-4">
        <div className="mb-3 font-medium">Stroke Mix (Last 10)</div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip />
              <Pie data={puttPie} dataKey="value" nameKey="name" outerRadius={110} label>
                {puttPie.map((_, idx) => (<Cell key={idx} />))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

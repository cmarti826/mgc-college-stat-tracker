// app/leaderboard/page.tsx

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserSupabase } from '@/lib/supabase/client';

type RoundType = 'TOURNAMENT' | 'QUALIFYING' | 'PRACTICE';
const TYPES: RoundType[] = ['TOURNAMENT', 'QUALIFYING', 'PRACTICE'];
type Scope = 'team' | 'all';

type BaseRow = {
  round_id: string;
  created_at: string | null;
  round_type: RoundType | null;
  player_id: string | null;
  player_name: string | null;
  team_id: string | null;
  team_name: string | null;
  strokes: number | null;
  par_total: number | null;
  to_par: number | null;
  sg_total: number | null;
  sg_ott: number | null;
  sg_app: number | null;
  sg_arg: number | null;
  sg_putt: number | null;
};

type AggRow = {
  player_id: string;
  player_name: string;
  team_id: string | null;
  team_name: string | null;
  rounds: number;
  total_to_par: number;
  avg_to_par: number;
  avg_sg_total: number | null;
  avg_sg_ott: number | null;
  avg_sg_app: number | null;
  avg_sg_arg: number | null;
  avg_sg_putt: number | null;
  best_round_to_par: number | null;
  last_played: string | null;
};

function ymd(date: Date): string {
  const yyyy = date.getFullYear();
  0;
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(d: string, n: number): string {
  const dt = new Date(d + 'T00:00:00');
  dt.setDate(dt.getDate() + n);
  return ymd(dt);
}

export default function LeaderboardPage() {
  const supabase = createBrowserSupabase(); // ← Safe: runs in browser

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [scope, setScope] = useState<Scope>('team');
  const [rtype, setRtype] = useState<RoundType>('TOURNAMENT');

  const today = ymd(new Date());
  const defaultStart = ymd(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000));
  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate] = useState<string>(today);

  const [rows, setRows] = useState<AggRow[]>([]);

  // Resolve current user's team(s)
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();

        let playerId: string | null = null;
        if (user?.id) {
          const { data: map, error: mapErr } = await supabase
            .from('mgc.user_players') // ← Fixed: mgc. prefix
            .select('player_id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (mapErr) throw mapErr;
          playerId = map?.player_id ?? null;
        }

        let tids: string[] = [];
        if (playerId) {
          const { data: mem, error: memErr } = await supabase
            .from('mgc.team_members') // ← Fixed: mgc. prefix
            .select('team_id')
            .eq('player_id', playerId);

          if (memErr) throw memErr;
          tids = (mem ?? []).map((m: any) => m.team_id);
        }
        setTeamIds(tids);
      } catch (e: any) {
        setError(e.message ?? 'Failed to resolve team membership.');
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  // Fetch and aggregate leaderboard
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const endExclusive = addDays(endDate, 1);

        let query = supabase
          .from('mgc.v_round_leaderboard_base') // ← Fixed: mgc. prefix
          .select('*')
          .eq('round_type', rtype)
          .gte('created_at', startDate)
          .lt('created_at', endExclusive)
          .limit(2000);

        if (scope === 'team' && teamIds.length > 0) {
          query = query.in('team_id', teamIds);
        }

        const { data, error: qErr } = await query;
        if (qErr) throw qErr;

        const base = (data ?? []) as BaseRow[];

        const map = new Map<
          string,
          AggRow & {
            _sg_total_sum: number;
            _sg_total_cnt: number;
            _sg_ott_sum: number;
            _sg_ott_cnt: number;
            _sg_app_sum: number;
            _sg_app_cnt: number;
            _sg_arg_sum: number;
            _sg_arg_cnt: number;
            _sg_putt_sum: number;
            _sg_putt_cnt: number;
          }
        >();

        for (const r of base) {
          const pid = r.player_id ?? 'unknown';
          const key = pid;
          const exists = map.get(key);

          const toPar = Number(r.to_par ?? 0);
          const lastPlayed = r.created_at;

          const sg_total = r.sg_total;
          const sg_ott = r.sg_ott;
          const sg_app = r.sg_app;
          const sg_arg = r.sg_arg;
          const sg_putt = r.sg_putt;

          if (!exists) {
            map.set(key, {
              player_id: r.player_id ?? 'unknown',
              player_name: r.player_name ?? '—',
              team_id: r.team_id ?? null,
              team_name: r.team_name ?? null,
              rounds: 1,
              total_to_par: toPar,
              avg_to_par: toPar,
              best_round_to_par: Number.isFinite(toPar) ? toPar : null,
              last_played: lastPlayed ?? null,
              avg_sg_total: sg_total ?? null,
              avg_sg_ott: sg_ott ?? null,
              avg_sg_app: sg_app ?? null,
              avg_sg_arg: sg_arg ?? null,
              avg_sg_putt: sg_putt ?? null,
              _sg_total_sum: Number.isFinite(Number(sg_total)) ? Number(sg_total) : 0,
              _sg_total_cnt: Number.isFinite(Number(sg_total)) ? 1 : 0,
              _sg_ott_sum: Number.isFinite(Number(sg_ott)) ? Number(sg_ott) : 0,
              _sg_ott_cnt: Number.isFinite(Number(sg_ott)) ? 1 : 0,
              _sg_app_sum: Number.isFinite(Number(sg_app)) ? Number(sg_app) : 0,
              _sg_app_cnt: Number.isFinite(Number(sg_app)) ? 1 : 0,
              _sg_arg_sum: Number.isFinite(Number(sg_arg)) ? Number(sg_arg) : 0,
              _sg_arg_cnt: Number.isFinite(Number(sg_arg)) ? 1 : 0,
              _sg_putt_sum: Number.isFinite(Number(sg_putt)) ? Number(sg_putt) : 0,
              _sg_putt_cnt: Number.isFinite(Number(sg_putt)) ? 1 : 0,
            });
          } else {
            exists.rounds += 1;
            exists.total_to_par += toPar;
            if (exists.best_round_to_par === null) {
              exists.best_round_to_par = toPar;
            } else if (Number.isFinite(toPar)) {
              exists.best_round_to_par = Math.min(exists.best_round_to_par, toPar);
            }
            if (lastPlayed && (!exists.last_played || new Date(lastPlayed) > new Date(exists.last_played))) {
              exists.last_played = lastPlayed;
            }
            if (Number.isFinite(Number(sg_total))) {
              exists._sg_total_sum += Number(sg_total);
              exists._sg_total_cnt++;
            }
            if (Number.isFinite(Number(sg_ott))) {
              exists._sg_ott_sum += Number(sg_ott);
              exists._sg_ott_cnt++;
            }
            if (Number.isFinite(Number(sg_app))) {
              exists._sg_app_sum += Number(sg_app);
              exists._sg_app_cnt++;
            }
            if (Number.isFinite(Number(sg_arg))) {
              exists._sg_arg_sum += Number(sg_arg);
              exists._sg_arg_cnt++;
            }
            if (Number.isFinite(Number(sg_putt))) {
              exists._sg_putt_sum += Number(sg_putt);
              exists._sg_putt_cnt++;
            }
          }
        }

        const agg: AggRow[] = [];
        for (const v of map.values()) {
          const a: AggRow = {
            player_id: v.player_id,
            player_name: v.player_name,
            team_id: v.team_id,
            team_name: v.team_name,
            rounds: v.rounds,
            total_to_par: v.total_to_par,
            avg_to_par: v.rounds ? v.total_to_par / v.rounds : 0,
            avg_sg_total: v._sg_total_cnt ? v._sg_total_sum / v._sg_total_cnt : null,
            avg_sg_ott: v._sg_ott_cnt ? v._sg_ott_sum / v._sg_ott_cnt : null,
            avg_sg_app: v._sg_app_cnt ? v._sg_app_sum / v._sg_app_cnt : null,
            avg_sg_arg: v._sg_arg_cnt ? v._sg_arg_sum / v._sg_arg_cnt : null,
            avg_sg_putt: v._sg_putt_cnt ? v._sg_putt_sum / v._sg_putt_cnt : null,
            best_round_to_par: v.best_round_to_par,
            last_played: v.last_played,
          };
          agg.push(a);
        }

        agg.sort((a, b) => {
          const aSg = a.avg_sg_total ?? -9999;
          const bSg = b.avg_sg_total ?? -9999;
          if (aSg !== bSg) return bSg - aSg;
          if (a.rounds !== b.rounds) return b.rounds - a.rounds;
          return a.avg_to_par - b.avg_to_par;
        });

        setRows(agg);
      } catch (e: any) {
        setError(e.message ?? 'Failed to load leaderboard.');
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase, rtype, scope, teamIds, startDate, endDate]);

  const scopeBtn = (key: Scope, label: string) => (
    <button
      key={key}
      onClick={() => setScope(key)}
      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
        scope === key
          ? 'bg-[#3C3B6E] text-white border-[#3C3B6E]'
          : 'bg-white hover:bg-gray-50 text-[#3C3B6E] border-gray-300'
      }`}
      aria-pressed={scope === key}
    >
      {label}
    </button>
  );

  const typeBtn = (key: RoundType) => (
    <button
      key={key}
      onClick={() => setRtype(key)}
      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
        rtype === key
          ? 'bg-[#B22234] text-white border-[#B22234]'
          : 'bg-white hover:bg-gray-50 text-[#3C3B6E] border-gray-300'
      }`}
      aria-pressed={rtype === key}
    >
      {key}
    </button>
  );

  const totalPlayers = rows.length;
  const totalRounds = rows.reduce((s, r) => s + r.rounds, 0);
  const bestAvgToPar =
    rows.length > 0
      ? Math.min(...rows.map((r) => (Number.isFinite(r.avg_to_par) ? r.avg_to_par : 9999)))
      : null;

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <div className="flex gap-2">
          <Link href="/rounds" className="px-3 py-1 text-sm border rounded-md">
            Rounds
          </Link>
          <Link href="/players" className="px-3 py-1 text-sm border rounded-md">
            Players
          </Link>
          <Link href="/teams" className="px-3 py-1 text-sm border rounded-md">
            Teams
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Filters</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-sm font-medium mb-2">Round Type</div>
            <div className="flex flex-wrap gap-2">{TYPES.map(typeBtn)}</div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Scope</div>
            <div className="flex flex-wrap gap-2">
              {scopeBtn('team', 'My Team')}
              {scopeBtn('all', 'All Teams')}
            </div>
            {scope === 'team' && teamIds.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">No team detected from your player link.</p>
            )}
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Date Range</div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="px-3 py-1 border rounded text-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-sm text-gray-600">to</span>
              <input
                type="date"
                className="px-3 py-1 border rounded text-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <p className="text-xs text-gray-500">Inclusive end date.</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-white p-4 rounded-lg border shadow-sm text-center">
          <div className="text-xs text-gray-500">Players</div>
          <div className="text-2xl font-bold">{totalPlayers}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm text-center">
          <div className="text-xs text-gray-500">Total Rounds</div>
          <div className="text-2xl font-bold">{totalRounds}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm text-center">
          <div className="text-xs text-gray-500">Best Avg To Par</div>
          <div className="text-2xl font-bold">
            {bestAvgToPar === null || bestAvgToPar === 9999 ? '—' : bestAvgToPar.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        {loading ? (
          <p className="text-center py-4">Loading...</p>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
        ) : rows.length === 0 ? (
          <p className="text-center py-4 text-gray-500">
            No data yet for {rtype.toLowerCase()} rounds in this range.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">#</th>
                  <th className="p-2 text-left">Player</th>
                  <th className="p-2 text-left">Team</th>
                  <th className="p-2 text-center">Rounds</th>
                  <th className="p-2 text-center">Avg To Par</th>
                  <th className="p-2 text-center">SG Total</th>
                  <th className="p-2 text-center">OTT</th>
                  <th className="p-2 text-center">APP</th>
                  <th className="p-2 text-center">ARG</th>
                  <th className="p-2 text-center">PUTT</th>
                  <th className="p-2 text-center">Best Round</th>
                  <th className="p-2 text-left">Last Played</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.player_id}-${i}`} className="border-t">
                    <td className="p-2">{i + 1}</td>
                    <td className="p-2 font-medium">{r.player_name}</td>
                    <td className="p-2">{r.team_name ?? '—'}</td>
                    <td className="p-2 text-center">{r.rounds}</td>
                    <td className="p-2 text-center">{r.avg_to_par.toFixed(2)}</td>
                    <td className="p-2 text-center">{r.avg_sg_total === null ? '—' : r.avg_sg_total.toFixed(2)}</td>
                    <td className="p-2 text-center">{r.avg_sg_ott === null ? '—' : r.avg_sg_ott.toFixed(2)}</td>
                    <td className="p-2 text-center">{r.avg_sg_app === null ? '—' : r.avg_sg_app.toFixed(2)}</td>
                    <td className="p-2 text-center">{r.avg_sg_arg === null ? '—' : r.avg_sg_arg.toFixed(2)}</td>
                    <td className="p-2 text-center">{r.avg_sg_putt === null ? '—' : r.avg_sg_putt.toFixed(2)}</td>
                    <td className="p-2 text-center">{r.best_round_to_par === null ? '—' : r.best_round_to_par}</td>
                    <td className="p-2">
                      {r.last_played ? new Date(r.last_played).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
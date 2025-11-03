// app/events/[id]/page.tsx

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase/client';

type EventHeader = {
  id: string;
  name: string;
  event_type: 'TOURNAMENT' | 'QUALIFYING' | 'PRACTICE' | null;
  start_date: string | null;
  end_date: string | null;
  course_name: string | null;
  team_name: string | null;
};

type PlayerRound = {
  event_id: string;
  round_id: string;
  round_number: number | null;
  day: string | null;
  player_id: string | null;
  player_name: string | null;
  team_id: string | null;
  team_name: string | null;
  created_at: string | null;
  to_par: number | null;
  sg_total: number | null;
  sg_ott: number | null;
  sg_app: number | null;
  sg_arg: number | null;
  sg_putt: number | null;
  round_index: number | null;
};

type LbRow = {
  event_id: string;
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
  position: number;
};

type ERoundBase = {
  round_id: string;
  created_at: string | null;
  player_id: string | null;
  player_name: string | null;
  team_name: string | null;
  to_par: number | null;
  sg_total: number | null;
};

type ViewMode = 'individuals' | 'teams';
type TeamMode = 'sum_all' | 'best_n';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createBrowserSupabase(); // ← Safe in client

  const [hdr, setHdr] = useState<EventHeader | null>(null);
  const [leader, setLeader] = useState<LbRow[]>([]);
  const [playerRounds, setPlayerRounds] = useState<PlayerRound[]>([]);
  const [attached, setAttached] = useState<ERoundBase[]>([]);
  const [recent, setRecent] = useState<ERoundBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('individuals');
  const [teamMode, setTeamMode] = useState<TeamMode>('best_n');
  const [bestN, setBestN] = useState<number>(4);

  async function loadAll() {
    setLoading(true);
    setError(null);

    try {
      // 1. Header
      const { data: e1, error: e1Err } = await supabase
        .from('v_events_enriched')
        .select('*')
        .eq('id', id)
        .single();

      if (e1Err && e1Err.code !== 'PGRST116') throw e1Err; // 116 = no rows
      setHdr(e1 ?? null);

      // 2. Leaderboard
      const { data: lb, error: lbErr } = await supabase
        .from('v_event_leaderboard_by_player')
        .select('*')
        .eq('event_id', id);

      if (lbErr) throw lbErr;
      const sorted = (lb ?? []).sort((a: any, b: any) => a.position - b.position) as LbRow[];
      setLeader(sorted);

      // 3. Player rounds
      const { data: pr, error: prErr } = await supabase
        .from('v_event_player_rounds')
        .select('*')
        .eq('event_id', id);

      if (prErr) throw prErr;
      setPlayerRounds((pr ?? []) as PlayerRound[]);

      // 4. Attached rounds
      const { data: er, error: erErr } = await supabase
        .from('event_rounds')
        .select('round_id')
        .eq('event_id', id);

      if (erErr) throw erErr;
      const attachedIds = (er ?? []).map((r: any) => r.round_id).filter(Boolean);

      if (attachedIds.length > 0) {
        const { data: r1, error: r1Err } = await supabase
          .from('v_round_leaderboard_base')
          .select('round_id, created_at, player_id, player_name, team_name, to_par, sg_total')
          .in('round_id', attachedIds)
          .order('created_at', { ascending: true });

        if (r1Err) throw r1Err;
        setAttached((r1 ?? []) as ERoundBase[]);
      } else {
        setAttached([]);
      }

      // 5. Recent candidate rounds
      const start = e1?.start_date ?? null;
      const end = e1?.end_date ?? null;
      let q = supabase
        .from('v_round_leaderboard_base')
        .select('round_id, created_at, player_id, player_name, team_name, to_par, sg_total')
        .order('created_at', { ascending: false })
        .limit(200);

      if (start) q = q.gte('created_at', start);
      if (end) q = q.lte('created_at', `${end}T23:59:59.999Z`);

      const { data: r2, error: r2Err } = await q;
      if (r2Err) throw r2Err;

      const candidates = (r2 ?? []).filter(
        (r: any) => r.round_id && !attachedIds.includes(r.round_id)
      ) as ERoundBase[];
      setRecent(candidates);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadAll();
  }, [id]);

  async function attach(roundId: string) {
    setError(null);
    const { error: insErr } = await supabase
      .from('event_rounds')
      .insert({ event_id: id, round_id: roundId });

    if (insErr) {
      setError(insErr.message);
      return;
    }
    await loadAll();
  }

  async function detach(roundId: string) {
    setError(null);
    const { error: delErr } = await supabase
      .from('event_rounds')
      .delete()
      .eq('event_id', id)
      .eq('round_id', roundId);

    if (delErr) {
      setError(delErr.message);
      return;
    }
    await loadAll();
  }

  // --- Derived Data ---
  const roundIndices = Array.from(
    new Set(playerRounds.map((r) => r.round_index).filter((n): n is number => n !== null && n > 0))
  ).sort((a, b) => a - b);

  // Pivot individuals
  type PivotRow = LbRow & { roundsByIndex: Record<number, number | null> };
  const pivotIndividuals: PivotRow[] = (() => {
    const byPlayer = new Map<string, PivotRow>();
    leader.forEach((l) => byPlayer.set(l.player_id, { ...l, roundsByIndex: {} }));
    playerRounds.forEach((r) => {
      const pid = r.player_id ?? 'unknown';
      if (!byPlayer.has(pid)) {
        byPlayer.set(pid, {
          player_id: pid,
          player_name: r.player_name ?? '—',
          team_id: r.team_id ?? null,
          team_name: r.team_name ?? null,
          event_id: id,
          rounds: 0,
          total_to_par: 0,
          avg_to_par: 0,
          avg_sg_total: null,
          avg_sg_ott: null,
          avg_sg_app: null,
          avg_sg_arg: null,
          avg_sg_putt: null,
          best_round_to_par: null,
          last_played: null,
          position: 9999,
          roundsByIndex: {},
        } as any);
      }
      const row = byPlayer.get(pid)!;
      const idx = r.round_index;
      if (idx && r.to_par !== null) row.roundsByIndex[idx] = r.to_par;
    });
    return Array.from(byPlayer.values()).sort((a, b) => a.position - b.position);
  })();

  // Team scoring
  type TeamAgg = {
    team_id: string;
    team_name: string | null;
    totalsByIndex: Record<number, number>;
    grandTotal: number;
    avg_sg_total: number | null;
  };

  const teamTable: TeamAgg[] = (() => {
    const byTeam = new Map<string, TeamAgg>();

    const ensureTeam = (tid: string | null, tname: string | null) => {
      const key = tid ?? 'unknown';
      if (!byTeam.has(key)) {
        byTeam.set(key, {
          team_id: key,
          team_name: tname ?? '—',
          totalsByIndex: {},
          grandTotal: 0,
          avg_sg_total: null,
        });
      }
      return byTeam.get(key)!;
    };

    if (teamMode === 'sum_all') {
      const roundTotals: Record<string, number> = {};
      const sgTotals: Record<string, { sum: number; cnt: number }> = {};

      playerRounds.forEach((r) => {
        if (r.to_par === null || r.round_index === null) return;
        const tid = r.team_id ?? 'unknown';
        const key = `${tid}:${r.round_index}`;
        roundTotals[key] = (roundTotals[key] ?? 0) + r.to_par;

        if (r.sg_total !== null) {
          sgTotals[tid] = sgTotals[tid] || { sum: 0, cnt: 0 };
          sgTotals[tid].sum += r.sg_total;
          sgTotals[tid].cnt += 1;
        }
        ensureTeam(tid, r.team_name);
      });

      Object.entries(roundTotals).forEach(([key, total]) => {
        const [tid, idxStr] = key.split(':');
        const idx = Number(idxStr);
        const row = ensureTeam(tid, null);
        row.totalsByIndex[idx] = total;
      });

      byTeam.forEach((row) => {
        row.grandTotal = roundIndices.reduce((s, i) => s + (row.totalsByIndex[i] ?? 0), 0);
        const sg = sgTotals[row.team_id];
        row.avg_sg_total = sg ? sg.sum / sg.cnt : null;
      });
    } else {
      // best N
      const buckets: Record<string, number[]> = {};
      playerRounds.forEach((r) => {
        if (r.to_par === null || r.round_index === null) return;
        const tid = r.team_id ?? 'unknown';
        const key = `${tid}:${r.round_index}`;
        buckets[key] = buckets[key] || [];
        buckets[key].push(r.to_par);
        ensureTeam(tid, r.team_name);
      });

      Object.entries(buckets).forEach(([key, scores]) => {
        const [tid, idxStr] = key.split(':');
        const idx = Number(idxStr);
        scores.sort((a, b) => a - b);
        const best = scores.slice(0, Math.max(1, bestN));
        const sum = best.reduce((s, v) => s + v, 0);
        const row = ensureTeam(tid, null);
        row.totalsByIndex[idx] = sum;
      });

      byTeam.forEach((row) => {
        row.grandTotal = roundIndices.reduce((s, i) => s + (row.totalsByIndex[i] ?? 0), 0);
      });
    }

    return Array.from(byTeam.values()).sort((a, b) => a.grandTotal - b.grandTotal);
  })();

  if (loading) return <div className="p-6 text-center">Loading event...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!hdr) return <div className="p-6 text-center">Event not found.</div>;

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Event Detail</h1>
        <div className="flex gap-2">
          <Link href="/events" className="px-3 py-1 text-sm border rounded-md">
            All Events
          </Link>
        </div>
      </div>

      {/* Header Card */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="text-xl font-bold">{hdr.name}</div>
        <div className="text-sm text-gray-600">
          {hdr.event_type ?? '—'} • {hdr.start_date} — {hdr.end_date}
        </div>
        <div className="text-sm text-gray-600">
          {hdr.course_name && `Course: ${hdr.course_name}`}
          {hdr.team_name && ` • Host: ${hdr.team_name}`}
        </div>
      </div>

      {/* Attach Rounds */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Attach Rounds</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-500">No rounds available to attach.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Player</th>
                  <th className="p-2 text-left">Team</th>
                  <th className="p-2 text-left">To Par</th>
                  <th className="p-2 text-left">SG</th>
                  <th className="p-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.round_id} className="border-t">
                    <td className="p-2">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                    <td className="p-2">{r.player_name ?? '—'}</td>
                    <td className="p-2">{r.team_name ?? '—'}</td>
                    <td className="p-2">{r.to_par ?? '—'}</td>
                    <td className="p-2">{r.sg_total?.toFixed(2) ?? '—'}</td>
                    <td className="p-2 text-right">
                      <button
                        onClick={() => attach(r.round_id)}
                        className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Attach
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attached Rounds */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Attached Rounds</h2>
        {attached.length === 0 ? (
          <p className="text-sm text-gray-500">No rounds attached.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Player</th>
                  <th className="p-2 text-left">Team</th>
                  <th className="p-2 text-left">To Par</th>
                  <th className="p-2 text-left">SG</th>
                  <th className="p-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {attached.map((r) => (
                  <tr key={r.round_id} className="border-t">
                    <td className="p-2">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                    <td className="p-2">{r.player_name ?? '—'}</td>
                    <td className="p-2">{r.team_name ?? '—'}</td>
                    <td className="p-2">{r.to_par ?? '—'}</td>
                    <td className="p-2">{r.sg_total?.toFixed(2) ?? '—'}</td>
                    <td className="p-2 text-right">
                      <button
                        onClick={() => detach(r.round_id)}
                        className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Detach
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Leaderboard</h2>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setViewMode('individuals')}
              className={`px-3 py-1 rounded text-sm ${viewMode === 'individuals' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
            >
              Individuals
            </button>
            <button
              onClick={() => setViewMode('teams')}
              className={`px-3 py-1 rounded text-sm ${viewMode === 'teams' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
            >
              Teams
            </button>
            {viewMode === 'teams' && (
              <>
                <button
                  onClick={() => setTeamMode('sum_all')}
                  className={`px-3 py-1 rounded text-sm ${teamMode === 'sum_all' ? 'bg-red-600 text-white' : 'bg-gray-100'}`}
                >
                  Sum All
                </button>
                <button
                  onClick={() => setTeamMode('best_n')}
                  className={`px-3 py-1 rounded text-sm ${teamMode === 'best_n' ? 'bg-red-600 text-white' : 'bg-gray-100'}`}
                >
                  Best N
                </button>
                {teamMode === 'best_n' && (
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={bestN}
                    onChange={(e) => setBestN(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                    className="w-16 px-2 py-1 border rounded text-sm"
                  />
                )}
              </>
            )}
          </div>
        </div>

        {viewMode === 'individuals' && pivotIndividuals.length === 0 && (
          <p className="text-sm text-gray-500">No individual scores.</p>
        )}
        {viewMode === 'teams' && teamTable.length === 0 && (
          <p className="text-sm text-gray-500">No team scores.</p>
        )}

        {viewMode === 'individuals' && pivotIndividuals.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Pos</th>
                  <th className="p-2 text-left">Player</th>
                  <th className="p-2 text-left">Team</th>
                  {roundIndices.map((i) => (
                    <th key={i} className="p-2 text-center">R{i}</th>
                  ))}
                  <th className="p-2 text-left">Total</th>
                  <th className="p-2 text-left">Avg</th>
                  <th className="p-2 text-left">SG Avg</th>
                </tr>
              </thead>
              <tbody>
                {pivotIndividuals.map((r) => (
                  <tr key={r.player_id} className="border-t">
                    <td className="p-2">{r.position}</td>
                    <td className="p-2">{r.player_name}</td>
                    <td className="p-2">{r.team_name ?? '—'}</td>
                    {roundIndices.map((i) => (
                      <td key={i} className="p-2 text-center">
                        {r.roundsByIndex[i] ?? '—'}
                      </td>
                    ))}
                    <td className="p-2">{r.total_to_par}</td>
                    <td className="p-2">{r.avg_to_par.toFixed(1)}</td>
                    <td className="p-2">{r.avg_sg_total?.toFixed(2) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === 'teams' && teamTable.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Pos</th>
                  <th className="p-2 text-left">Team</th>
                  {roundIndices.map((i) => (
                    <th key={i} className="p-2 text-center">R{i}</th>
                  ))}
                  <th className="p-2 text-left">Total</th>
                  <th className="p-2 text-left">SG Avg</th>
                </tr>
              </thead>
              <tbody>
                {teamTable.map((t, idx) => (
                  <tr key={t.team_id} className="border-t">
                    <td className="p-2">{idx + 1}</td>
                    <td className="p-2">{t.team_name}</td>
                    {roundIndices.map((i) => (
                      <td key={i} className="p-2 text-center">
                        {t.totalsByIndex[i]?.toFixed(0) ?? '—'}
                      </td>
                    ))}
                    <td className="p-2">{t.grandTotal.toFixed(0)}</td>
                    <td className="p-2">{t.avg_sg_total?.toFixed(2) ?? '—'}</td>
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
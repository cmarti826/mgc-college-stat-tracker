"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { saveRoundWithHoles } from "../actions";

// Shape we expect for holes coming from prior steps
type HoleDraft = {
  number: number;       // 1..18
  par: number;
  yardage: number;
  fairwayHit?: boolean;
  greenInReg?: boolean;
  putts?: number;
  sandSaveAttempt?: boolean;
  upAndDown?: boolean;
};

export default function ReviewPage() {
  const sp = useSearchParams();

  // 1) Try URL first (so you can deep-link/share the Review step)
  const spPlayerKey = sp.get("playerKey") ?? "";
  const spCourseKey = sp.get("courseKey") ?? "";
  const spTeeSetId  = sp.get("teeSetId")  ?? "";
  const spPlayedAt  = sp.get("playedAt")  ?? "";
  const spHolesJson = sp.get("holes")     ?? ""; // JSON string if provided

  // 2) Then fall back to sessionStorage (if your wizard saves there)
  const [playerKey, setPlayerKey] = useState(spPlayerKey);
  const [courseKey, setCourseKey] = useState(spCourseKey);
  const [teeSetId,  setTeeSetId]  = useState(spTeeSetId);
  const [playedAt,  setPlayedAt]  = useState(spPlayedAt);
  const [holes,     setHoles]     = useState<HoleDraft[]>(() => {
    if (spHolesJson) {
      try { return JSON.parse(spHolesJson) as HoleDraft[]; } catch {}
    }
    return [];
  });

  useEffect(() => {
    // If anything missing, try sessionStorage keys used by the wizard
    // (Adjust these keys to match your earlier steps if you already store them.)
    if (!playerKey) {
      const v = sessionStorage.getItem("mgc.newRound.playerKey");
      if (v) setPlayerKey(v);
    }
    if (!courseKey) {
      const v = sessionStorage.getItem("mgc.newRound.courseKey");
      if (v) setCourseKey(v);
    }
    if (!teeSetId) {
      const v = sessionStorage.getItem("mgc.newRound.teeSetId");
      if (v) setTeeSetId(v);
    }
    if (!playedAt) {
      const v = sessionStorage.getItem("mgc.newRound.playedAt");
      if (v) setPlayedAt(v);
    }
    if (!holes.length) {
      const v = sessionStorage.getItem("mgc.newRound.holes");
      if (v) {
        try { setHoles(JSON.parse(v)); } catch { /* ignore */ }
      }
    }
  }, []); // run once

  // 3) Shape the JSON expected by the RPC (jsonb_to_recordset)
  const holesJson = useMemo(() => {
    const payload = (holes ?? []).map(h => ({
      hole: h.number,
      par: h.par,
      yardage: h.yardage,
      fir: !!h.fairwayHit,
      gir: !!h.greenInReg,
      putts: Number(h.putts ?? 0),
      sand: !!h.sandSaveAttempt,
      updown: !!h.upAndDown,
    }));
    return JSON.stringify(payload);
  }, [holes]);

  // Simple totals preview
  const totals = useMemo(() => {
    const count = holes.length;
    const parSum = holes.reduce((a, h) => a + (h.par ?? 0), 0);
    const yardSum = holes.reduce((a, h) => a + (h.yardage ?? 0), 0);
    return { count, parSum, yardSum };
  }, [holes]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Review Round</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-sm">
        <div><span className="text-muted-foreground">Player:</span> {playerKey || "—"}</div>
        <div><span className="text-muted-foreground">Course:</span> {courseKey || "—"}</div>
        <div><span className="text-muted-foreground">Tee Set:</span> {teeSetId || "—"}</div>
        <div><span className="text-muted-foreground">Date:</span> {playedAt || "—"}</div>
        <div><span className="text-muted-foreground">Holes:</span> {totals.count}</div>
        <div><span className="text-muted-foreground">Par Total:</span> {totals.parSum}</div>
        <div><span className="text-muted-foreground">Yardage Total:</span> {totals.yardSum}</div>
      </div>

      <form action={saveRoundWithHoles}>
        {/* Hidden inputs the server action reads */}
        <input type="hidden" name="playerKey" value={playerKey} />
        <input type="hidden" name="courseKey" value={courseKey} />
        <input type="hidden" name="teeSetId"  value={teeSetId} />
        <input type="hidden" name="playedAt"  value={playedAt} />
        <input type="hidden" name="holesJson" value={holesJson} />

        <div className="flex gap-2">
          <a
            href="/rounds/new/holes"
            className="inline-flex items-center rounded-xl border px-3 py-2 text-sm hover:bg-accent"
          >
            Back
          </a>

          <button
            type="submit"
            className="inline-flex items-center rounded-xl border px-3 py-2 text-sm hover:bg-accent"
            disabled={!playerKey || !courseKey || !teeSetId || !playedAt || holes.length === 0}
            title={!playerKey || !courseKey || !teeSetId || !playedAt || holes.length === 0 ? "Missing info" : "Save round"}
          >
            Save &amp; Finish
          </button>
        </div>
      </form>

      {/* Optional debug table */}
      <div className="mt-6">
        <h2 className="font-medium mb-2">Holes (debug)</h2>
        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-2 py-1 text-left">#</th>
                <th className="px-2 py-1 text-right">Par</th>
                <th className="px-2 py-1 text-right">Yds</th>
                <th className="px-2 py-1 text-center">FIR</th>
                <th className="px-2 py-1 text-center">GIR</th>
                <th className="px-2 py-1 text-right">Putts</th>
                <th className="px-2 py-1 text-center">Sand</th>
                <th className="px-2 py-1 text-center">Up&Down</th>
              </tr>
            </thead>
            <tbody>
              {(holes ?? []).map(h => (
                <tr key={h.number} className="border-t">
                  <td className="px-2 py-1">{h.number}</td>
                  <td className="px-2 py-1 text-right">{h.par}</td>
                  <td className="px-2 py-1 text-right">{h.yardage}</td>
                  <td className="px-2 py-1 text-center">{h.fairwayHit ? "✓" : ""}</td>
                  <td className="px-2 py-1 text-center">{h.greenInReg ? "✓" : ""}</td>
                  <td className="px-2 py-1 text-right">{h.putts ?? 0}</td>
                  <td className="px-2 py-1 text-center">{h.sandSaveAttempt ? "✓" : ""}</td>
                  <td className="px-2 py-1 text-center">{h.upAndDown ? "✓" : ""}</td>
                </tr>
              ))}
              {(!holes || holes.length === 0) && (
                <tr><td className="px-2 py-3 text-muted-foreground" colSpan={8}>No holes found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

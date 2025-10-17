"use client";

import * as React from "react";

type LastShot = {
  end_lie: string | null;
  end_dist_yards: number | null;
  end_dist_feet: number | null;
  shot_number: number;
} | undefined;

export default function AddShotForm({
  roundId,
  yardages,
  lastShotByHole,
}: {
  roundId: string;
  yardages: (number | null)[];
  lastShotByHole: Record<number, LastShot>;
}) {
  // pick a sensible initial hole: first hole without any shots, else 1
  const initialHole =
    Array.from({ length: 18 }).map((_, i) => i + 1).find((h) => !lastShotByHole[h]) ?? 1;

  const [hole, setHole] = React.useState<number>(initialHole);

  // derive defaults from tee yardage or last shot
  const last = lastShotByHole[hole];
  const hasPrev = !!last;

  const defaultStartLie = React.useMemo(() => {
    if (!hasPrev) return "Tee";
    if (!last) return "Tee";
    // if last ended in the hole, next shot is new hole from the tee
    if (last.end_lie === "Hole") return "Tee";
    return last.end_lie ?? "Fairway";
  }, [hasPrev, last]);

  const defaultStartYards = React.useMemo(() => {
    if (!hasPrev) return yardages[hole - 1] ?? null;
    if (!last) return yardages[hole - 1] ?? null;
    // if last ended green/hole, carry feet instead; otherwise carry yards
    if (last.end_lie === "Green" || last.end_lie === "Hole") return null;
    return last.end_dist_yards ?? null;
  }, [hasPrev, last, hole, yardages]);

  const defaultStartFeet = React.useMemo(() => {
    if (!hasPrev) return null; // tee start = yards
    if (!last) return null;
    if (last.end_lie === "Green" || last.end_lie === "Hole") return last.end_dist_feet ?? null;
    return null;
  }, [hasPrev, last]);

  const defaultPutt = defaultStartLie === "Green";

  return (
    <form
      action="/api/actions/add-shot" // will be overridden by server action binding in the page via use server (we submit to the same page)
      className="bg-white border rounded-lg p-4 grid sm:grid-cols-6 gap-3"
      // NOTE: In Next App Router with Server Actions, the form[action] is replaced at build.
    >
      <input type="hidden" name="round_id" value={roundId} />

      <label className="text-sm sm:col-span-2">
        <div className="text-neutral-700 mb-1">Hole</div>
        <select
          name="hole_number"
          required
          className="w-full border rounded px-2 py-1"
          value={hole}
          onChange={(e) => setHole(Number(e.target.value))}
        >
          {Array.from({ length: 18 }).map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm">
        <div className="text-neutral-700 mb-1">Putt?</div>
        <input type="checkbox" name="putt" className="h-4 w-4" defaultChecked={defaultPutt} />
      </label>

      <label className="text-sm">
        <div className="text-neutral-700 mb-1">Penalty Strokes</div>
        <input type="number" name="penalty_strokes" min={0} defaultValue={0} className="w-full border rounded px-2 py-1" />
      </label>

      <label className="text-sm">
        <div className="text-neutral-700 mb-1">Start Lie</div>
        <select name="start_lie" className="w-full border rounded px-2 py-1" defaultValue={defaultStartLie}>
          <option value="Tee">Tee</option>
          <option value="Fairway">Fairway</option>
          <option value="Rough">Rough</option>
          <option value="Sand">Sand</option>
          <option value="Recovery">Recovery</option>
          <option value="Green">Green</option>
          <option value="Penalty">Penalty</option>
          <option value="Other">Other</option>
        </select>
      </label>

      {/* Distances: prefill depending on situation */}
      <label className="text-sm">
        <div className="text-neutral-700 mb-1">Start Dist (yd)</div>
        <input
          type="number"
          name="start_dist_yards"
          min={0}
          step="0.1"
          className="w-full border rounded px-2 py-1"
          defaultValue={defaultStartYards ?? ""}
        />
      </label>
      <label className="text-sm">
        <div className="text-neutral-700 mb-1">Start Dist (ft)</div>
        <input
          type="number"
          name="start_dist_feet"
          min={0}
          step="0.1"
          className="w-full border rounded px-2 py-1"
          defaultValue={defaultStartFeet ?? ""}
        />
      </label>

      <label className="text-sm">
        <div className="text-neutral-700 mb-1">End Lie</div>
        <select name="end_lie" className="w-full border rounded px-2 py-1" defaultValue="">
          <option value="">—</option>
          <option value="Fairway">Fairway</option>
          <option value="Rough">Rough</option>
          <option value="Sand">Sand</option>
          <option value="Green">Green</option>
          <option value="Hole">Hole</option>
          <option value="Penalty">Penalty</option>
          <option value="Other">Other</option>
        </select>
      </label>

      <label className="text-sm">
        <div className="text-neutral-700 mb-1">End Dist (yd)</div>
        <input type="number" name="end_dist_yards" min={0} step="0.1" className="w-full border rounded px-2 py-1" />
      </label>
      <label className="text-sm">
        <div className="text-neutral-700 mb-1">End Dist (ft)</div>
        <input type="number" name="end_dist_feet" min={0} step="0.1" className="w-full border rounded px-2 py-1" />
      </label>

      <label className="text-sm">
        <div className="text-neutral-700 mb-1">Club</div>
        <input name="club" className="w-full border rounded px-2 py-1" placeholder="e.g. 7i, PW, Driver" />
      </label>

      <label className="text-sm">
        <div className="text-neutral-700 mb-1">Holed?</div>
        <input type="checkbox" name="holed" className="h-4 w-4" />
      </label>

      <label className="text-sm sm:col-span-3">
        <div className="text-neutral-700 mb-1">Note</div>
        <input name="note" className="w-full border rounded px-2 py-1" placeholder="Optional note…" />
      </label>

      <div className="sm:col-span-6">
        <button className="border rounded px-3 py-2 bg-neutral-900 text-white hover:bg-neutral-800">Add Shot</button>
      </div>
    </form>
  );
}

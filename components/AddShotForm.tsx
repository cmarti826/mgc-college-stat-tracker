// components/AddShotForm.tsx

"use client";

import * as React from "react";

type LastShot = {
  end_lie: string | null;
  end_dist_yards: number | null;
  end_dist_feet: number | null;
  shot_number: number;
} | undefined;

interface AddShotFormProps {
  roundId: string;
  yardages: (number | null)[];
  lastShotByHole: Record<number, LastShot>;
}

export default function AddShotForm({
  roundId,
  yardages,
  lastShotByHole,
}: AddShotFormProps) {
  // Auto-select first incomplete hole
  const initialHole =
    Array.from({ length: 18 }, (_, i) => i + 1).find((h) => !lastShotByHole[h]) ?? 1;

  const [hole, setHole] = React.useState<number>(initialHole);
  const last = lastShotByHole[hole];
  const hasPrev = !!last;

  // === Derive Smart Defaults ===
  const defaultStartLie = React.useMemo(() => {
    if (!hasPrev) return "Tee";
    if (!last) return "Tee";
    return last.end_lie === "Hole" ? "Tee" : last.end_lie ?? "Fairway";
  }, [hasPrev, last]);

  const defaultStartYards = React.useMemo(() => {
    if (!hasPrev) return yardages[hole - 1] ?? null;
    if (!last) return yardages[hole - 1] ?? null;
    return last.end_lie === "Green" || last.end_lie === "Hole" ? null : last.end_dist_yards ?? null;
  }, [hasPrev, last, hole, yardages]);

  const defaultStartFeet = React.useMemo(() => {
    if (!hasPrev || !last) return null;
    return last.end_lie === "Green" || last.end_lie === "Hole" ? last.end_dist_feet ?? null : null;
  }, [hasPrev, last]);

  const defaultPutt = defaultStartLie === "Green";

  return (
    <form
      action="/api/actions/add-shot"
      className="card space-y-5 p-5"
    >
      <input type="hidden" name="round_id" value={roundId} />

      {/* Hole Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <label className="label">
          Hole <span className="text-red-600">*</span>
          <select
            name="hole_number"
            required
            value={hole}
            onChange={(e) => setHole(Number(e.target.value))}
            className="input mt-1"
          >
            {Array.from({ length: 18 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Hole {i + 1}
                {lastShotByHole[i + 1] ? " (in progress)" : ""}
              </option>
            ))}
          </select>
        </label>

        {/* Putt Checkbox */}
        <label className="label flex items-center gap-2">
          <input
            type="checkbox"
            name="putt"
            defaultChecked={defaultPutt}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Putt?</span>
        </label>

        {/* Penalty Strokes */}
        <label className="label">
          Penalty Strokes
          <input
            type="number"
            name="penalty_strokes"
            min={0}
            defaultValue={0}
            className="input mt-1"
          />
        </label>
      </div>

      {/* Start Lie */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="label">
          Start Lie
          <select
            name="start_lie"
            defaultValue={defaultStartLie}
            className="input mt-1"
          >
            {["Tee", "Fairway", "Rough", "Sand", "Recovery", "Green", "Penalty", "Other"].map((lie) => (
              <option key={lie} value={lie}>
                {lie}
              </option>
            ))}
          </select>
        </label>

        {/* Start Distance */}
        <div className="grid grid-cols-2 gap-3">
          <label className="label">
            Start Dist (yd)
            <input
              type="number"
              name="start_dist_yards"
              min={0}
              step="0.1"
              placeholder="e.g. 185"
              defaultValue={defaultStartYards ?? ""}
              className="input mt-1"
            />
          </label>
          <label className="label">
            Start Dist (ft)
            <input
              type="number"
              name="start_dist_feet"
              min={0}
              step="0.1"
              placeholder="e.g. 18"
              defaultValue={defaultStartFeet ?? ""}
              className="input mt-1"
            />
          </label>
        </div>
      </div>

      {/* End Lie & Distance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="label">
          End Lie
          <select name="end_lie" className="input mt-1" defaultValue="">
            <option value="">— Select —</option>
            {["Fairway", "Rough", "Sand", "Green", "Hole", "Penalty", "Other"].map((lie) => (
              <option key={lie} value={lie}>
                {lie}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="label">
            End Dist (yd)
            <input
              type="number"
              name="end_dist_yards"
              min={0}
              step="0.1"
              placeholder="e.g. 12"
              className="input mt-1"
            />
          </label>
          <label className="label">
            End Dist (ft)
            <input
              type="number"
              name="end_dist_feet"
              min={0}
              step="0.1"
              placeholder="e.g. 6"
              className="input mt-1"
            />
          </label>
        </div>
      </div>

      {/* Club, Holed, Note */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <label className="label">
          Club
          <input
            name="club"
            placeholder="e.g. 7i, PW, Driver"
            className="input mt-1"
          />
        </label>

        <label className="label flex items-center gap-2">
          <input
            type="checkbox"
            name="holed"
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Holed?</span>
        </label>

        <label className="label sm:col-span-3">
          Note
          <input
            name="note"
            placeholder="Optional note…"
            className="input mt-1"
          />
        </label>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          className="btn btn-primary px-5 py-2.5"
        >
          Add Shot
        </button>
      </div>
    </form>
  );
}
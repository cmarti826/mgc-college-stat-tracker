// app/rounds/_components/ShotEditor.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { saveShotsAction } from "./shotActions";

type Lie =
  | "Tee"
  | "Fairway"
  | "Rough"
  | "Sand"
  | "Recovery"
  | "Green"
  | "Hole"
  | "Penalty"
  | "Other";

export type ShotRow = {
  hole_number: number;
  shot_order: number;
  club?: string | null;
  lie: Lie;
  distance_to_hole_m?: number | null;
  start_x?: number | null;
  start_y?: number | null;
  result_lie: Lie;
  result_distance_to_hole_m?: number | null;
  end_x?: number | null;
  end_y?: number | null;
  putt?: boolean | null;
  penalty_strokes?: number | null;
};

type HeaderInfo = {
  player_name: string;
  course_name: string;
  tee_name: string;
  round_date: string;
};

type Props = {
  roundId: string;
  header: HeaderInfo;
  initialShots?: ShotRow[];
};

export default function ShotEditor({ roundId, header, initialShots = [] }: Props) {
  // ---------- Unit helpers ----------
  const M_PER_YD = 0.9144;
  const M_PER_FT = 0.3048;

  type UnitsMode = "imperial" | "metric";
  const [units, setUnits] = useState<UnitsMode>("imperial");

  useEffect(() => {
    const saved = localStorage.getItem("sg_units");
    if (saved === "metric" || saved === "imperial") setUnits(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("sg_units", units);
  }, [units]);

  const toDisplay = (m: number | null | undefined, asFeet: boolean): string => {
    if (m == null) return "";
    if (units === "metric") return round1(m);
    return asFeet ? round1(m / M_PER_FT) : round1(m / M_PER_YD);
  };

  const fromDisplay = (val: string, asFeet: boolean): number | null => {
    const n = Number(val);
    if (Number.isNaN(n)) return null;
    if (units === "metric") return n;
    return asFeet ? n * M_PER_FT : n * M_PER_YD;
  };

  function round1(n: number): string {
    return (Math.round(n * 10) / 10).toString();
  }

  // ---------- Data state ----------
  const [shots, setShots] = useState<ShotRow[]>(
    () =>
      initialShots.map((s) => ({
        ...s,
        putt: s.putt ?? (s.lie === "Green" || s.result_lie === "Green"),
      }))
  );

  const [hole, setHole] = useState<number>(1);
  const holeShots = useMemo(
    () =>
      shots
        .filter((s) => s.hole_number === hole)
        .sort((a, b) => a.shot_order - b.shot_order),
    [shots, hole]
  );

  // ---------- Row utilities ----------
  const isGreen = (lie: Lie | undefined, putt?: boolean | null) =>
    lie === "Green" || !!putt;

  const addShot = () => {
    const nextOrder =
      holeShots.length > 0
        ? Math.max(...holeShots.map((s) => s.shot_order)) + 1
        : 1;
    setShots((prev) => [
      ...prev,
      {
        hole_number: hole,
        shot_order: nextOrder,
        lie: nextOrder === 1 ? "Tee" : "Fairway",
        result_lie: "Fairway",
        putt: false,
        penalty_strokes: 0,
      },
    ]);
  };

  const updateShot = (idx: number, patch: Partial<ShotRow>) => {
    const target = holeShots[idx];
    if (!target) return;
    setShots((prev) =>
      prev.map((s) =>
        s.hole_number === target.hole_number &&
        s.shot_order === target.shot_order
          ? { ...s, ...patch }
          : s
      )
    );
  };

  const moveOrder = (idx: number, dir: -1 | 1) => {
    const ordered = [...holeShots];
    const a = ordered[idx];
    const b = ordered[idx + dir];
    if (!a || !b) return;

    const newA = { ...a, shot_order: b.shot_order };
    const newB = { ...b, shot_order: a.shot_order };

    setShots((prev) =>
      prev.map((s) => {
        if (s.hole_number !== hole) return s;
        if (s.shot_order === a.shot_order) return newA;
        if (s.shot_order === b.shot_order) return newB;
        return s;
      })
    );
  };

  const deleteRow = (idx: number) => {
    const target = holeShots[idx];
    if (!target) return;

    const keep = shots.filter(
      (s) =>
        !(s.hole_number === target.hole_number && s.shot_order === target.shot_order)
    );

    const resequenced = keep
      .map((s) => ({ ...s }))
      .sort((a, b) =>
        a.hole_number !== b.hole_number
          ? a.hole_number - b.hole_number
          : a.shot_order - b.shot_order
      )
      .map((s, i, arr) => {
        if (s.hole_number !== hole) return s;
        const seq = arr.filter((x) => x.hole_number === hole);
        const pos = seq.findIndex((x) => x === s);
        return { ...s, shot_order: pos + 1 };
      });

    setShots(resequenced);
  };

  // ---------- Save via Server Action ----------
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  async function saveShots() {
    setIsSaving(true);
    setSaveStatus(null);

    try {
      const payload = {
        roundId,
        rows: shots.map((s) => {
          // The server expects distances as yards (off-green) or feet (on-green),
          // and requires explicit null (not undefined) for missing values.
          // The server-side payload excludes "Hole" as a start lie, so map it
          // to an allowed value (Green) and assert the narrower type.
          const lieForServer = (s.lie === "Hole" ? "Green" : s.lie) as Exclude<
            Lie,
            "Hole"
          >;

          // Map any "Tee" result_lie to a server-allowed result_lie (use "Fairway").
          // The server's result_lie union does not include "Tee".
          const resultLieForServer = (s.result_lie === "Tee" ? "Fairway" : s.result_lie) as
            | "Fairway"
            | "Rough"
            | "Sand"
            | "Green"
            | "Hole"
            | "Penalty"
            | "Other";

          const startIsGreen = s.lie === "Green";
          const startValue =
            s.distance_to_hole_m == null
              ? null
              : startIsGreen
              ? s.distance_to_hole_m / M_PER_FT
              : s.distance_to_hole_m / M_PER_YD;
          const startUnit = startIsGreen ? ("ft" as const) : ("yd" as const);

          const resultIsGreen = s.result_lie === "Green";
          const resultIsHole = s.result_lie === "Hole";
          const rawResultValue = s.result_distance_to_hole_m;
          const resultValue =
            rawResultValue == null
              ? null
              : resultIsGreen
              ? rawResultValue / M_PER_FT
              : rawResultValue / M_PER_YD;
          // For "Hole" use 0 as the distance value (server maps to end_dist_feet = 0).
          const finalResultValue = resultIsHole ? 0 : resultValue;
          const resultUnit = resultIsGreen ? ("ft" as const) : ("yd" as const);

          return {
            hole_number: s.hole_number,
            shot_order: s.shot_order,
            club: s.club ?? null,
            // use the server-compatible lie value
            lie: lieForServer,
            dist_value: startValue,
            dist_unit: startUnit,
            result_lie: resultLieForServer,
            result_value: finalResultValue,
            result_unit: resultUnit,
            putt: !!s.putt,
            penalty_strokes: s.penalty_strokes ?? 0,
          };
        }),
      };

      const result = await saveShotsAction(payload);
      if (result.error) {
        setSaveStatus(`Error: ${result.error}`);
      } else {
        setSaveStatus("Shots saved successfully!");
      }
    } catch (err: any) {
      setSaveStatus(`Unexpected error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  }

  // ---------- UI ----------
  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Shot Entry — Strokes Gained</h1>
          <div className="mt-3 rounded-xl border px-4 py-3 bg-gray-50">
            <div className="font-medium text-gray-900">{header.player_name}</div>
            <div className="text-sm text-gray-600">
              {header.course_name} — {header.tee_name}
            </div>
            <div className="text-sm text-gray-500">{header.round_date}</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <UnitsToggle units={units} onChange={setUnits} />
          <button
            onClick={saveShots}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 hover:bg-gray-50 disabled:opacity-50 transition"
          >
            <Save size={18} /> {isSaving ? "Saving..." : "Save Shots"}
          </button>
        </div>
      </header>

      {saveStatus && (
        <div
          className={`p-3 rounded-xl border text-sm font-medium ${
            saveStatus.includes("Error")
              ? "bg-red-50 text-red-800 border-red-200"
              : "bg-green-50 text-green-800 border-green-200"
          }`}
        >
          {saveStatus}
        </div>
      )}

      {/* Hole navigation */}
      <div className="flex items-center justify-between">
        <button
          className="rounded-xl border px-3 py-1 disabled:opacity-50"
          disabled={hole <= 1}
          onClick={() => setHole((h) => Math.max(1, h - 1))}
        >
          Prev
        </button>
        <div className="font-semibold text-lg">Hole {hole}</div>
        <button
          className="rounded-xl border px-3 py-1 disabled:opacity-50"
          disabled={hole >= 18}
          onClick={() => setHole((h) => Math.min(18, h + 1))}
        >
          Next
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <Th>#</Th>
              <Th>Club</Th>
              <Th>Lie</Th>
              <Th>Dist to Hole</Th>
              <Th>Result Lie</Th>
              <Th>Result Dist</Th>
              <Th>Putt</Th>
              <Th>Penalty</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {holeShots.map((row, idx) => {
              const startFeet = isGreen(row.lie, row.putt);
              const endFeet = isGreen(row.result_lie, row.putt);

              const startUnit =
                units === "metric" ? "m" : startFeet ? "ft" : "yd";
              const endUnit =
                units === "metric" ? "m" : endFeet ? "ft" : "yd";

              return (
                <tr
                  key={`${row.hole_number}-${row.shot_order}`}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <Td className="text-center font-medium">{row.shot_order}</Td>

                  <Td>
                    <input
                      className="w-28 rounded border px-2 py-1 text-sm"
                      value={row.club ?? ""}
                      onChange={(e) =>
                        updateShot(idx, { club: e.target.value || null })
                      }
                    />
                  </Td>

                  <Td>
                    <select
                      className="w-32 rounded border px-2 py-1 text-sm"
                      value={row.lie}
                      onChange={(e) => {
                        const lie = e.target.value as Lie;
                        const patch: Partial<ShotRow> = { lie };
                        if (lie === "Green") patch.putt = true;
                        updateShot(idx, patch);
                      }}
                    >
                      {LIE_OPTIONS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </Td>

                  <Td>
                    <div className="flex items-center gap-2">
                      <input
                        className="w-28 rounded border px-2 py-1 text-right text-sm"
                        placeholder="0"
                        value={toDisplay(row.distance_to_hole_m, startFeet)}
                        onChange={(e) =>
                          updateShot(idx, {
                            distance_to_hole_m: fromDisplay(e.target.value, startFeet),
                          })
                        }
                        inputMode="decimal"
                      />
                      <UnitBadge>{startUnit}</UnitBadge>
                    </div>
                  </Td>

                  <Td>
                    <select
                      className="w-32 rounded border px-2 py-1 text-sm"
                      value={row.result_lie}
                      onChange={(e) => {
                        const result_lie = e.target.value as Lie;
                        const patch: Partial<ShotRow> = { result_lie };
                        if (result_lie === "Green") patch.putt = true;
                        updateShot(idx, patch);
                      }}
                    >
                      {LIE_OPTIONS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </Td>

                  <Td>
                    <div className="flex items-center gap-2">
                      <input
                        className="w-28 rounded border px-2 py-1 text-right text-sm"
                        placeholder="0"
                        value={toDisplay(row.result_distance_to_hole_m, endFeet)}
                        onChange={(e) =>
                          updateShot(idx, {
                            result_distance_to_hole_m: fromDisplay(e.target.value, endFeet),
                          })
                        }
                        inputMode="decimal"
                      />
                      <UnitBadge>{endUnit}</UnitBadge>
                    </div>
                  </Td>

                  <Td className="text-center">
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-gray-300"
                      checked={!!row.putt}
                      onChange={(e) =>
                        updateShot(idx, { putt: e.target.checked })
                      }
                    />
                  </Td>

                  <Td>
                    <input
                      type="number"
                      min="0"
                      className="w-16 rounded border px-2 py-1 text-right text-sm"
                      value={row.penalty_strokes ?? 0}
                      onChange={(e) =>
                        updateShot(idx, {
                          penalty_strokes: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </Td>

                  <Td>
                    <div className="flex items-center gap-1">
                      <button
                        title="Move up"
                        className="rounded border p-1 hover:bg-gray-100 disabled:opacity-40"
                        disabled={idx === 0}
                        onClick={() => moveOrder(idx, -1)}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        title="Move down"
                        className="rounded border p-1 hover:bg-gray-100 disabled:opacity-40"
                        disabled={idx === holeShots.length - 1}
                        onClick={() => moveOrder(idx, 1)}
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        title="Delete"
                        className="rounded border p-1 text-red-600 hover:bg-red-50"
                        onClick={() => deleteRow(idx)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button
          className="rounded-xl border px-4 py-2 font-medium hover:bg-gray-50 transition"
          onClick={addShot}
        >
          + Add Shot
        </button>

        <div className="flex gap-2">
          <button
            className="rounded-xl border px-3 py-1 disabled:opacity-50"
            disabled={hole <= 1}
            onClick={() => setHole((h) => Math.max(1, h - 1))}
          >
            Prev Hole
          </button>
          <button
            className="rounded-xl border px-3 py-1 disabled:opacity-50"
            disabled={hole >= 18}
            onClick={() => setHole((h) => Math.min(18, h + 1))}
          >
            Next Hole
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper components
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left font-medium text-gray-700">{children}</th>;
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}

// Unit badge component used to show units next to inputs
function UnitBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
      {children}
    </div>
  );
}

const LIE_OPTIONS: Lie[] = [
  "Tee",
  "Fairway",
  "Rough",
  "Sand",
  "Recovery",
  "Green",
  "Hole",
  "Penalty",
  "Other",
];

function UnitsToggle({
  units,
  onChange,
}: {
  units: "imperial" | "metric";
  onChange: (u: "imperial" | "metric") => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl border p-1 bg-white">
      <button
        onClick={() => onChange("imperial")}
        className={`rounded px-3 py-1 text-sm font-medium transition ${
          units === "imperial"
            ? "bg-indigo-600 text-white"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        Imperial
      </button>
      <button
        onClick={() => onChange("metric")}
        className={`rounded px-3 py-1 text-sm font-medium transition ${
          units === "metric"
            ? "bg-indigo-600 text-white"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        Metric
      </button>
    </div>
  );
}
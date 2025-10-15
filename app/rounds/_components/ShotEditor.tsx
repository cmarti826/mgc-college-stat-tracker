// app/rounds/_components/ShotEditor.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, Trash2, ArrowUp, ArrowDown } from "lucide-react";

type Lie =
  | "Tee"
  | "Fairway"
  | "Rough"
  | "Sand"
  | "Recovery"
  | "Green"
  | "Penalty"
  | "Other";

export type ShotRow = {
  hole_number: number;
  shot_order: number;
  club?: string | null;
  lie: Lie;
  distance_to_hole_m?: number | null; // stored in meters
  start_x?: number | null;
  start_y?: number | null;
  result_lie: Lie;
  result_distance_to_hole_m?: number | null; // stored in meters
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

export default function ShotEditor(props: {
  roundId: string;
  header: HeaderInfo;
  initialShots: ShotRow[] | undefined;
}) {
  const { roundId, header, initialShots } = props;

  // ---------- Unit helpers ----------
  const M_PER_YD = 0.9144;
  const M_PER_FT = 0.3048;

  type UnitsMode = "imperial" | "metric"; // UI only
  const [units, setUnits] = useState<UnitsMode>("imperial");

  useEffect(() => {
    const saved = localStorage.getItem("sg_units");
    if (saved === "metric" || saved === "imperial") setUnits(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem("sg_units", units);
  }, [units]);

  const toDisplay = (m: number | null | undefined, asFeet: boolean) => {
    if (m == null) return "";
    if (units === "metric") return round1(m); // meters straight
    // imperial
    return asFeet ? round1(m / M_PER_FT) : round1(m / M_PER_YD);
  };

  const fromDisplay = (val: string, asFeet: boolean) => {
    const n = Number(val);
    if (Number.isNaN(n)) return null;
    if (units === "metric") return n; // meters straight
    // imperial input
    return asFeet ? n * M_PER_FT : n * M_PER_YD;
  };

  function round1(n: number) {
    return Math.round(n * 10) / 10;
  }

  // ---------- Data state ----------
  const [shots, setShots] = useState<ShotRow[]>(
    () =>
      (initialShots || []).map((s) => ({
        ...s,
        putt: s.putt ?? (s.lie === "Green" || s.result_lie === "Green"),
      })) || []
  );

  const [hole, setHole] = useState<number>(1);
  const holeShots = useMemo(
    () => shots.filter((s) => s.hole_number === hole).sort((a, b) => a.shot_order - b.shot_order),
    [shots, hole]
  );

  // ---------- Row utilities ----------
  const isGreen = (lie: Lie | undefined, putt?: boolean | null) =>
    lie === "Green" || !!putt;

  const addShot = () => {
    const nextOrder = holeShots.length ? Math.max(...holeShots.map((s) => s.shot_order)) + 1 : 1;
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
        s.hole_number === target.hole_number && s.shot_order === target.shot_order
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
    // swap orders
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
      (s) => !(s.hole_number === target.hole_number && s.shot_order === target.shot_order)
    );
    // re-sequence within the hole
    const resequenced = keep
      .map((s) => ({ ...s }))
      .sort((a, b) =>
        a.hole_number !== b.hole_number ? a.hole_number - b.hole_number : a.shot_order - b.shot_order
      )
      .map((s, i, arr) => {
        if (s.hole_number !== hole) return s;
        const seq = arr.filter((x) => x.hole_number === hole);
        const pos = seq.findIndex((x) => x === s);
        return { ...s, shot_order: pos + 1 };
      });
    setShots(resequenced);
  };

  // ---------- Persist ----------
  async function saveShots() {
    // POST to the server action/route you already have
    // Expecting meters in payload; we already store meters in state.
    const payload = shots;
    const res = await fetch(`/api/rounds/${roundId}/shots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      alert("Failed to save shots");
    } else {
      alert("Shots saved");
    }
  }

  // ---------- UI ----------
  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Shot Entry — Strokes Gained</h1>
          <div className="mt-3 rounded-xl border px-4 py-3">
            <div className="font-medium">{header.player_name}</div>
            <div className="text-sm text-gray-600">
              {header.course_name} — {header.tee_name}
            </div>
            <div className="text-sm text-gray-500">{header.round_date}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <UnitsToggle units={units} onChange={setUnits} />
          <button
            onClick={saveShots}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 hover:bg-gray-50"
            title="Save"
          >
            <Save size={18} /> Save Shots
          </button>
        </div>
      </header>

      {/* Hole nav */}
      <div className="flex items-center justify-between">
        <button
          className="rounded-xl border px-3 py-1 disabled:opacity-50"
          disabled={hole <= 1}
          onClick={() => setHole((h) => Math.max(1, h - 1))}
        >
          ‹ Prev
        </button>
        <div className="font-semibold">Hole {hole}</div>
        <button
          className="rounded-xl border px-3 py-1 disabled:opacity-50"
          disabled={hole >= 18}
          onClick={() => setHole((h) => Math.min(18, h + 1))}
        >
          Next ›
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

              const startUnit = units === "metric" ? "m" : startFeet ? "ft" : "yd";
              const endUnit = units === "metric" ? "m" : endFeet ? "ft" : "yd";

              return (
                <tr key={`${row.hole_number}-${row.shot_order}`} className="border-t">
                  <Td className="text-center">{row.shot_order}</Td>
                  <Td>
                    <input
                      className="w-28 rounded border px-2 py-1"
                      value={row.club ?? ""}
                      onChange={(e) => updateShot(idx, { club: e.target.value })}
                    />
                  </Td>

                  <Td>
                    <select
                      className="w-32 rounded border px-2 py-1"
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
                        className="w-28 rounded border px-2 py-1 text-right"
                        placeholder="0"
                        value={toDisplay(row.distance_to_hole_m ?? null, startFeet)}
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
                      className="w-32 rounded border px-2 py-1"
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
                        className="w-28 rounded border px-2 py-1 text-right"
                        placeholder="0"
                        value={toDisplay(row.result_distance_to_hole_m ?? null, endFeet)}
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
                      checked={!!row.putt}
                      onChange={(e) => updateShot(idx, { putt: e.target.checked })}
                    />
                  </Td>

                  <Td>
                    <input
                      className="w-16 rounded border px-2 py-1 text-right"
                      placeholder="0"
                      value={row.penalty_strokes ?? 0}
                      onChange={(e) =>
                        updateShot(idx, {
                          penalty_strokes: Number(e.target.value || 0),
                        })
                      }
                      inputMode="numeric"
                    />
                  </Td>

                  <Td>
                    <div className="flex items-center gap-1">
                      <button
                        title="Move up"
                        className="rounded border p-1 disabled:opacity-40"
                        disabled={idx === 0}
                        onClick={() => moveOrder(idx, -1)}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        title="Move down"
                        className="rounded border p-1 disabled:opacity-40"
                        disabled={idx === holeShots.length - 1}
                        onClick={() => moveOrder(idx, +1)}
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        title="Delete"
                        className="rounded border p-1 text-red-600"
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
        <button className="rounded-xl border px-3 py-1" onClick={addShot}>
          + Add shot
        </button>

        <div className="flex gap-2">
          <button
            className="rounded-xl border px-3 py-1 disabled:opacity-50"
            disabled={hole <= 1}
            onClick={() => setHole((h) => Math.max(1, h - 1))}
          >
            Prev hole
          </button>
          <button
            className="rounded-xl border px-3 py-1 disabled:opacity-50"
            disabled={hole >= 18}
            onClick={() => setHole((h) => Math.min(18, h + 1))}
          >
            Next hole
          </button>
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left font-medium">{children}</th>;
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

function UnitBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
      {children}
    </span>
  );
}

const LIE_OPTIONS: Lie[] = [
  "Tee",
  "Fairway",
  "Rough",
  "Sand",
  "Recovery",
  "Green",
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
    <div className="flex items-center gap-1 rounded-xl border p-1">
      <button
        onClick={() => onChange("imperial")}
        className={`rounded px-2 py-1 text-sm ${
          units === "imperial" ? "bg-indigo-600 text-white" : ""
        }`}
      >
        Imperial (yd/ft)
      </button>
      <button
        onClick={() => onChange("metric")}
        className={`rounded px-2 py-1 text-sm ${
          units === "metric" ? "bg-indigo-600 text-white" : ""
        }`}
      >
        Metric (m)
      </button>
    </div>
  );
}

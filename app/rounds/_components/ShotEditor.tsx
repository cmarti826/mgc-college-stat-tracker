"use client";

import { useMemo, useState, useTransition } from "react";
import { saveShots } from "./shotActions";
import type { ShotInputType } from "./shotSchema";
import { ChevronLeft, ChevronRight, Plus, Trash2, Save } from "lucide-react";

type Header = {
  playerName: string;
  courseName: string;
  teeName: string;
  dateStr: string;
};

export default function ShotEditor({
  roundId,
  header,
  initialShots,
}: {
  roundId: string;
  header: Header;
  initialShots: ShotInputType[];
}) {
  const [shots, setShots] = useState<ShotInputType[]>(initialShots);
  const [hole, setHole] = useState<number>(1);
  const [isPending, startTransition] = useTransition();

  const shotsForHole = useMemo(
    () => shots.filter((s) => s.hole_number === hole).sort((a, b) => a.shot_order - b.shot_order),
    [shots, hole]
  );

  function addShot() {
    const nextOrder = shotsForHole.length + 1;
    setShots((prev) => [
      ...prev,
      {
        hole_number: hole,
        shot_order: nextOrder,
        lie: nextOrder === 1 ? "Tee" : "Fairway",
        result_lie: "Fairway",
        putt: false,
        penalty_strokes: 0,
        distance_to_hole_m: null,
        start_x: null,
        start_y: null,
        end_x: null,
        end_y: null,
      },
    ]);
  }

  function removeShot(order: number) {
    setShots((prev) => {
      const keep = prev.filter((s) => !(s.hole_number === hole && s.shot_order === order));
      // reindex the remaining shots for this hole
      return keep.map((s) =>
        s.hole_number === hole && s.shot_order > order ? { ...s, shot_order: s.shot_order - 1 } : s
      );
    });
  }

  function updateShot(order: number, patch: Partial<ShotInputType>) {
    setShots((prev) =>
      prev.map((s) => (s.hole_number === hole && s.shot_order === order ? { ...s, ...patch } : s))
    );
  }

  function moveShot(order: number, dir: -1 | 1) {
    const target = order + dir;
    if (target < 1 || target > shotsForHole.length) return;
    setShots((prev) =>
      prev.map((s) => {
        if (s.hole_number !== hole) return s;
        if (s.shot_order === order) return { ...s, shot_order: target };
        if (s.shot_order === target) return { ...s, shot_order: order };
        return s;
      })
    );
  }

  function changeHole(next: number) {
    if (next < 1 || next > 18) return;
    setHole(next);
  }

  function saveAll() {
    startTransition(async () => {
      const res = await saveShots(roundId, shots);
      if (res?.error) alert(res.error);
      else alert("Shots saved");
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border p-5 bg-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-xl font-semibold">{header.playerName}</div>
            <div className="text-gray-600">
              {header.courseName} — {header.teeName}
            </div>
            <div className="text-gray-600">{header.dateStr}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 hover:shadow disabled:opacity-50"
              onClick={saveAll}
              disabled={isPending}
            >
              <Save className="w-4 h-4" /> Save Shots
            </button>
          </div>
        </div>
      </div>

      {/* Hole nav */}
      <div className="flex items-center justify-between">
        <button
          className="rounded-xl border px-3 py-1 inline-flex items-center gap-1 disabled:opacity-50"
          onClick={() => changeHole(hole - 1)}
          disabled={hole === 1}
        >
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>
        <div className="text-lg font-semibold">Hole {hole}</div>
        <button
          className="rounded-xl border px-3 py-1 inline-flex items-center gap-1 disabled:opacity-50"
          onClick={() => changeHole(hole + 1)}
          disabled={hole === 18}
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Editor table */}
      <div className="overflow-x-auto rounded-2xl border">
        <table className="min-w-[1000px] w-full text-sm">
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
            {shotsForHole.map((s) => (
              <tr key={s.shot_order} className="border-t">
                <Td className="font-medium">{s.shot_order}</Td>
                <Td>
                  <input
                    className="rounded-lg border p-1 w-28"
                    value={s.club ?? ""}
                    onChange={(e) => updateShot(s.shot_order, { club: e.target.value })}
                  />
                </Td>
                <Td>
                  <select
                    className="rounded-lg border p-1"
                    value={s.lie}
                    onChange={(e) => updateShot(s.shot_order, { lie: e.target.value as ShotInputType["lie"] })}
                  >
                    {["Tee", "Fairway", "Rough", "Sand", "Recovery", "Green", "Penalty", "Other"].map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </Td>
                <Td>
                  <input
                    type="number"
                    step="0.1"
                    className="rounded-lg border p-1 w-24 text-right"
                    value={s.distance_to_hole_m ?? ""}
                    onChange={(e) =>
                      updateShot(s.shot_order, {
                        distance_to_hole_m: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    placeholder="m"
                  />
                </Td>
                <Td>
                  <select
                    className="rounded-lg border p-1"
                    value={s.result_lie ?? ""}
                    onChange={(e) =>
                      updateShot(s.shot_order, {
                        result_lie: (e.target.value || null) as ShotInputType["result_lie"],
                      })
                    }
                  >
                    <option value="">—</option>
                    {["Fairway", "Rough", "Sand", "Green", "Hole", "Penalty", "Other"].map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </Td>
                <Td>
                  <input
                    type="number"
                    step="0.1"
                    className="rounded-lg border p-1 w-24 text-right"
                    value={s.result_distance_to_hole_m ?? ""}
                    onChange={(e) =>
                      updateShot(s.shot_order, {
                        result_distance_to_hole_m: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    placeholder="m"
                  />
                </Td>
                <Td className="text-center">
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={!!s.putt}
                    onChange={(e) => updateShot(s.shot_order, { putt: e.target.checked })}
                  />
                </Td>
                <Td>
                  <input
                    type="number"
                    min={0}
                    className="rounded-lg border p-1 w-20 text-right"
                    value={s.penalty_strokes ?? 0}
                    onChange={(e) =>
                      updateShot(s.shot_order, {
                        penalty_strokes: e.target.value === "" ? 0 : Number(e.target.value),
                      })
                    }
                  />
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-lg border px-2 py-1"
                      onClick={() => moveShot(s.shot_order, -1)}
                      disabled={s.shot_order === 1}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      className="rounded-lg border px-2 py-1"
                      onClick={() => moveShot(s.shot_order, +1)}
                      disabled={s.shot_order === shotsForHole.length}
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      className="rounded-lg border px-2 py-1 text-red-600"
                      onClick={() => removeShot(s.shot_order)}
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
            {shotsForHole.length === 0 && (
              <tr className="border-t">
                <Td colSpan={9} className="text-center text-gray-500">
                  No shots yet for hole {hole}. Click “Add shot”.
                </Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button className="inline-flex items-center gap-2 rounded-xl border px-3 py-2" onClick={addShot}>
          <Plus className="w-4 h-4" /> Add shot
        </button>
        <div className="flex items-center gap-2">
          <button
            className="rounded-xl border px-3 py-2 disabled:opacity-50"
            onClick={() => changeHole(hole - 1)}
            disabled={hole === 1}
          >
            Prev hole
          </button>
          <button
            className="rounded-xl border px-3 py-2 disabled:opacity-50"
            onClick={() => changeHole(hole + 1)}
            disabled={hole === 18}
          >
            Next hole
          </button>
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="p-3 text-left font-medium text-gray-700">{children}</th>;
}

function Td({
  children,
  className = "",
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td className={`p-3 ${className}`} colSpan={colSpan}>
      {children}
    </td>
  );
}

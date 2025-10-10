"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Save, Send } from "lucide-react";
import HoleRow from "./HoleRow";
import { z } from "zod";
import { createRoundAction, updateRoundAction } from "./actions";
// NEW: browser client
import { createClient as createBrowserSupabase } from "@/lib/supabase/browser";

// ---- Types -----
const HoleSchema = z.object({
  hole_number: z.number(),
  par: z.number().min(3).max(6),
  yards: z.number().min(0).optional().nullable(),
  strokes: z.number().min(1).max(15).optional().nullable(),
  putts: z.number().min(0).max(6).optional().nullable(),
  fir: z.boolean().optional().nullable(),
  gir: z.boolean().optional().nullable(),
  up_down: z.boolean().optional().nullable(),
  sand_save: z.boolean().optional().nullable(),
  penalty: z.boolean().optional().nullable(),
});

const RoundSchema = z.object({
  id: z.string().uuid().optional(),
  player_id: z.string().uuid(),
  course_id: z.string().uuid(),
  tee_set_id: z.string().uuid(),
  event_id: z.string().uuid().nullable().optional(),
  played_on: z.string(), // ISO date
  notes: z.string().optional().nullable(),
  holes: z.array(HoleSchema).length(18),
});

export type HoleInput = z.infer<typeof HoleSchema>;
export type RoundInput = z.infer<typeof RoundSchema>;

// ---- Helpers ----
function empty18(): HoleInput[] {
  return Array.from({ length: 18 }, (_, i) => ({
    hole_number: i + 1,
    par: 4,
    yards: null,
    strokes: null,
    putts: null,
    fir: null,
    gir: null,
    up_down: null,
    sand_save: null,
    penalty: null,
  }));
}

export default function RoundEntry({
  mode,
  initialRound,
  players,
  courses,
  teeSets,
}: {
  mode: "create" | "edit";
  initialRound: null | { round: any; holes: HoleInput[] };
  players: any[];
  courses: any[];
  teeSets: any[];
}) {
  const [step, setStep] = useState(2); // you can set 1 as default, using 2 for your screenshot state
  const [isPending, startTransition] = useTransition();

  // Base state
  const [playerId, setPlayerId] = useState<string | undefined>(initialRound?.round?.player_id);
  const [courseId, setCourseId] = useState<string | undefined>(initialRound?.round?.course_id);
  const [teeSetId, setTeeSetId] = useState<string | undefined>(initialRound?.round?.tee_set_id);
  const [playedOn, setPlayedOn] = useState<string>(
    initialRound?.round?.played_on ?? new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState<string>(initialRound?.round?.notes ?? "");
  const [eventId, setEventId] = useState<string | undefined>(initialRound?.round?.event_id ?? undefined);

  const teeOptions = useMemo(() => teeSets.filter((t) => t.course_id === courseId), [teeSets, courseId]);

  // Holes state
  const [holes, setHoles] = useState<HoleInput[]>(() => {
    if (initialRound?.holes?.length === 18) return initialRound.holes as HoleInput[];
    return empty18();
  });

  // NEW: inputs grid refs for turbo keyboard nav
  const cellRefs = useRef<HTMLInputElement[][]>([]);

  // Auto-calc totals
  const totals = useMemo(() => {
    const s = holes.reduce(
      (acc, h) => {
        acc.strokes += h.strokes ?? 0;
        acc.putts += h.putts ?? 0;
        if (h.fir === true && (h.par === 4 || h.par === 5)) acc.firYes += 1;
        if (h.par === 4 || h.par === 5) acc.firOpp += 1;
        if (h.gir === true) acc.girYes += 1;
        acc.girOpp += 1;
        if (h.up_down === true) acc.udYes += 1;
        if (h.sand_save === true) acc.ssYes += 1;
        return acc;
      },
      { strokes: 0, putts: 0, firYes: 0, firOpp: 0, girYes: 0, girOpp: 0, udYes: 0, ssYes: 0 }
    );
    return {
      strokes: s.strokes,
      putts: s.putts,
      firPct: s.firOpp ? Math.round((s.firYes / s.firOpp) * 100) : 0,
      girPct: s.girOpp ? Math.round((s.girYes / s.girOpp) * 100) : 0,
      upDown: s.udYes,
      sandSave: s.ssYes,
    };
  }, [holes]);

  function updateHole(idx: number, patch: Partial<HoleInput>) {
    setHoles((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function setParForAll(par: number) {
    setHoles((prev) => prev.map((h) => ({ ...h, par })));
  }

  function pasteScores(text: string) {
    const nums = text
      .replace(/\n/g, " ")
      .split(/[^0-9]+/)
      .filter(Boolean)
      .map((n) => Number(n));
    if (nums.length >= 18) {
      setHoles((prev) => prev.map((h, i) => ({ ...h, strokes: nums[i] ?? h.strokes })));
    }
  }

  async function handleSave(finalize: boolean) {
    const payload: RoundInput = {
      id: initialRound?.round?.id,
      player_id: playerId!,
      course_id: courseId!,
      tee_set_id: teeSetId!,
      event_id: eventId ?? null,
      played_on: playedOn,
      notes: notes || null,
      holes,
    };

    const parsed = RoundSchema.safeParse(payload);
    if (!parsed.success) {
      alert("Please complete required fields (player, course, tee, date) and 18 holes.");
      return;
    }

    startTransition(async () => {
      const res = mode === "create" ? await createRoundAction(payload) : await updateRoundAction(payload);
      if (res?.error) {
        alert(res.error);
        return;
      }
      if (finalize) {
        window.location.href = `/rounds/${res.id}`;
      } else {
        alert("Saved");
      }
    });
  }

  // ===== NEW: Auto-fill par & yards when tee set changes =====
  useEffect(() => {
    if (!teeSetId) return;
    const supabase = createBrowserSupabase();

    (async () => {
      // Try tee_holes first; fall back to course_holes if your schema uses that
      // Expected columns: tee_set_id, hole_number, par, yards
      const { data: teeHoles } = await supabase
        .from("tee_holes")
        .select("hole_number, par, yards")
        .eq("tee_set_id", teeSetId)
        .order("hole_number");

      let rows = teeHoles ?? [];

      if (!rows?.length && courseId) {
        const { data: courseHoles } = await supabase
          .from("course_holes")
          .select("hole_number, par, yards")
          .eq("course_id", courseId)
          .order("hole_number");
        rows = courseHoles ?? [];
      }

      if (rows?.length) {
        setHoles((prev) =>
          prev.map((h) => {
            const m = rows.find((r) => r.hole_number === h.hole_number);
            return m
              ? {
                  ...h,
                  par: m.par ?? h.par,
                  yards: m.yards ?? h.yards,
                  // keep any strokes/stats already typed
                }
              : h;
          })
        );
      }
    })();
  }, [teeSetId, courseId]);

  // ===== NEW: Keyboard turbo entry (Enter/Arrow navigate) =====
  const registerCellRef = (rowIdx: number, colIdx: number) => (el: HTMLInputElement | null) => {
    if (!el) return;
    if (!cellRefs.current[rowIdx]) cellRefs.current[rowIdx] = [];
    cellRefs.current[rowIdx][colIdx] = el;
  };

  const onCellKeyDown = (row: number, col: number) => (e: React.KeyboardEvent<HTMLInputElement>) {
    if (!cellRefs.current.length) return;
    const rows = 18;
    const cols = 5; // Par, Yards, Strokes, Putts + (we only move through numeric inputs)
    const go = (r: number, c: number) => {
      const el = cellRefs.current[r]?.[c];
      if (el) el.focus();
    };

    switch (e.key) {
      case "Enter":
      case "ArrowRight": {
        e.preventDefault();
        const nextCol = (col + 1) % cols;
        const nextRow = nextCol === 0 ? Math.min(row + 1, rows - 1) : row;
        go(nextRow, nextCol);
        break;
      }
      case "ArrowLeft": {
        e.preventDefault();
        const prevCol = col - 1 < 0 ? cols - 1 : col - 1;
        const prevRow = prevCol === cols - 1 ? Math.max(row - 1, 0) : row;
        go(prevRow, prevCol);
        break;
      }
      case "ArrowDown": {
        e.preventDefault();
        go(Math.min(row + 1, rows - 1), col);
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        go(Math.max(row - 1, 0), col);
        break;
      }
    }
  };

  // Render
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b p-4 rounded-xl shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold">{mode === "create" ? "New Round" : "Edit Round"}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave(false)}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 border hover:shadow disabled:opacity-50"
              disabled={isPending}
            >
              <Save className="h-4 w-4" /> Save Draft
            </button>
            <button
              onClick={() => handleSave(true)}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 bg-black text-white hover:opacity-90 disabled:opacity-50"
              disabled={isPending}
            >
              <Send className="h-4 w-4" /> Save & Finish
            </button>
          </div>
        </div>

        {/* Stepper */}
        <div className="mt-3 flex items-center gap-2 text-sm">
          <button onClick={() => setStep(1)} className={`rounded-full px-3 py-1 border ${step === 1 ? "bg-black text-white" : ""}`}>1. Details</button>
          <ChevronRight className="h-4 w-4" />
          <button onClick={() => setStep(2)} className={`rounded-full px-3 py-1 border ${step === 2 ? "bg-black text-white" : ""}`}>2. Holes</button>
          <ChevronRight className="h-4 w-4" />
          <button onClick={() => setStep(3)} className={`rounded-full px-3 py-1 border ${step === 3 ? "bg-black text-white" : ""}`}>3. Review</button>
        </div>
      </div>

      {/* Step 2: Holes (showing per your screenshot) */}
      {step === 2 && (
        <section className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-gray-50 sticky top-[84px]">
                <tr>
                  <th className="p-3 text-left">#</th>
                  <th className="p-3 text-left">Par</th>
                  <th className="p-3 text-left">Yards</th>
                  <th className="p-3 text-left">Strokes</th>
                  <th className="p-3 text-left">Putts</th>
                  <th className="p-3 text-left">FIR</th>
                  <th className="p-3 text-left">GIR</th>
                  <th className="p-3 text-left">Up & Down</th>
                  <th className="p-3 text-left">Sand Save</th>
                  <th className="p-3 text-left">Penalty</th>
                </tr>
              </thead>
              <tbody>
                {holes.map((h, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2 font-medium">{h.hole_number}</td>
                    {/* Par input (col 0) */}
                    <td className="p-2">
                      <input
                        ref={registerCellRef(i, 0)}
                        onKeyDown={onCellKeyDown(i, 0)}
                        type="number"
                        inputMode="numeric"
                        className="w-16 rounded-lg border p-1 text-center"
                        value={h.par}
                        onChange={(e) => updateHole(i, { par: Number(e.target.value) })}
                      />
                    </td>
                    {/* Yards input (col 1) */}
                    <td className="p-2">
                      <input
                        ref={registerCellRef(i, 1)}
                        onKeyDown={onCellKeyDown(i, 1)}
                        type="number"
                        inputMode="numeric"
                        className="w-20 rounded-lg border p-1 text-center"
                        value={h.yards ?? ""}
                        onChange={(e) => updateHole(i, { yards: e.target.value ? Number(e.target.value) : null })}
                      />
                    </td>
                    {/* Strokes input (col 2) */}
                    <td className="p-2">
                      <input
                        ref={registerCellRef(i, 2)}
                        onKeyDown={onCellKeyDown(i, 2)}
                        type="number"
                        inputMode="numeric"
                        className="w-16 rounded-lg border p-1 text-center"
                        value={h.strokes ?? ""}
                        onChange={(e) => updateHole(i, { strokes: e.target.value ? Number(e.target.value) : null })}
                      />
                    </td>
                    {/* Putts input (col 3) */}
                    <td className="p-2">
                      <input
                        ref={registerCellRef(i, 3)}
                        onKeyDown={onCellKeyDown(i, 3)}
                        type="number"
                        inputMode="numeric"
                        className="w-16 rounded-lg border p-1 text-center"
                        value={h.putts ?? ""}
                        onChange={(e) => updateHole(i, { putts: e.target.value ? Number(e.target.value) : null })}
                      />
                    </td>
                    {/* Checkboxes (we don’t include in keyboard cycle) */}
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        className="h-5 w-5"
                        disabled={!(h.par === 4 || h.par === 5)}
                        checked={!!h.fir && (h.par === 4 || h.par === 5)}
                        onChange={(e) => updateHole(i, { fir: (h.par === 4 || h.par === 5) ? e.target.checked : null })}
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input type="checkbox" className="h-5 w-5" checked={!!h.gir} onChange={(e) => updateHole(i, { gir: e.target.checked })} />
                    </td>
                    <td className="p-2 text-center">
                      <input type="checkbox" className="h-5 w-5" checked={!!h.up_down} onChange={(e) => updateHole(i, { up_down: e.target.checked })} />
                    </td>
                    <td className="p-2 text-center">
                      <input type="checkbox" className="h-5 w-5" checked={!!h.sand_save} onChange={(e) => updateHole(i, { sand_save: e.target.checked })} />
                    </td>
                    <td className="p-2 text-center">
                      <input type="checkbox" className="h-5 w-5" checked={!!h.penalty} onChange={(e) => updateHole(i, { penalty: e.target.checked })} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="p-3 font-medium" colSpan={3}>Totals</td>
                  <td className="p-3 font-semibold">{totals.strokes}</td>
                  <td className="p-3 font-semibold">{totals.putts}</td>
                  <td className="p-3 font-semibold">{totals.firPct}%</td>
                  <td className="p-3 font-semibold">{totals.girPct}%</td>
                  <td className="p-3 font-semibold">{totals.upDown}</td>
                  <td className="p-3 font-semibold">{totals.sandSave}</td>
                  <td className="p-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button className="rounded-2xl border px-4 py-2 inline-flex items-center gap-2" onClick={() => setStep(1)}>
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <button className="rounded-2xl bg-black text-white px-4 py-2 inline-flex items-center gap-2" onClick={() => setStep(3)}>
              Review <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Save, Send } from "lucide-react";
import { z } from "zod";
import { createRoundAction, updateRoundAction } from "./actions";
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";

/* Zod */
const HoleSchema = z.object({
  hole_number: z.number(),
  par: z.number().min(3).max(6),
  yards: z.number().optional().nullable(),
  strokes: z.number().optional().nullable(),
  putts: z.number().optional().nullable(),
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
  tee_id: z.string().uuid(), // UI key; server maps to tee_id/tee_set_id/etc.
  date: z.string(),          // UI key; server maps to round_date/date/played_on/etc.
  notes: z.string().optional().nullable(),
  event_id: z.string().uuid().nullable().optional(),
  holes: z.array(HoleSchema).length(18),
});
export type HoleInput = z.infer<typeof HoleSchema>;
export type RoundInput = z.infer<typeof RoundSchema>;

/* helpers */
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
async function fetchHoleDefs(supabase: ReturnType<typeof createBrowserSupabase>, teeId?: string, courseId?: string) {
  const trySelect = async (table: string, whereCol: string, whereVal: string, selectExpr: string, orderCol: string) => {
    const { data, error } = await supabase.from(table).select(selectExpr).eq(whereCol, whereVal).order(orderCol);
    if (error) return null;
    return (data ?? []) as any[];
  };
  if (teeId) {
    const t1 =
      (await trySelect("holes", "tee_id", teeId, "hole_number:number, par, yards", "number")) ??
      (await trySelect("holes", "tee_id", teeId, "hole_number, par, yards", "hole_number"));
    if (t1?.length) return t1;
  }
  if (courseId) {
    const t2 =
      (await trySelect("holes", "course_id", courseId, "hole_number:number, par, yards", "number")) ??
      (await trySelect("holes", "course_id", courseId, "hole_number, par, yards", "hole_number"));
    if (t2?.length) return t2;
  }
  return [];
}
function applyHoleDefs(current: HoleInput[], defs: Array<{ hole_number: number; par: number | null; yards: number | null }>) {
  const map = new Map(defs.map((d) => [d.hole_number, d]));
  return current.map((h) => {
    const m = map.get(h.hole_number);
    return m ? { ...h, par: m.par ?? h.par, yards: m.yards ?? h.yards } : h;
  });
}

/* component */
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
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();

  const [playerId, setPlayerId] = useState<string | undefined>(initialRound?.round?.player_id);
  const [courseId, setCourseId] = useState<string | undefined>(initialRound?.round?.course_id);
  const [teeId, setTeeId] = useState<string | undefined>(initialRound?.round?.tee_id ?? initialRound?.round?.tee_set_id);
  const [roundDate, setRoundDate] = useState<string>(initialRound?.round?.round_date ?? initialRound?.round?.date ?? initialRound?.round?.played_on ?? initialRound?.round?.played_at ?? new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState<string>(initialRound?.round?.notes ?? "");
  const [eventId, setEventId] = useState<string | undefined>(initialRound?.round?.event_id ?? undefined);

  const teeOptions = useMemo(() => teeSets.filter((t) => t.course_id === courseId), [teeSets, courseId]);

  const [holes, setHoles] = useState<HoleInput[]>(initialRound?.holes?.length === 18 ? initialRound.holes : empty18());

  const totals = useMemo(() => {
    const s = holes.reduce(
      (acc, h) => {
        acc.strokes += h.strokes ?? 0;
        acc.putts += h.putts ?? 0;
        if ((h.par === 4 || h.par === 5) && h.fir) acc.firYes += 1;
        if (h.par === 4 || h.par === 5) acc.firOpp += 1;
        if (h.gir) acc.girYes += 1;
        acc.girOpp += 1;
        if (h.up_down) acc.udYes += 1;
        if (h.sand_save) acc.ssYes += 1;
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

  function updateHole(i: number, patch: Partial<HoleInput>) {
    setHoles((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }

  function setParForAll(par: number) {
    setHoles((prev) => prev.map((h) => ({ ...h, par })));
  }

  function pasteScores(text: string) {
    const nums = text.replace(/\n/g, " ").split(/[^0-9]+/).filter(Boolean).map(Number);
    if (nums.length >= 18) setHoles((prev) => prev.map((h, i) => ({ ...h, strokes: nums[i] ?? h.strokes })));
  }

  async function handleSave(finalize: boolean) {
    const payload: RoundInput = {
      id: initialRound?.round?.id,
      player_id: playerId!,
      course_id: courseId!,
      tee_id: teeId!,     // server maps to tee_id / tee_set_id / tee_box_id
      date: roundDate,    // server maps to round_date / date / played_on / played_at
      notes: notes || null,
      event_id: eventId ?? null,
      holes,
    };

    const parsed = RoundSchema.safeParse(payload);
    if (!parsed.success) {
      alert("Please complete player, date, course, tee and 18 holes.");
      return;
    }
// just before createRoundAction/updateRoundAction
console.log("create payload", payload);


    startTransition(async () => {
      const res = mode === "create" ? await createRoundAction(payload) : await updateRoundAction(payload);
      if (res?.error) { alert(res.error); return; }
      window.location.href = `/rounds/${res.id}`;
    });
  }

  useEffect(() => {
    const supabase = createBrowserSupabase();
    (async () => {
      const defs = await fetchHoleDefs(supabase, teeId, courseId);
      if (defs.length) setHoles((prev) => applyHoleDefs(prev, defs));
    })();
  }, [teeId, courseId]);

  // keyboard nav
  const refs = useRef<HTMLInputElement[][]>([]);
  const reg = (r: number, c: number) => (el: HTMLInputElement | null) => {
    if (!el) return;
    if (!refs.current[r]) refs.current[r] = [];
    refs.current[r][c] = el;
  };
  const nav = (r: number, c: number) => refs.current[r]?.[c]?.focus();
  const onKey =
    (r: number, c: number) =>
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const rows = 18, cols = 4;
      switch (e.key) {
        case "Enter":
        case "ArrowRight": e.preventDefault(); nav(c + 1 === cols ? Math.min(r + 1, rows - 1) : r, (c + 1) % cols); break;
        case "ArrowLeft":  e.preventDefault(); nav(c - 1 < 0 ? Math.max(r - 1, 0) : r, c - 1 < 0 ? cols - 1 : c - 1); break;
        case "ArrowDown":  e.preventDefault(); nav(Math.min(r + 1, rows - 1), c); break;
        case "ArrowUp":    e.preventDefault(); nav(Math.max(r - 1, 0), c); break;
      }
    };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b p-4 rounded-xl shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold">{mode === "create" ? "New Round" : "Edit Round"}</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => handleSave(false)} className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 border hover:shadow disabled:opacity-50" disabled={isPending}>
              <Save className="h-4 w-4" /> Save Draft
            </button>
            <button onClick={() => handleSave(true)} className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 bg-black text-white hover:opacity-90 disabled:opacity-50" disabled={isPending}>
              <Send className="h-4 w-4" /> Save & Finish
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <button onClick={() => setStep(1)} className={`rounded-full px-3 py-1 border ${step === 1 ? "bg-black text-white" : ""}`}>1. Details</button>
          <ChevronRight className="h-4 w-4" />
          <button onClick={() => setStep(2)} className={`rounded-full px-3 py-1 border ${step === 2 ? "bg-black text-white" : ""}`}>2. Holes</button>
          <ChevronRight className="h-4 w-4" />
          <button onClick={() => setStep(3)} className={`rounded-full px-3 py-1 border ${step === 3 ? "bg-black text-white" : ""}`}>3. Review</button>
        </div>
      </div>

      {step === 1 && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium">Player</label>
              <select className="mt-1 rounded-xl border p-2" value={playerId ?? ""} onChange={(e) => setPlayerId(e.target.value || undefined)}>
                <option value="">Select player…</option>
                {players.map((p) => {
                  const label = p.full_name ?? p.name ?? p.display_name ?? "Player";
                  const gy = p.grad_year ? ` ’${String(p.grad_year).slice(2)}` : "";
                  return <option key={p.id} value={p.id}>{`${label}${gy}`}</option>;
                })}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium">Date</label>
              <input type="date" className="mt-1 rounded-xl border p-2" value={roundDate} onChange={(e) => setRoundDate(e.target.value)} />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium">Course</label>
              <select className="mt-1 rounded-xl border p-2" value={courseId ?? ""} onChange={(e) => { setCourseId(e.target.value || undefined); setTeeId(undefined); }}>
                <option value="">Select course…</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium">Tee</label>
              <select className="mt-1 rounded-xl border p-2" value={teeId ?? ""} onChange={(e) => setTeeId(e.target.value || undefined)} disabled={!courseId}>
                <option value="">Select tee…</option>
                {teeSets.filter((t) => t.course_id === courseId).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.rating ?? "-"} / {t.slope ?? "-"} (Par {t.par ?? "-"})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="mt-2 inline-flex items-center rounded-xl border px-3 py-1 text-sm hover:shadow disabled:opacity-50"
                onClick={async () => {
                  const s = createBrowserSupabase();
                  const defs = await fetchHoleDefs(s, teeId, courseId);
                  if (!defs.length) { alert("No per-hole data found for this tee/course."); return; }
                  setHoles((prev) => applyHoleDefs(prev, defs));
                }}
                disabled={!teeId && !courseId}
              >
                Auto-fill holes from tee/course
              </button>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium">Event (optional)</label>
              <input type="text" placeholder="Paste event UUID if linking" className="mt-1 rounded-xl border p-2" value={eventId ?? ""} onChange={(e) => setEventId(e.target.value || undefined)} />
            </div>

            <div className="flex flex-col sm:col-span-2 lg:col-span-3">
              <label className="text-sm font-medium">Notes</label>
              <textarea rows={3} className="mt-1 rounded-xl border p-2" placeholder="Windy, wet rough, etc." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-2xl border px-4 py-2" onClick={() => setParForAll(3)}>Set Par 3 for all</button>
            <button className="rounded-2xl border px-4 py-2" onClick={() => setParForAll(4)}>Set Par 4 for all</button>
            <button className="rounded-2xl border px-4 py-2" onClick={() => setParForAll(5)}>Set Par 5 for all</button>
          </div>

          <div className="flex items-center gap-2">
            <textarea className="rounded-xl border p-2 w-full" placeholder="Quick paste 18 scores (e.g. 4 5 3 4 4 5 3 4 4 5 3 4 4 5 3 4 4 5)" onPaste={(e) => pasteScores(e.clipboardData.getData("text"))} />
          </div>

          <div className="flex justify-end">
            <button className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 bg-black text-white" onClick={() => setStep(2)}>
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
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
                    <td className="p-2"><input ref={reg(i, 0)} onKeyDown={onKey(i, 0)} type="number" inputMode="numeric" className="w-16 rounded-lg border p-1 text-center" value={h.par} onChange={(e) => updateHole(i, { par: Number(e.target.value) })} /></td>
                    <td className="p-2"><input ref={reg(i, 1)} onKeyDown={onKey(i, 1)} type="number" inputMode="numeric" className="w-20 rounded-lg border p-1 text-center" value={h.yards ?? ""} onChange={(e) => updateHole(i, { yards: e.target.value ? Number(e.target.value) : null })} /></td>
                    <td className="p-2"><input ref={reg(i, 2)} onKeyDown={onKey(i, 2)} type="number" inputMode="numeric" className="w-16 rounded-lg border p-1 text-center" value={h.strokes ?? ""} onChange={(e) => updateHole(i, { strokes: e.target.value ? Number(e.target.value) : null })} /></td>
                    <td className="p-2"><input ref={reg(i, 3)} onKeyDown={onKey(i, 3)} type="number" inputMode="numeric" className="w-16 rounded-lg border p-1 text-center" value={h.putts ?? ""} onChange={(e) => updateHole(i, { putts: e.target.value ? Number(e.target.value) : null })} /></td>
                    <td className="p-2 text-center"><input type="checkbox" className="h-5 w-5" disabled={!(h.par === 4 || h.par === 5)} checked={!!h.fir && (h.par === 4 || h.par === 5)} onChange={(e) => updateHole(i, { fir: (h.par === 4 || h.par === 5) ? e.target.checked : null })} /></td>
                    <td className="p-2 text-center"><input type="checkbox" className="h-5 w-5" checked={!!h.gir} onChange={(e) => updateHole(i, { gir: e.target.checked })} /></td>
                    <td className="p-2 text-center"><input type="checkbox" className="h-5 w-5" checked={!!h.up_down} onChange={(e) => updateHole(i, { up_down: e.target.checked })} /></td>
                    <td className="p-2 text-center"><input type="checkbox" className="h-5 w-5" checked={!!h.sand_save} onChange={(e) => updateHole(i, { sand_save: e.target.checked })} /></td>
                    <td className="p-2 text-center"><input type="checkbox" className="h-5 w-5" checked={!!h.penalty} onChange={(e) => updateHole(i, { penalty: e.target.checked })} /></td>
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
                  <td className="p-3" />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button className="rounded-2xl border px-4 py-2 inline-flex items-center gap-2" onClick={() => setStep(1)}><ChevronLeft className="h-4 w-4" /> Back</button>
            <button className="rounded-2xl bg-black text-white px-4 py-2 inline-flex items-center gap-2" onClick={() => setStep(3)}>Review <ChevronRight className="h-4 w-4" /></button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <button className="rounded-2xl border px-4 py-2 inline-flex items-center gap-2" onClick={() => setStep(2)}><ChevronLeft className="h-4 w-4" /> Back</button>
            <div className="flex items-center gap-2">
              <button onClick={() => handleSave(false)} className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 border hover:shadow disabled:opacity-50" disabled={isPending}><Save className="h-4 w-4" /> Save Draft</button>
              <button onClick={() => handleSave(true)} className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 bg-black text-white hover:opacity-90 disabled:opacity-50" disabled={isPending}><Send className="h-4 w-4" /> Save & Finish</button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

// ==========================
// File: app/rounds/new/page.tsx
// ==========================
import { createClient } from "@/lib/supabase/server";
import RoundEntry from "../_components/RoundEntry";

export default async function NewRoundPage() {
  const supabase = createClient();

  // Fetch minimal data needed to render selectors
  const [{ data: players }, { data: courses }, { data: teeSets }] = await Promise.all([
    supabase.from("players").select("id, first_name, last_name, grad_year").order("last_name"),
    supabase.from("courses").select("id, name").order("name"),
    supabase.from("tee_sets").select("id, course_id, name, rating, slope, par").order("name"),
  ]);

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <RoundEntry
        mode="create"
        initialRound={null}
        players={players ?? []}
        courses={courses ?? []}
        teeSets={teeSets ?? []}
      />
    </div>
  );
}

// ==========================
// File: app/rounds/[id]/edit/page.tsx
// ==========================
import { createClient } from "@/lib/supabase/server";
import RoundEntry from "../../_components/RoundEntry";

interface Props { params: { id: string } }

export default async function EditRoundPage({ params }: Props) {
  const supabase = createClient();
  const roundId = params.id;

  const [{ data: players }, { data: courses }, { data: teeSets }, { data: round }, { data: holes }] = await Promise.all([
    supabase.from("players").select("id, first_name, last_name, grad_year").order("last_name"),
    supabase.from("courses").select("id, name").order("name"),
    supabase.from("tee_sets").select("id, course_id, name, rating, slope, par").order("name"),
    supabase.from("rounds").select("id, player_id, course_id, tee_set_id, event_id, played_on, notes").eq("id", roundId).single(),
    supabase.from("round_holes").select("hole_number, par, yards, strokes, putts, fir, gir, up_down, sand_save, penalty").eq("round_id", roundId).order("hole_number"),
  ]);

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <RoundEntry
        mode="edit"
        initialRound={{ round: round ?? null, holes: holes ?? [] }}
        players={players ?? []}
        courses={courses ?? []}
        teeSets={teeSets ?? []}
      />
    </div>
  );
}

// ==========================
// File: app/rounds/_components/RoundEntry.tsx
// ==========================
"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Save, Send } from "lucide-react";
import HoleRow from "./HoleRow";
import { z } from "zod";
import { createRoundAction, updateRoundAction } from "./actions";

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

// ---- Component ----
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
  const [holes, setHoles] = useState<H
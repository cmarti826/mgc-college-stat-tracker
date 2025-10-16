// app/api/rounds/[id]/shots/route.ts
import { NextResponse, NextRequest } from "next/server";
import { createRouteClient } from "@/lib/supabase/server-route";

// Minimal runtime validation
type Lie =
  | "Tee" | "Fairway" | "Rough" | "Sand" | "Recovery"
  | "Green" | "Penalty" | "Other";

type ShotRow = {
  hole_number: number;
  shot_order: number;
  club?: string | null;
  lie: Lie;
  distance_to_hole_m?: number | null;
  start_x?: number | null;
  start_y?: number | null;
  end_x?: number | null;
  end_y?: number | null;
  result_lie: Lie;
  result_distance_to_hole_m?: number | null;
  putt?: boolean | null;
  penalty_strokes?: number | null;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteClient();
  const roundId = params.id;

  const { data, error } = await supabase
    .from("shots")
    .select("*")
    .eq("round_id", roundId)
    .order("hole_number", { ascending: true })
    .order("shot_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ data });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const roundId = params.id;
  const supabase = createRouteClient();

  // Ensure user is authenticated (lets RLS do the rest)
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: ShotRow[];
  try {
    payload = await req.json();
    if (!Array.isArray(payload)) throw new Error("Body must be an array of shots");
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Invalid JSON" }, { status: 400 });
  }

  // Basic validation + sanitize
  const ALLOWED_LIES = new Set<Lie>([
    "Tee","Fairway","Rough","Sand","Recovery","Green","Penalty","Other"
  ]);

  for (const s of payload) {
    if (
      typeof s.hole_number !== "number" ||
      s.hole_number < 1 || s.hole_number > 18
    ) return NextResponse.json({ error: `Invalid hole_number: ${s.hole_number}` }, { status: 400 });

    if (typeof s.shot_order !== "number" || s.shot_order < 1)
      return NextResponse.json({ error: `Invalid shot_order for hole ${s.hole_number}` }, { status: 400 });

    if (!ALLOWED_LIES.has(s.lie))
      return NextResponse.json({ error: `Invalid lie '${s.lie}' on hole ${s.hole_number}` }, { status: 400 });

    if (!ALLOWED_LIES.has(s.result_lie))
      return NextResponse.json({ error: `Invalid result_lie '${s.result_lie}' on hole ${s.hole_number}` }, { status: 400 });

    const numericOrNull = (v: any) =>
      v === null || v === undefined || (typeof v === "number" && Number.isFinite(v));

    if (!numericOrNull(s.distance_to_hole_m) ||
        !numericOrNull(s.result_distance_to_hole_m) ||
        !numericOrNull(s.start_x) || !numericOrNull(s.start_y) ||
        !numericOrNull(s.end_x)   || !numericOrNull(s.end_y)) {
      return NextResponse.json({ error: `Non-numeric distance/coord on hole ${s.hole_number}` }, { status: 400 });
    }

    if (s.penalty_strokes != null && (typeof s.penalty_strokes !== "number" || s.penalty_strokes < 0))
      return NextResponse.json({ error: `Invalid penalty_strokes on hole ${s.hole_number}` }, { status: 400 });
  }

  // Strategy: replace all shots for this round with the provided set.
  // (Simpler + avoids ordering conflicts.)
  // If you prefer upsert, comment the delete and use .upsert below.
  const del = await supabase.from("shots").delete().eq("round_id", roundId);
  if (del.error) {
    return NextResponse.json({ error: del.error.message }, { status: 400 });
  }

  // Insert new set
  const rows = payload.map((s) => ({
    round_id: roundId,
    hole_number: s.hole_number,
    shot_order: s.shot_order,
    club: s.club ?? null,
    lie: s.lie,
    distance_to_hole_m: s.distance_to_hole_m ?? null,
    start_x: s.start_x ?? null,
    start_y: s.start_y ?? null,
    end_x: s.end_x ?? null,
    end_y: s.end_y ?? null,
    result_lie: s.result_lie,
    result_distance_to_hole_m: s.result_distance_to_hole_m ?? null,
    putt: s.putt ?? false,
    penalty_strokes: s.penalty_strokes ?? 0,
  }));

  const ins = await supabase.from("shots").insert(rows).select("id");
  if (ins.error) {
    return NextResponse.json({ error: ins.error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, inserted: ins.data?.length ?? 0 });
}

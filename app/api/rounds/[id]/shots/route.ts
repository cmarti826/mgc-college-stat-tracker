import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/route";

// DB enum (UPPERCASE)
type LieEnum = "TEE" | "FAIRWAY" | "ROUGH" | "SAND" | "RECOVERY" | "GREEN";

// UI may send TitleCase or whatever; we normalize to LieEnum
type UILie =
  | "Tee" | "Fairway" | "Rough" | "Sand" | "Recovery" | "Green" | "Penalty" | "Other"
  | string;

type ShotRowUI = {
  hole_number: number;
  shot_order: number;
  club?: string | null;

  start_lie?: UILie;   // or `lie`
  end_lie?: UILie;     // or `result_lie`

  // distances in yards/feet only
  start_dist_yards?: number | null;
  start_dist_feet?: number | null;
  end_dist_yards?: number | null;
  end_dist_feet?: number | null;

  start_x?: number | null;
  start_y?: number | null;
  end_x?: number | null;
  end_y?: number | null;

  putt?: boolean | null;
  penalty_strokes?: number | null;
  lie?: UILie;          // back-compat
  result_lie?: UILie;   // back-compat
};

function normalizeLie(s?: UILie): LieEnum {
  const k = (s ?? "").toString().trim().toUpperCase();
  switch (k) {
    case "TEE":
    case "FAIRWAY":
    case "ROUGH":
    case "SAND":
    case "RECOVERY":
    case "GREEN":
      return k as LieEnum;
    case "PENALTY":
    case "OTHER":
    default:
      // map anything unknown/penalty to a valid enum bucket
      return "ROUGH"; // or "FAIRWAY"/"RECOVERY" if you prefer; choose one bucket
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const roundId = params.id;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: ShotRowUI[];
  try {
    payload = await req.json();
    if (!Array.isArray(payload)) throw new Error("Body must be an array of shots");
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Invalid JSON" }, { status: 400 });
  }

  // Validate unit by lie (UPPERCASE)
  for (const s of payload) {
    if (!Number.isFinite(s.hole_number) || s.hole_number < 1 || s.hole_number > 18)
      return NextResponse.json({ error: `Invalid hole_number '${s.hole_number}'` }, { status: 400 });
    if (!Number.isFinite(s.shot_order) || s.shot_order < 1)
      return NextResponse.json({ error: `Invalid shot_order on hole ${s.hole_number}` }, { status: 400 });

    const startLie = normalizeLie(s.start_lie ?? s.lie);
    const endLie   = normalizeLie(s.end_lie   ?? s.result_lie);

    if (startLie === "GREEN") {
      if (s.start_dist_feet == null || s.start_dist_feet < 0)
        return NextResponse.json({ error: `start_dist_feet required (>=0) on GREEN at hole ${s.hole_number}` }, { status: 400 });
    } else {
      if (s.start_dist_yards == null || s.start_dist_yards < 0)
        return NextResponse.json({ error: `start_dist_yards required (>=0) off GREEN at hole ${s.hole_number}` }, { status: 400 });
    }

    if (endLie === "GREEN") {
      if (s.end_dist_feet == null || s.end_dist_feet < 0)
        return NextResponse.json({ error: `end_dist_feet required (>=0) on GREEN at hole ${s.hole_number}` }, { status: 400 });
    } else {
      if (s.end_dist_yards == null || s.end_dist_yards < 0)
        return NextResponse.json({ error: `end_dist_yards required (>=0) off GREEN at hole ${s.hole_number}` }, { status: 400 });
    }
  }

  // Replace-all existing shots
  const del = await supabase.from("shots").delete().eq("round_id", roundId);
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 400 });

  const rows = payload.map((s) => {
    const startLie = normalizeLie(s.start_lie ?? s.lie);
    const endLie   = normalizeLie(s.end_lie   ?? s.result_lie);

    // treat any "Penalty" indicator as penalty=true
    const rawStart = (s.start_lie ?? s.lie)?.toString().toUpperCase();
    const rawEnd   = (s.end_lie ?? s.result_lie)?.toString().toUpperCase();
    const isPenalty = rawStart === "PENALTY" || rawEnd === "PENALTY" || (s.penalty_strokes ?? 0) > 0;

    return {
      round_id: roundId,
      hole_number: s.hole_number,
      shot_number: s.shot_order,
      club: s.club ?? null,

      // enum columns expect UPPERCASE lie_type
      start_lie: startLie,  // e.g. 'TEE'|'FAIRWAY'|...|'GREEN'
      end_lie: endLie,

      // yards/feet only
      start_dist_yards: startLie === "GREEN" ? null : (s.start_dist_yards ?? null),
      start_dist_feet:  startLie === "GREEN" ? (s.start_dist_feet ?? null) : null,
      end_dist_yards:   endLie   === "GREEN" ? null : (s.end_dist_yards ?? null),
      end_dist_feet:    endLie   === "GREEN" ? (s.end_dist_feet ?? null) : null,

      start_x: s.start_x ?? null,
      start_y: s.start_y ?? null,
      end_x:   s.end_x ?? null,
      end_y:   s.end_y ?? null,

      // legacy text columns exist in your table; keep them consistent
      lie: startLie,        // your CHECK accepts specific strings; if needed, cast server-side
      result_lie: endLie,

      putt: s.putt ?? (startLie === "GREEN"),
      penalty_strokes: s.penalty_strokes ?? 0,
      penalty: isPenalty,
    };
  });

  const ins = await supabase.from("shots").insert(rows).select("id");
  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 400 });

  return NextResponse.json({ ok: true, inserted: ins.data?.length ?? 0 });
}

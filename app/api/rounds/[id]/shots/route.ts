// app/api/rounds/[id]/shots/route.ts
import { NextResponse, NextRequest } from "next/server";
import { createRouteSupabase } from "@/lib/supabase/route";

// DB enum (UPPERCASE)
type LieEnum = "TEE" | "FAIRWAY" | "ROUGH" | "SAND" | "RECOVERY" | "GREEN";

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteSupabase(); // API route → use route client
  const roundId = params.id;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { hole_number, lie_before, distance_to_pin, club, shot_type } = body;

  if (!hole_number || !lie_before || !distance_to_pin || !club) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("shots")
    .insert({
      round_id: roundId,
      hole_number,
      lie_before: lie_before as LieEnum,
      distance_to_pin: Number(distance_to_pin),
      club,
      shot_type,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ shot: data }, { status: 201 });
}
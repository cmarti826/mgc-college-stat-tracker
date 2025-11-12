// app/api/admin/create-player/route.ts
import { createServerSupabase } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase();

    const { first_name, last_name, email, grad_year } = await request.json();

    if (!first_name || !last_name || !email) {
      return new Response(
        JSON.stringify({ error: "First name, last name, and email are required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get current user (admin)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create player
    const { data: player, error: playerError } = await supabase
      .from("players")
      .insert({
        first_name,
        last_name,
        email,
        grad_year: grad_year ? Number(grad_year) : null,
      })
      .select("id")
      .single();

    if (playerError) {
      return new Response(
        JSON.stringify({ error: playerError.message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, player_id: player.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("create-player error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
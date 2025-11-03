// app/admin/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseAction } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/* ----------------------- helpers ----------------------- */
function txt(x: FormDataEntryValue | null) {
  const s = (x ?? "").toString().trim();
  return s.length ? s : null;
}
function num(x: FormDataEntryValue | null) {
  const s = (x ?? "").toString().trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Admin client (service role) — uses public schema */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) {
    throw new Error("Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: "public" },
  });
}

/** Action client (cookie-based) — uses public schema */
function getActionClient() {
  return createServerSupabaseAction(); // Already uses public
}

/* ---------------- players / courses / tees ---------------- */

export async function createPlayer(formData: FormData): Promise<void> {
  const supabase = getActionClient();
  const full_name = txt(formData.get("full_name"));
  const grad_year = num(formData.get("grad_year"));
  const email = txt(formData.get("email"));
  const tempPassword = txt(formData.get("temp_password"));

  if (!full_name) throw new Error("Full name is required.");

  const { data: playerRow, error: playerErr } = await supabase
    .from("players")
    .insert({ full_name, grad_year })
    .select("id")
    .single();

  if (playerErr) throw new Error(playerErr.message);
  if (!playerRow) throw new Error("Failed to create player.");

  if (email && tempPassword) {
    const admin = getAdminClient();

    const { data: created, error: adminErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (adminErr) throw new Error(adminErr.message);
    if (!created.user) throw new Error("Auth user not created.");

    const user = created.user;

    const { error: profErr } = await admin
      .from("profiles")
      .upsert({ id: user.id, full_name, role: "player" }, { onConflict: "id" });

    if (profErr) throw new Error(profErr.message);

    const { error: linkErr } = await admin
      .from("user_players")
      .upsert({ user_id: user.id, player_id: playerRow.id }, { onConflict: "user_id" });

    if (linkErr) throw new Error(linkErr.message);
  }

  revalidatePath("/admin");
}

// ... rest of your actions (deletePlayer, createCourse, etc.) ...
// NO CHANGES NEEDED BELOW — THEY ALREADY USE .from("table")

export async function deletePlayer(formData: FormData): Promise<void> {
  const supabase = getActionClient();
  const id = txt(formData.get("id"));
  if (!id) throw new Error("Player id is required.");
  const { error } = await supabase.from("players").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function createCourse(formData: FormData): Promise<void> {
  const supabase = getActionClient();
  const name = txt(formData.get("name"));
  const city = txt(formData.get("city"));
  const state = txt(formData.get("state"));
  if (!name) throw new Error("Course name is required.");
  const { error } = await supabase.from("courses").insert({ name, city, state });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

// ... keep all other actions unchanged ...
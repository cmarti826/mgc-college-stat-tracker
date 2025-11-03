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

/** Service-role client (no cookies). Pass schema you want to operate in. */
function getAdminClient(schema: "mgc" | "public" = "mgc") {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase admin env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema }, // <— important
  });
}

/** Action-scoped anon client locked to mgc schema (cookies allowed). */
function getActionClient() {
  // createServerSupabaseAction() already sets db: { schema: "mgc" }
  return createServerSupabaseAction();
}

/* ---------------- players / courses / tees ---------------- */

export async function createPlayer(formData: FormData): Promise<void> {
  const supabase = getActionClient();
  const full_name = txt(formData.get("full_name"));
  const grad_year = num(formData.get("grad_year"));
  const email = txt(formData.get("email"));
  const tempPassword = txt(formData.get("temp_password"));

  if (!full_name) throw new Error("Full name is required.");

  // Create player (mgc schema)
  const { data: playerRow, error: playerErr } = await supabase
    .from("players")
    .insert({ full_name, grad_year })
    .select("id")
    .maybeSingle();
  if (playerErr) throw new Error(playerErr.message);
  if (!playerRow) throw new Error("Failed to create player.");

  // If email + password are provided, create an auth user and link it.
  if (email && tempPassword) {
    const adminMgc = getAdminClient("mgc");
    const adminPublic = getAdminClient("public");

    const { data: created, error: adminErr } = await adminPublic.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (adminErr) {
      // (Optional) you could delete the just-created player here.
      throw new Error(adminErr.message);
    }
    const user = created.user;
    if (!user) throw new Error("Auth user creation returned no user.");

    // Profile lives in public schema
    const { error: profErr } = await adminPublic
      .from("profiles")
      .upsert({ id: user.id, full_name, role: "player" }, { onConflict: "id" });
    if (profErr) throw new Error(profErr.message);

    // Link user ↔ player lives in mgc schema
    const { error: linkErr } = await adminMgc
      .from("user_players")
      .upsert({ user_id: user.id, player_id: playerRow.id }, { onConflict: "user_id" });
    if (linkErr) throw new Error(linkErr.message);
  }

  revalidatePath("/admin");
}

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

export async function deleteCourse(formData: FormData): Promise<void> {
  const supabase = getActionClient();
  const id = txt(formData.get("id"));
  if (!id) throw new Error("Course id is required.");
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function createTeeSet(formData: FormData): Promise<void> {
  const supabase = getActionClient();
  const course_id = txt(formData.get("course_id"));
  const name = txt(formData.get("tee_name")) ?? txt(formData.get("name"));
  const rating = num(formData.get("rating"));
  const slope = num(formData.get("slope"));
  const par = num(formData.get("par"));
  const yards = num(formData.get("yards"));

  if (!course_id) throw new Error("course_id is required.");
  if (!name) throw new Error("Tee set name is required.");
  if (!par) throw new Error("Par is required.");

  const { error } = await supabase.from("tee_sets").insert({
    course_id,
    name,
    rating,
    slope,
    par,
    yards,
    tee_name: name,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function deleteTeeSet(formData: FormData): Promise<void> {
  const supabase = getActionClient();
  const id = txt(formData.get("id"));
  if (!id) throw new Error("Tee set id is required.");
  const { error } = await supabase.from("tee_sets").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

/* ---------------------- teams & members ---------------------- */

export async function createTeam(formData: FormData): Promise<void> {
  const supabase = getActionClient();
  const name = txt(formData.get("team_name"));
  const school = txt(formData.get("school"));
  if (!name) throw new Error("Team name is required.");
  const { error } = await supabase.from("teams").insert({ name, school });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function deleteTeam(formData: FormData): Promise<void> {
  const supabase = getActionClient();
  const id = txt(formData.get("id"));
  if (!id) throw new Error("Team id is required.");
  const { error } = await supabase.from("teams").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function addTeamMember(formData: FormData): Promise<void> {
  const supabase = getActionClient();
  const team_id = txt(formData.get("team_id"));
  const user_id = txt(formData.get("user_id"));
  const player_id = txt(formData.get("player_id"));
  const role = (txt(formData.get("role")) ?? "player") as "player" | "coach" | "admin";

  if (!team_id) throw new Error("team_id is required.");
  if (!user_id && !player_id) throw new Error("Choose a user or a player.");

  const { error } = await supabase.from("team_members").insert({
    team_id,
    user_id,
    player_id,
    role,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function removeTeamMember(formData: FormData): Promise<void> {
  const supabase = getActionClient();
  const member_id = txt(formData.get("member_id"));
  if (!member_id) throw new Error("member_id is required.");
  const { error } = await supabase.from("team_members").delete().eq("id", member_id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function linkUserToPlayer(formData: FormData): Promise<void> {
  // Use admin mgc to bypass RLS if needed for back-office linking
  const adminMgc = getAdminClient("mgc");
  const user_id = txt(formData.get("user_id"));
  const player_id = txt(formData.get("player_id"));
  if (!user_id || !player_id) throw new Error("user_id and player_id are required.");
  const { error } = await adminMgc
    .from("user_players")
    .upsert({ user_id, player_id }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function setDefaultTeam(formData: FormData): Promise<void> {
  // profiles is in public schema
  const adminPublic = getAdminClient("public");
  const user_id = txt(formData.get("user_id"));
  const team_id = txt(formData.get("team_id"));
  if (!user_id || !team_id) throw new Error("user_id and team_id are required.");
  const { error } = await adminPublic
    .from("profiles")
    .update({ default_team_id: team_id })
    .eq("id", user_id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

/* --------------------------- rounds --------------------------- */

export async function createRound(formData: FormData): Promise<void> {
  const supabase = getActionClient();

  const player_id = txt(formData.get("player_id"));
  const course_id = txt(formData.get("course_id"));
  const tee_set_id = txt(formData.get("tee_set_id"));
  const team_id = txt(formData.get("team_id"));
  const date = txt(formData.get("date"));
  const name = txt(formData.get("name"));
  const notes = txt(formData.get("notes"));
  const type = txt(formData.get("type"));
  const status = txt(formData.get("status"));

  if (!player_id) throw new Error("player_id is required.");
  if (!course_id) throw new Error("course_id is required.");
  if (!tee_set_id) throw new Error("tee_set_id is required.");

  const insert = {
    player_id,
    course_id,
    tee_set_id,
    team_id: team_id ?? null,
    date: date ?? undefined,
    name: name ?? null,
    notes: notes ?? null,
    type: type ?? undefined,
    status: status ?? undefined,
  };

  const { error } = await supabase.from("scheduled_rounds").insert(insert as any);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/rounds");
}

export async function deleteRound(formData: FormData): Promise<void> {
  const supabase = getActionClient();
  const id = txt(formData.get("id"));
  if (!id) throw new Error("round id is required.");
  const { error } = await supabase.from("scheduled_rounds").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/rounds");
}

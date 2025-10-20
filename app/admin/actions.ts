// app/admin/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

/* ---------------- players / courses / tees ---------------- */

export async function createPlayer(formData: FormData): Promise<void> {
  const supabase = createClient();
  const full_name = txt(formData.get("full_name"));
  const grad_year = num(formData.get("grad_year"));
  if (!full_name) throw new Error("Full name is required.");
  const { error } = await supabase.from("players").insert({ full_name, grad_year });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function deletePlayer(formData: FormData): Promise<void> {
  const supabase = createClient();
  const id = txt(formData.get("id"));
  if (!id) throw new Error("Player id is required.");
  const { error } = await supabase.from("players").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function createCourse(formData: FormData): Promise<void> {
  const supabase = createClient();
  const name = txt(formData.get("name"));
  const city = txt(formData.get("city"));
  const state = txt(formData.get("state"));
  if (!name) throw new Error("Course name is required.");
  const { error } = await supabase.from("courses").insert({ name, city, state });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function deleteCourse(formData: FormData): Promise<void> {
  const supabase = createClient();
  const id = txt(formData.get("id"));
  if (!id) throw new Error("Course id is required.");
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function createTeeSet(formData: FormData): Promise<void> {
  const supabase = createClient();
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
  const supabase = createClient();
  const id = txt(formData.get("id"));
  if (!id) throw new Error("Tee set id is required.");
  const { error } = await supabase.from("tee_sets").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

/* ---------------------- teams & members ---------------------- */

export async function createTeam(formData: FormData): Promise<void> {
  const supabase = createClient();
  const name = txt(formData.get("team_name"));
  const school = txt(formData.get("school"));
  if (!name) throw new Error("Team name is required.");
  const { error } = await supabase.from("teams").insert({ name, school });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function deleteTeam(formData: FormData): Promise<void> {
  const supabase = createClient();
  const id = txt(formData.get("id"));
  if (!id) throw new Error("Team id is required.");
  const { error } = await supabase.from("teams").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function addTeamMember(formData: FormData): Promise<void> {
  const supabase = createClient();
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
  const supabase = createClient();
  const member_id = txt(formData.get("member_id"));
  if (!member_id) throw new Error("member_id is required.");
  const { error } = await supabase.from("team_members").delete().eq("id", member_id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function linkUserToPlayer(formData: FormData): Promise<void> {
  const supabase = createClient();
  const user_id = txt(formData.get("user_id"));
  const player_id = txt(formData.get("player_id"));
  if (!user_id || !player_id) throw new Error("user_id and player_id are required.");
  const { error } = await supabase
    .from("user_players")
    .upsert({ user_id, player_id }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function setDefaultTeam(formData: FormData): Promise<void> {
  const supabase = createClient();
  const user_id = txt(formData.get("user_id"));
  const team_id = txt(formData.get("team_id"));
  if (!user_id || !team_id) throw new Error("user_id and team_id are required.");
  const { error } = await supabase.from("profiles").update({ default_team_id: team_id }).eq("id", user_id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

/* --------------------------- rounds --------------------------- */

export async function createRound(formData: FormData): Promise<void> {
  const supabase = createClient();

  const player_id = txt(formData.get("player_id"));
  const course_id = txt(formData.get("course_id"));
  const tee_set_id = txt(formData.get("tee_set_id"));
  const team_id = txt(formData.get("team_id")); // optional
  const date = txt(formData.get("date")); // yyyy-mm-dd
  const name = txt(formData.get("name"));
  const notes = txt(formData.get("notes"));
  const type = txt(formData.get("type"));     // optional, defaults in DB
  const status = txt(formData.get("status")); // optional, defaults in DB

  if (!player_id) throw new Error("player_id is required.");
  if (!course_id) throw new Error("course_id is required.");
  if (!tee_set_id) throw new Error("tee_set_id is required.");

  const insert = {
    player_id,
    course_id,
    tee_set_id,
    team_id: team_id ?? null,
    date: date ?? undefined,   // let DB default if no date
    name: name ?? null,
    notes: notes ?? null,
    type: type ?? undefined,       // rely on enum default when undefined
    status: status ?? undefined,   // rely on enum default when undefined
  };

  const { error } = await supabase.from("rounds").insert(insert as any);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/rounds");
}

export async function deleteRound(formData: FormData): Promise<void> {
  const supabase = createClient();
  const id = txt(formData.get("id"));
  if (!id) throw new Error("round id is required.");

  // NOTE: If you have ON DELETE CASCADE on child tables (shots/scores), this will cascade.
  // If not, you may get FK errors; clean up children first or add cascades.
  const { error } = await supabase.from("rounds").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/rounds");
}

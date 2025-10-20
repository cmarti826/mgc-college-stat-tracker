// app/admin/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// helpers
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

// Notes:
// - Server Actions used in <form action={...}> MUST return void | Promise<void>.
// - We throw on error so Next shows a standard error overlay (or you can handle it later).

export async function createPlayer(formData: FormData): Promise<void> {
  const supabase = createClient();
  const full_name = txt(formData.get("full_name"));
  const grad_year = num(formData.get("grad_year"));

  if (!full_name) throw new Error("Full name is required.");

  const { error } = await supabase.from("players").insert({ full_name, grad_year });
  if (error) throw new Error(error.message);

  revalidatePath("/players");
}

export async function createCourse(formData: FormData): Promise<void> {
  const supabase = createClient();
  const name = txt(formData.get("name"));
  const city = txt(formData.get("city"));
  const state = txt(formData.get("state"));

  if (!name) throw new Error("Course name is required.");

  const { error } = await supabase.from("courses").insert({ name, city, state });
  if (error) throw new Error(error.message);

  revalidatePath("/courses");
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

  revalidatePath("/courses");
}

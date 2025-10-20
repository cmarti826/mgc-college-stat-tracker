// app/admin/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

export async function createPlayer(formData: FormData) {
  const supabase = createClient();
  const full_name = txt(formData.get("full_name"));
  const grad_year = num(formData.get("grad_year"));

  if (!full_name) {
    return { ok: false, error: "Full name is required." };
  }

  const { error } = await supabase.from("players").insert({ full_name, grad_year });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/players");
  return { ok: true };
}

export async function createCourse(formData: FormData) {
  const supabase = createClient();
  const name = txt(formData.get("name"));
  const city = txt(formData.get("city"));
  const state = txt(formData.get("state"));

  if (!name) return { ok: false, error: "Course name is required." };

  const { error } = await supabase.from("courses").insert({ name, city, state });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/courses");
  return { ok: true };
}

export async function createTeeSet(formData: FormData) {
  const supabase = createClient();
  const course_id = txt(formData.get("course_id"));
  const name = txt(formData.get("tee_name")) ?? txt(formData.get("name"));
  const rating = num(formData.get("rating"));
  const slope = num(formData.get("slope"));
  const par = num(formData.get("par"));
  const yards = num(formData.get("yards"));

  if (!course_id) return { ok: false, error: "course_id is required." };
  if (!name) return { ok: false, error: "Tee set name is required." };
  if (!par) return { ok: false, error: "Par is required." };

  const { error } = await supabase.from("tee_sets").insert({
    course_id,
    name,
    rating,
    slope,
    par,
    yards,
    tee_name: name,
    // created_by: you can set this with auth if needed
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/courses");
  return { ok: true };
}

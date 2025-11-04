// app/admin/teams/actions.ts
"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function deleteTeamAction(formData: FormData) {
  const supabase = createServerSupabase();
  const id = String(formData.get("id") || "");

  if (!id) throw new Error("Team ID is required.");

  const { error } = await supabase.from("teams").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/admin/teams");
}
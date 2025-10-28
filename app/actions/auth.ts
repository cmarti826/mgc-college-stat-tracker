// app/actions/auth.ts
"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function signOutAction() {
  const supabase = createServerSupabase();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/login");
}
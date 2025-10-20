// app/admin/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminContent from "./AdminContent";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Only allow access to the Admin page if:
 *  - the logged-in user's id is in ADMIN_USER_IDS, OR
 *  - their profile role is 'admin' (DB-based fallback)
 */
export default async function AdminPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Your UUID here. You can add more later.
  const ADMIN_USER_IDS = new Set<string>([
    "5335e203-38e4-479b-a352-02986df268fd",
  ]);

  if (!user) {
    redirect("/login");
  }

  // Optional DB role check
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdminById = ADMIN_USER_IDS.has(user.id);
  const isAdminByRole = profile?.role === "admin";

  if (!isAdminById && !isAdminByRole) {
    redirect("/");
  }

  return <AdminContent />;
}

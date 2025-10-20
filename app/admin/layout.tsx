import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Hard-coded admin UUID you gave earlier
  const ADMIN_ID = "5335e203-38e4-479b-a352-02986df268fd";
  if (!user || user.id !== ADMIN_ID) redirect("/");

  return <div className="max-w-6xl mx-auto p-6">{children}</div>;
}

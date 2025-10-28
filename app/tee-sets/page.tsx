// app/tee-sets/page.tsx
import { createServerSupabase } from "@/lib/supabase/server";

export default async function TeeSetsIndex() {
  const supabase = await createServerSupabase();
  const [{ data: sets }, { data: courses }] = await Promise.all([
    supabase.from("tee_sets").select("id, course_id, name, tee_name, rating, slope, par").order("name"),
    supabase.from("courses").select("id, name"),
  ]);

  const courseName = (cid: string) => courses?.find((c: any) => c.id === cid)?.name ?? "—";

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Tee Sets</h1>
      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold">All Tee Sets</div>
        <div className="divide-y">
          {(sets ?? []).map((t: any) => (
            <div key={t.id} className="px-4 py-3">
              <div className="font-medium">
                {t.tee_name ?? t.name} <span className="text-xs text-gray-500">• {courseName(t.course_id)}</span>
              </div>
              <div className="text-xs text-gray-500">
                Rating {t.rating ?? "—"} • Slope {t.slope ?? "—"} • Par {t.par ?? "—"}
              </div>
            </div>
          ))}
          {(sets ?? []).length === 0 && (
            <div className="px-4 py-6 text-sm text-gray-500">No tee sets yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

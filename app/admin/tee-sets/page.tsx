// app/admin/tee-sets/page.tsx
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import NavAdmin from "../NavAdmin";
import Link from "next/link";

async function loadData() {
  const supabase = await createClient();
  const [{ data: sets }, { data: courses }, { data: holes }] = await Promise.all([
    supabase.from("tee_sets").select("id, course_id, name, tee_name, rating, slope, par, created_by").order("name"),
    supabase.from("courses").select("id, name").order("name"),
    supabase.from("tee_set_holes").select("tee_set_id, hole_number, yardage").order("hole_number"),
  ]);

  const holesBySet = new Map<string, any[]>();
  (holes ?? []).forEach((h: any) => {
    holesBySet.set(h.tee_set_id, [...(holesBySet.get(h.tee_set_id) ?? []), h]);
  });

  return { sets: sets ?? [], courses: courses ?? [], holesBySet };
}

async function deleteTeeSet(id: string) {
  "use server";
  const supabase = await createClient();
  await supabase.from("tee_set_holes").delete().eq("tee_set_id", id);
  const { error } = await supabase.from("tee_sets").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/tee-sets");
}

async function saveHoles(tee_set_id: string, formData: FormData) {
  "use server";
  const supabase = await createClient();

  // Parse 18 yardage inputs named y1..y18
  const rows = Array.from({ length: 18 }, (_, i) => {
    const n = i + 1;
    const val = formData.get(`y${n}`);
    const yardage = val ? Number(val) : null;
    return { tee_set_id, hole_number: n, yardage };
  });

  // Upsert each (composite PK)
  const { error } = await supabase.from("tee_set_holes").upsert(rows, {
    onConflict: "tee_set_id,hole_number",
  });
  if (error) throw error;

  revalidatePath("/admin/tee-sets");
}

export default async function AdminTeeSetsPage() {
  const { sets, courses, holesBySet } = await loadData();

  const courseName = (cid: string) => courses.find((c: any) => c.id === cid)?.name ?? "—";

  return (
    <div className="p-6 space-y-6">
      <NavAdmin />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Tee Sets</h1>
        <Link href="/admin/tee-sets/new" className="px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm">
          ➕ New Tee Set
        </Link>
      </div>

      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold">All Tee Sets</div>
        <div className="divide-y">
          {sets.map((t: any) => {
            const holes = holesBySet.get(t.id) ?? [];
            const byNum = new Map(holes.map((h: any) => [h.hole_number, h]));
            return (
              <div key={t.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {t.tee_name ?? t.name} <span className="text-xs text-gray-500">• {courseName(t.course_id)}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Rating {t.rating ?? "—"} • Slope {t.slope ?? "—"} • Par {t.par ?? "—"}
                    </div>
                  </div>
                  <form action={deleteTeeSet.bind(null, t.id)}>
                    <button className="text-red-600">Delete</button>
                  </form>
                </div>

                {/* Hole yardages editor */}
                <form action={saveHoles.bind(null, t.id)} className="overflow-x-auto">
                  <table className="text-sm w-full min-w-[720px]">
                    <thead>
                      <tr className="text-left border-b">
                        {Array.from({ length: 18 }, (_, i) => (
                          <th key={i} className="py-2 pr-2">H{i + 1}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {Array.from({ length: 18 }, (_, i) => {
                          const n = i + 1;
                          const y = byNum.get(n)?.yardage ?? "";
                          return (
                            <td key={i} className="py-2 pr-2">
                              <input
                                name={`y${n}`}
                                defaultValue={y ?? ""}
                                type="number"
                                className="w-20 border rounded p-1"
                                placeholder="yd"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                  <div className="mt-3">
                    <button className="px-3 py-2 rounded-lg border bg-white">Save Yardages</button>
                  </div>
                </form>
              </div>
            );
          })}
          {sets.length === 0 && (
            <div className="px-4 py-6 text-sm text-gray-500">No tee sets yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

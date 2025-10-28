// app/tee-sets/new/page.tsx  (optional public create)
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

async function createTeeSet(formData: FormData) {
  "use server";
  const supabase = await createServerSupabase();

  const course_id = String(formData.get("course_id") || "");
  const name = String(formData.get("name") || "").trim();
  const tee_name = String(formData.get("tee_name") || "").trim() || null;
  const rating = formData.get("rating") ? Number(formData.get("rating")) : null;
  const slope = formData.get("slope") ? Number(formData.get("slope")) : null;
  const par = formData.get("par") ? Number(formData.get("par")) : null;

  if (!course_id || !name) throw new Error("Course and Name are required.");

  const { data: inserted, error } = await supabase
    .from("tee_sets")
    .insert({ course_id, name, tee_name, rating, slope, par })
    .select("id")
    .single();

  if (error) throw error;

  // Seed 1..18 holes empty
  const rows = Array.from({ length: 18 }, (_, i) => ({
    tee_set_id: inserted.id, hole_number: i + 1, yardage: null,
  }));
  const { error: holesErr } = await supabase.from("tee_set_holes").insert(rows);
  if (holesErr) throw holesErr;

  revalidatePath("/tee-sets");
}

export default async function PublicNewTeeSet() {
  const supabase = await createServerSupabase();
  const { data: courses } = await supabase.from("courses").select("id, name").order("name");

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Create Tee Set</h1>
      <form action={createTeeSet} className="space-y-3 rounded-2xl border bg-white p-4">
        <div>
          <label className="block text-sm">Course</label>
          <select name="course_id" className="w-full border rounded p-2" required>
            <option value="">Select course…</option>
            {(courses ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm">Tee Set Name</label>
          <input name="name" className="w-full border rounded p-2" placeholder="Blue" required />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm">Rating</label>
            <input name="rating" type="number" step="0.1" className="w-full border rounded p-2" />
          </div>
          <div>
            <label className="block text-sm">Slope</label>
            <input name="slope" type="number" className="w-full border rounded p-2" />
          </div>
          <div>
            <label className="block text-sm">Par</label>
            <input name="par" type="number" className="w-full border rounded p-2" />
          </div>
        </div>
        <button className="px-4 py-2 rounded-xl bg-blue-600 text-white">Create</button>
      </form>
    </div>
  );
}

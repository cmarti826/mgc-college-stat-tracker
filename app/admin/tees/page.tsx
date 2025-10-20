import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import NavAdmin from "../NavAdmin";

async function loadData() {
  const supabase = await createClient();
  const [{ data: tees }, { data: courses }] = await Promise.all([
    supabase.from("tees").select("id, name, course_id, rating, slope, par, created_at").order("created_at", { ascending: false }),
    supabase.from("courses").select("id, name").order("name"),
  ]);
  return { tees: tees ?? [], courses: courses ?? [] };
}

async function createTee(formData: FormData) {
  "use server";
  const supabase = await createClient();

  const name = String(formData.get("name") || "").trim();
  const course_id = String(formData.get("course_id") || "");
  const rating = formData.get("rating") ? Number(formData.get("rating")) : null;
  const slope = formData.get("slope") ? Number(formData.get("slope")) : null;
  const par   = formData.get("par")   ? Number(formData.get("par"))   : null;

  if (!name || !course_id) throw new Error("Name and Course are required.");

  const { error } = await supabase.from("tees").insert({ name, course_id, rating, slope, par });
  if (error) throw error;

  revalidatePath("/admin/tees");
}

async function deleteTee(teeId: string) {
  "use server";
  const supabase = await createClient();
  const { error } = await supabase.from("tees").delete().eq("id", teeId);
  if (error) throw error;
  revalidatePath("/admin/tees");
}

export default async function AdminTeesPage() {
  const { tees, courses } = await loadData();

  const courseName = (cid: string) => courses.find((c: any) => c.id === cid)?.name ?? "—";

  return (
    <div className="p-6 space-y-6">
      <NavAdmin />
      <h1 className="text-2xl font-bold">Manage Tees</h1>

      <section className="grid md:grid-cols-2 gap-6">
        {/* Create */}
        <div className="rounded-2xl border p-4 bg-white">
          <h2 className="font-semibold mb-3">Create Tee</h2>
          <form action={createTee} className="space-y-3">
            <div>
              <label className="block text-sm">Name</label>
              <input name="name" className="w-full border rounded p-2" placeholder="Blue, White, etc." required />
            </div>
            <div>
              <label className="block text-sm">Course</label>
              <select name="course_id" className="w-full border rounded p-2" required>
                <option value="">Select course…</option>
                {courses.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
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

        {/* List */}
        <div className="rounded-2xl border p-0 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold">All Tees</div>
          <div className="divide-y">
            {tees.map((t: any) => (
              <div key={t.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {t.name} <span className="text-xs text-gray-500">• {courseName(t.course_id)}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Rating {t.rating ?? "—"} • Slope {t.slope ?? "—"} • Par {t.par ?? "—"}
                  </div>
                </div>
                <form action={async () => deleteTee(t.id)}>
                  <button className="text-red-600">Delete</button>
                </form>
              </div>
            ))}
            {tees.length === 0 && <div className="px-4 py-6 text-sm text-gray-500">No tees yet.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}

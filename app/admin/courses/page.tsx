import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import NavAdmin from "../NavAdmin";

async function loadData() {
  const supabase = await createBrowserSupabase();
  const { data: courses } = await supabase.from("courses").select("id, name, city, state, created_at").order("name");
  return { courses: courses ?? [] };
}

async function createCourse(formData: FormData) {
  "use server";
  const supabase = await createBrowserSupabase();
  const name = String(formData.get("name") || "").trim();
  const city = String(formData.get("city") || "").trim() || null;
  const state = String(formData.get("state") || "").trim() || null;
  if (!name) throw new Error("Course name is required.");
  const { error } = await supabase.from("courses").insert({ name, city, state });
  if (error) throw error;
  revalidatePath("/admin/courses");
}

async function deleteCourse(courseId: string) {
  "use server";
  const supabase = await createBrowserSupabase();
  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) throw error;
  revalidatePath("/admin/courses");
}

export default async function AdminCoursesPage() {
  const { courses } = await loadData();

  return (
    <div className="p-6 space-y-6">
      <NavAdmin />
      <h1 className="text-2xl font-bold">Manage Courses</h1>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border p-4 bg-white">
          <h2 className="font-semibold mb-3">Create Course</h2>
          <form action={createCourse} className="space-y-3">
            <div>
              <label className="block text-sm">Course Name</label>
              <input name="name" className="w-full border rounded p-2" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm">City</label>
                <input name="city" className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block text-sm">State</label>
                <input name="state" className="w-full border rounded p-2" />
              </div>
            </div>
            <button className="px-4 py-2 rounded-xl bg-blue-600 text-white">Create</button>
          </form>
        </div>

        <div className="rounded-2xl border p-0 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold">All Courses</div>
          <div className="divide-y">
            {courses.map((c: any) => (
              <div key={c.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-gray-500">{c.city ?? "—"}, {c.state ?? "—"}</div>
                </div>
                <form action={deleteCourse.bind(null, c.id)}>
                  <button className="text-red-600">Delete</button>
                </form>
              </div>
            ))}
            {courses.length === 0 && <div className="px-4 py-6 text-sm text-gray-500">No courses yet.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}

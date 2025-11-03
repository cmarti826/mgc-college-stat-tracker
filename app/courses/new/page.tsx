// app/courses/new/page.tsx

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";

// Server Action: Create Course + 18 Holes
async function createCourse(formData: FormData) {
  "use server";

  const supabase = await createServerSupabase();
  if (!supabase) throw new Error("Database connection failed.");

  const name = String(formData.get("name") || "").trim();
  const city = String(formData.get("city") || "").trim() || null;
  const state = String(formData.get("state") || "").trim() || null;

  if (!name) throw new Error("Course name is required.");

  // Parse hole pars (1–18)
  const holes: { number: number; par: number }[] = [];
  for (let i = 1; i <= 18; i++) {
    const parStr = formData.get(`hole-${i}`);
    const par = parStr ? parseInt(String(parStr), 10) : 4;
    if (isNaN(par) || par < 3 || par > 5) {
      throw new Error(`Hole ${i}: Par must be 3, 4, or 5.`);
    }
    holes.push({ number: i, par });
  }

  // Insert course
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .insert({ name, city, state })
    .select("id")
    .single();

  if (courseError) throw courseError;

  // Insert holes
  const holeRows = holes.map((h) => ({
    course_id: course.id,
    number: h.number,
    par: h.par,
  }));

  const { error: holesError } = await supabase
    .from("holes")
    .insert(holeRows);

  if (holesError) throw holesError;

  revalidatePath("/courses");
  redirect("/tee-sets/new?course=" + course.id);
}

export default async function NewCoursePage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Course</h1>
          <p className="mt-1 text-sm text-gray-600">
            Add a course and define par for all 18 holes.
          </p>
        </div>
        <Link
          href="/courses"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Back to Courses
        </Link>
      </div>

      {/* Form */}
      <form action={createCourse} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          {/* Course Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Course Name <span className="text-red-600">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="e.g. Hackberry Golf Course"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                id="city"
                name="city"
                type="text"
                placeholder="Houston"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                id="state"
                name="state"
                type="text"
                placeholder="TX"
                maxLength={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors uppercase"
              />
            </div>
          </div>

          {/* Hole Pars */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Hole Par Settings
            </h2>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hole
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Par
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Array.from({ length: 18 }, (_, i) => i + 1).map((hole) => (
                    <tr key={hole} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-700">
                        Hole {hole}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          name={`hole-${hole}`}
                          defaultValue={4}
                          min={3}
                          max={5}
                          required
                          className="w-20 px-2 py-1 text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Par must be 3, 4, or 5 for each hole.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Link
            href="/courses"
            className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Create Course &amp; Add Tee Set
          </button>
        </div>
      </form>
    </div>
  );
}
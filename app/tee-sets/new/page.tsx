// app/tee-sets/new/page.tsx

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";

// Server Action: Create Tee Set
async function createTeeSet(formData: FormData) {
  "use server";

  const supabase = await createServerSupabase();
  if (!supabase) throw new Error("Database connection failed.");

  const course_id = String(formData.get("course_id") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const tee_name = formData.get("tee_name")
    ? String(formData.get("tee_name")).trim() || null
    : null;
  const rating = formData.get("rating")
    ? parseFloat(String(formData.get("rating")))
    : null;
  const slope = formData.get("slope")
    ? parseInt(String(formData.get("slope")), 10)
    : null;
  const par = formData.get("par")
    ? parseInt(String(formData.get("par")), 10)
    : null;

  // Validation
  if (!course_id || !name) {
    throw new Error("Course and Tee Set Name are required.");
  }

  if (rating !== null && (isNaN(rating) || rating < 50 || rating > 80)) {
    throw new Error("Rating must be between 50.0 and 80.0");
  }

  if (slope !== null && (isNaN(slope) || slope < 55 || slope > 155)) {
    throw new Error("Slope must be between 55 and 155");
  }

  if (par !== null && (isNaN(par) || par < 60 || par > 78)) {
    throw new Error("Par must be between 60 and 78");
  }

  // Insert tee set
  const { data: teeSet, error: insertError } = await supabase
    .from("tee_sets")
    .insert({
      course_id,
      name,
      tee_name,
      rating,
      slope,
      par,
    })
    .select("id")
    .single();

  if (insertError) throw insertError;

  // Seed 18 empty holes
  const holes = Array.from({ length: 18 }, (_, i) => ({
    tee_set_id: teeSet.id,
    hole_number: i + 1,
    yardage: null,
  }));

  const { error: holesError } = await supabase
    .from("tee_set_holes")
    .insert(holes);

  if (holesError) throw holesError;

  revalidatePath("/tee-sets");
  redirect(`/tee-sets`);
}

// Page Component
export default async function CreateTeeSetPage() {
  const supabase = await createServerSupabase();
  if (!supabase) {
    return (
      <div className="p-6 text-center text-red-600">
        Database unavailable. Please try again later.
      </div>
    );
  }

  const { data: courses, error } = await supabase
    .from("courses")
    .select("id, name")
    .order("name", { ascending: true });

  if (error || !courses) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 font-medium">Failed to load courses.</p>
        <p className="text-sm text-gray-500 mt-1">{error?.message}</p>
      </div>
    );
  }

  const hasCourses = courses.length > 0;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Tee Set</h1>
          <p className="mt-1 text-sm text-gray-600">
            Add a new set of tees for a course.
          </p>
        </div>
        <Link
          href="/tee-sets"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Back to Tee Sets
        </Link>
      </div>

      {/* Form */}
      <form action={createTeeSet} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          {/* Course Select */}
          <div>
            <label htmlFor="course_id" className="block text-sm font-medium text-gray-700 mb-1">
              Course <span className="text-red-600">*</span>
            </label>
            <select
              id="course_id"
              name="course_id"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              defaultValue=""
            >
              <option value="" disabled>
                {hasCourses ? "Select a course…" : "No courses available"}
              </option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
            {!hasCourses && (
              <p className="mt-2 text-xs text-amber-600">
                <Link href="/courses/new" className="underline">
                  Create a course first
                </Link>{" "}
                to add tee sets.
              </p>
            )}
          </div>

          {/* Tee Set Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Tee Set Name <span className="text-red-600">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. Blue, Championship, Ladies"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Optional Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="rating" className="block text-sm font-medium text-gray-700 mb-1">
                Rating
              </label>
              <input
                id="rating"
                name="rating"
                type="number"
                step="0.1"
                min="50"
                max="80"
                placeholder="72.4"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="slope" className="block text-sm font-medium text-gray-700 mb-1">
                Slope
              </label>
              <input
                id="slope"
                name="slope"
                type="number"
                min="55"
                max="155"
                placeholder="113"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="par" className="block text-sm font-medium text-gray-700 mb-1">
                Par
              </label>
              <input
                id="par"
                name="par"
                type="number"
                min="60"
                max="78"
                placeholder="72"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Optional Tee Name */}
          <div>
            <label htmlFor="tee_name" className="block text-sm font-medium text-gray-700 mb-1">
              Display Name (optional)
            </label>
            <input
              id="tee_name"
              name="tee_name"
              type="text"
              placeholder="e.g. Blue Tees"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            <p className="mt-1 text-xs text-gray-500">
              Used in scorecards. Falls back to Tee Set Name if blank.
            </p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between">
          <Link
            href="/tee-sets"
            className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!hasCourses}
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Create Tee Set
          </button>
        </div>
      </form>
    </div>
  );
}
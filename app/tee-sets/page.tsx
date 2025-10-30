// app/tee-sets/page.tsx

import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TeeSetsIndex() {
  const supabase = createServerSupabase();

  const [
    { data: teeSets, error: teeSetsError },
    { data: courses, error: coursesError },
  ] = await Promise.all([
    supabase
      .from("mgc.tee_sets")
      .select("id, course_id, name, tee_name, rating, slope, par")
      .order("tee_name", { ascending: true }),
    supabase.from("mgc.courses").select("id, name").order("name"),
  ]);

  if (teeSetsError || coursesError) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 font-medium">
          Failed to load tee sets or courses.
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {teeSetsError?.message || coursesError?.message}
        </p>
      </div>
    );
  }

  // Build course lookup map for O(1) access
  const courseMap = new Map<string, string>();
  (courses ?? []).forEach((c) => courseMap.set(c.id, c.name));

  const hasTeeSets = teeSets && teeSets.length > 0;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Tee Sets</h1>
        <Link
          href="/courses"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          Manage Courses →
        </Link>
      </div>

      {/* Tee Sets List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            All Tee Sets
          </h2>
        </div>

        {hasTeeSets ? (
          <div className="divide-y divide-gray-200">
            {teeSets.map((tee) => {
              const courseName = courseMap.get(tee.course_id) ?? "—";
              const displayName = tee.tee_name || tee.name || "Unnamed Tee";

              return (
                <div
                  key={tee.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {displayName}
                        <span className="text-xs font-normal text-gray-500">
                          • {courseName}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        <span className="inline-block">
                          Rating: <strong>{tee.rating ?? "—"}</strong>
                        </span>
                        <span className="inline-block ml-4">
                          Slope: <strong>{tee.slope ?? "—"}</strong>
                        </span>
                        <span className="inline-block ml-4">
                          Par: <strong>{tee.par ?? "—"}</strong>
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/courses/${tee.course_id}`}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View Course →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-3">No tee sets have been configured yet.</p>
            <Link
              href="/courses"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Courses
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
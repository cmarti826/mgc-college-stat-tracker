// app/courses/[id]/page.tsx

import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerSupabase();
  const courseId = params.id;

  const [
    { data: course, error: courseError },
    { data: teeSets, error: teeSetsError },
  ] = await Promise.all([
    supabase
      .from("courses")
      .select("id, name, city, state, created_at")
      .eq("id", courseId)
      .single(),
    supabase
      .from("tee_sets")
      .select("id, name, tee_name, rating, slope, par")
      .eq("course_id", courseId)
      .order("tee_name", { ascending: true }),
  ]);

  if (courseError || !course) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 font-medium">Course not found.</p>
        <Link
          href="/courses"
          className="mt-4 inline-block text-sm text-blue-600 hover:underline"
        >
          ← Back to Courses
        </Link>
      </div>
    );
  }

  const hasTeeSets = teeSets && teeSets.length > 0;
  const location = [course.city, course.state].filter(Boolean).join(", ") || "—";

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{course.name}</h1>
          <p className="mt-1 text-lg text-gray-600">
            {location}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Added on {format(new Date(course.created_at), "MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/tee-sets/new?course=${course.id}`}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
          >
            Add Tee Set
          </Link>
          <Link
            href="/courses"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Back
          </Link>
        </div>
      </div>

      {/* Tee Sets Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Tee Sets</h2>
          <span className="text-sm text-gray-500">
            {hasTeeSets
              ? `${teeSets.length} tee set${teeSets.length === 1 ? "" : "s"}`
              : "No tee sets"}
          </span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {hasTeeSets ? (
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tee Set
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Slope
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Par
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teeSets.map((tee) => {
                  const displayName = tee.tee_name || tee.name || "Unnamed";

                  return (
                    <tr
                      key={tee.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/tee-sets/${tee.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                        >
                          {displayName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {tee.rating ?? "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {tee.slope ?? "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {tee.par ?? "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Link
                          href={`/tee-sets/${tee.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                No tee sets have been added to this course yet.
              </p>
              <Link
                href={`/tee-sets/new?course=${course.id}`}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
              >
                Create First Tee Set
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Quick Stats */}
      {hasTeeSets && (
        <section className="bg-gray-50 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
            Quick Stats
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Total Tee Sets</p>
              <p className="text-xl font-bold text-gray-900">{teeSets.length}</p>
            </div>
            <div>
              <p className="text-gray-500">Avg Rating</p>
              <p className="text-xl font-bold text-gray-900">
                {teeSets.some((t) => t.rating)
                  ? (
                      teeSets.reduce((sum, t) => sum + (t.rating || 0), 0) /
                      teeSets.filter((t) => t.rating).length
                    ).toFixed(1)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Avg Slope</p>
              <p className="text-xl font-bold text-gray-900">
                {teeSets.some((t) => t.slope)
                  ? Math.round(
                      teeSets.reduce((sum, t) => sum + (t.slope || 0), 0) /
                        teeSets.filter((t) => t.slope).length
                    )
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Typical Par</p>
              <p className="text-xl font-bold text-gray-900">
                {teeSets.some((t) => t.par)
                  ? teeSets.find((t) => t.par)?.par ?? "—"
                  : "—"}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
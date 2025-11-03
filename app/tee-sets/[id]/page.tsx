// app/tee-sets/[id]/page.tsx

import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function TeeSetDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerSupabase();
  const teeSetId = params.id;

  let [
    { data: teeSet, error: teeSetError },
    { data: course, error: courseError },
    { data: holes, error: holesError },
  ] = await Promise.all([
    supabase
      .from("tee_sets")
      .select("id, course_id, name, tee_name, rating, slope, par, created_at")
      .eq("id", teeSetId)
      .single(),
    supabase
      .from("courses")
      .select("id, name, city, state")
      .eq("id", (await supabase.from("tee_sets").select("course_id").eq("id", teeSetId).single()).data?.course_id)
      .single(),
    supabase
      .from("tee_set_holes")
      .select("hole_number, yardage")
      .eq("tee_set_id", teeSetId)
      .order("hole_number", { ascending: true }),
  ]);

  // Fallback: fetch course via teeSet if direct failed
  if (!course && teeSet) {
    const { data: fallbackCourse } = await supabase
      .from("courses")
      .select("id, name, city, state")
      .eq("id", teeSet.course_id)
      .single();
    course = fallbackCourse;
  }

  if (teeSetError || !teeSet || courseError || !course) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 font-medium">Tee set not found.</p>
        <Link
          href="/tee-sets"
          className="mt-4 inline-block text-sm text-blue-600 hover:underline"
        >
          ← Back to Tee Sets
        </Link>
      </div>
    );
  }

  const displayName = teeSet.tee_name || teeSet.name || "Unnamed Tee Set";
  const location = [course.city, course.state].filter(Boolean).join(", ") || "—";
  const hasYardages = holes && holes.some((h) => h.yardage != null);
  const totalYardage = holes?.reduce((sum, h) => sum + (h.yardage || 0), 0) || 0;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{displayName}</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {teeSet.rating ? `CR ${teeSet.rating}` : "—"}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {teeSet.slope ? `SR ${teeSet.slope}` : "—"}
            </span>
          </div>
          <p className="mt-1 text-lg text-gray-600">
            <Link
              href={`/courses/${course.id}`}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {course.name}
            </Link>
            {location !== "—" && ` • ${location}`}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Created {format(new Date(teeSet.created_at), "MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/tee-sets/${teeSet.id}/edit`}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 transition-colors"
          >
            Edit Tee Set
          </Link>
          <Link
            href="/tee-sets"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Back
          </Link>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Course Rating
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {teeSet.rating ?? "—"}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Slope Rating
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {teeSet.slope ?? "—"}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Par
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {teeSet.par ?? "—"}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Total Yardage
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {hasYardages ? totalYardage.toLocaleString() : "—"}
          </p>
        </div>
      </div>

      {/* Hole-by-Hole Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Hole Yardages</h2>
          <span className="text-sm text-gray-500">
            {hasYardages
              ? "All 18 holes"
              : "No yardages set — edit to add"}
          </span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hole
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Yardage
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Par
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Array.from({ length: 18 }, (_, i) => i + 1).map((holeNum) => {
                const hole = holes?.find((h) => h.hole_number === holeNum);
                const yardage = hole?.yardage;

                return (
                  <tr
                    key={holeNum}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-700">
                      {holeNum}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {yardage != null ? yardage.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      Par{" "}
                      {teeSet.par
                        ? Math.round(teeSet.par / 18)
                        : yardage
                        ? yardage < 200
                          ? 3
                          : yardage < 450
                          ? 4
                          : 5
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Empty State */}
      {!hasYardages && (
        <div className="text-center py-10 bg-gray-50 rounded-xl">
          <p className="text-gray-600 mb-4">
            No yardages have been entered for this tee set.
          </p>
          <Link
            href={`/tee-sets/${teeSet.id}/edit`}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 transition-colors"
          >
            Add Yardages Now
          </Link>
        </div>
      )}
    </div>
  );
}
import { createServerSupabase() } from '@/lib/supabase';

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const supabase = createServerSupabase()();
  const { data: courses, error } = await supabase
    .from("courses")
    .select("id, name, city, state, created_at")
    .order("name", { ascending: true });

  if (error) return <div className="text-red-600">Error loading courses: {error.message}</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Courses</h1>
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="text-left p-3">Course</th>
              <th className="text-left p-3">Location</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {(courses ?? []).map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3">{c.name}</td>
                <td className="p-3">{[c.city, c.state].filter(Boolean).join(", ") || "—"}</td>
                <td className="p-3">{new Date(c.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {(!courses || courses.length === 0) && (
              <tr><td className="p-3" colSpan={3}>No courses.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
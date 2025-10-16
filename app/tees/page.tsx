import { createClient } from '@/lib/supabase/server';

export const dynamic = "force-dynamic";

export default async function TeesPage() {
  const supabase = createClient();
  const { data: tees, error } = await supabase
    .from("tees")
    .select("id, name, course_id, courses(name), rating, slope, par, created_at")
    .order("name", { ascending: true });

  if (error) return <div className="text-red-600">Error loading tees: {error.message}</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Tees</h1>
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="text-left p-3">Tee</th>
              <th className="text-left p-3">Course</th>
              <th className="text-left p-3">Par</th>
              <th className="text-left p-3">Rating</th>
              <th className="text-left p-3">Slope</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {(tees ?? []).map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-3">{t.name}</td>
                <td className="p-3">{t.courses?.name ?? t.course_id}</td>
                <td className="p-3">{t.par ?? "—"}</td>
                <td className="p-3">{t.rating ?? "—"}</td>
                <td className="p-3">{t.slope ?? "—"}</td>
                <td className="p-3">{t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
            {(!tees || tees.length === 0) && (
              <tr><td className="p-3" colSpan={6}>No tee sets.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// app/events/page.tsx

import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type RelName = { name: string | null } | null;

function relName(x: RelName): string {
  return x?.name ?? '—';
}

export default async function EventsPage() {
  const supabase = createServerSupabase();

  const { data: events, error } = await supabase
    .from('events') // ← Fixed: events
    .select(`
      id,
      name,
      start_date,
      end_date,
      team:team_id (name),
      course:course_id (name)
    `)
    .order('start_date', { ascending: false });

  if (error) {
    return (
      <div className="text-red-600 p-4">
        Error loading events: {error.message}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div>
        <h1 className="text-xl font-semibold mb-4">Events</h1>
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          No events found.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Events</h1>
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Dates</th>
              <th className="text-left p-3">Team</th>
              <th className="text-left p-3">Course</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e: any) => (
              <tr key={e.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-medium">
                  <Link href={`/events/${e.id}`} className="text-blue-600 hover:underline">
                    {e.name}
                  </Link>
                </td>
                <td className="p-3">
                  {e.start_date ? new Date(e.start_date).toLocaleDateString() : '—'}
                  {e.end_date && e.start_date !== e.end_date
                    ? ` – ${new Date(e.end_date).toLocaleDateString()}`
                    : ''}
                </td>
                <td className="p-3">{relName(e.team)}</td>
                <td className="p-3">{relName(e.course)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
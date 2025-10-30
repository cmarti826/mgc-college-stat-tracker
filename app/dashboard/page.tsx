// app/dashboard/page.tsx

import { createServerSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type Course = {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  created_at: string;
};

type Stats = {
  totalCourses: number;
  totalUsers: number;
  activeSessions: number;
};

export default async function DashboardPage() {
  const supabase = createServerSupabase();

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

// app/dashboard/page.tsx  (UPDATE THIS LINE)

if (!user) {
  redirect('/(auth)/login');  // ← CHANGE TO THIS
}
  // Fetch stats
  const [
    { count: totalCourses = 0 },
    { count: totalUsers = 0 },
    { data: courses = [] },
  ] = await Promise.all([
    supabase.from('mgc.courses').select('*', { count: 'exact', head: true }),
    supabase.from('auth.users').select('*', { count: 'exact', head: true }),
    supabase
      .from('mgc.courses')
      .select('id, name, city, state, created_at')
      .order('name', { ascending: true })
      .limit(5),
  ]);

  const stats: Stats = {
    totalCourses,
    totalUsers,
    activeSessions: 0, // Placeholder — track via Supabase Realtime or sessions table
  };

  const recentCourses = courses as Course[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500">
          Welcome, <span className="font-medium">{user.email}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{stats.totalCourses}</div>
          <div className="text-sm text-gray-600 mt-1">Total Courses</div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="text-2xl font-bold text-green-600">{stats.totalUsers}</div>
          <div className="text-sm text-gray-600 mt-1">Total Users</div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="text-2xl font-bold text-purple-600">{stats.activeSessions}</div>
          <div className="text-sm text-gray-600 mt-1">Active Sessions</div>
        </div>
      </div>

      {/* Recent Courses */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Recent Courses</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-medium text-gray-700">Course</th>
                <th className="text-left p-3 font-medium text-gray-700">Location</th>
                <th className="text-left p-3 font-medium text-gray-700">Created</th>
              </tr>
            </thead>
            <tbody>
              {recentCourses.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-3 text-center text-gray-500">
                    No courses yet.
                  </td>
                </tr>
              ) : (
                recentCourses.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      <Link
                        href={`/courses/${c.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="p-3 text-gray-600">
                      {[c.city, c.state].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="p-3 text-gray-600">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {recentCourses.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t">
            <Link
              href="/courses"
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              View all courses →
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Link
          href="/courses/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          Add New Course
        </Link>
        <Link
          href="/users"
          className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
        >
          Manage Users
        </Link>
      </div>
    </div>
  );
}
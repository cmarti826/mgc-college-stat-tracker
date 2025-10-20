// app/admin/page.tsx
import { createClient } from "@/lib/supabase/server";
import { createPlayer, createCourse, createTeeSet } from "./actions";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// This is a Server Component page. We DO NOT pass event handlers as props.
// We attach server actions directly on <form action={...}>.

export default async function AdminPage() {
  const supabase = createClient();

  // We'll show a few helpful lists to grab IDs when creating tee sets
  const [{ data: players }, { data: courses }, { data: teesets }] = await Promise.all([
    supabase.from("players").select("id, full_name").order("full_name", { ascending: true }),
    supabase.from("courses").select("id, name, city, state").order("name", { ascending: true }),
    supabase.from("tee_sets").select("id, name, course_id, par, rating, slope").order("name", { ascending: true }),
  ]);

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-10">
      <h1 className="text-2xl font-semibold">Admin</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Player */}
        <Card title="Create Player">
          <form action={createPlayer} className="space-y-3">
            <LabeledInput name="full_name" label="Full Name" placeholder="Jane Doe" required />
            <LabeledInput name="grad_year" label="Grad Year" placeholder="2027" type="number" />
            <Submit>Save Player</Submit>
          </form>
        </Card>

        {/* Create Course */}
        <Card title="Create Course">
          <form action={createCourse} className="space-y-3">
            <LabeledInput name="name" label="Course Name" placeholder="Pebble Ridge" required />
            <LabeledInput name="city" label="City" placeholder="Springfield" />
            <LabeledInput name="state" label="State" placeholder="CA" />
            <Submit>Save Course</Submit>
          </form>
        </Card>

        {/* Create Tee Set */}
        <Card title="Create Tee Set">
          <form action={createTeeSet} className="space-y-3">
            <LabeledInput name="course_id" label="Course ID" placeholder="paste course id..." required />
            <LabeledInput name="tee_name" label="Tee Name" placeholder="Blue" required />
            <LabeledInput name="par" label="Par" type="number" placeholder="72" required />
            <LabeledInput name="rating" label="Rating" type="number" step="0.1" placeholder="71.3" />
            <LabeledInput name="slope" label="Slope" type="number" placeholder="128" />
            <LabeledInput name="yards" label="Yards" type="number" placeholder="6820" />
            <Submit>Save Tee Set</Submit>
          </form>
        </Card>
      </div>

      {/* Helpful Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Players">
          <ul className="space-y-1">
            {(players ?? []).map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <span>{p.full_name}</span>
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">{p.id}</code>
              </li>
            ))}
            {(!players || players.length === 0) && <li className="text-sm text-gray-500">No players yet.</li>}
          </ul>
        </Card>

        <Card title="Courses">
          <ul className="space-y-1">
            {(courses ?? []).map((c) => (
              <li key={c.id} className="flex items-center justify-between">
                <span>
                  {c.name}
                  {c.city ? ` — ${c.city}` : ""}{c.state ? `, ${c.state}` : ""}
                </span>
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">{c.id}</code>
              </li>
            ))}
            {(!courses || courses.length === 0) && <li className="text-sm text-gray-500">No courses yet.</li>}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card title="Tee Sets">
          <ul className="space-y-1">
            {(teesets ?? []).map((t) => (
              <li key={t.id} className="flex items-center justify-between">
                <span>
                  {t.name} — par {t.par}
                  {t.rating ? `, rating ${t.rating}` : ""}
                  {t.slope ? `, slope ${t.slope}` : ""}{" "}
                  <Link href={`/courses`} className="text-blue-600 underline ml-2">
                    course:{t.course_id}
                  </Link>
                </span>
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">{t.id}</code>
              </li>
            ))}
            {(!teesets || teesets.length === 0) && <li className="text-sm text-gray-500">No tee sets yet.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}

function LabeledInput(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, className = "", ...rest } = props;
  return (
    <label className="block space-y-1">
      <span className="text-xs text-gray-600">{label}</span>
      <input
        className={`w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring ${className}`}
        {...rest}
      />
    </label>
  );
}

function Submit({ children }: { children: React.ReactNode }) {
  return (
    <button type="submit" className="rounded bg-black px-3 py-2 text-white text-sm hover:opacity-90">
      {children}
    </button>
  );
}

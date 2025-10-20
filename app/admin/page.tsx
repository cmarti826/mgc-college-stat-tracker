// app/admin/page.tsx
import { createClient } from "@/lib/supabase/server";
import {
  createPlayer,
  createCourse,
  createTeeSet,
  createTeam,
  addTeamMember,
  removeTeamMember,
  linkUserToPlayer,
  setDefaultTeam,
} from "./actions";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  const supabase = createClient();

  // pull basic lists (no embedded relations to avoid schema cache issues)
  const [
    { data: players },
    { data: courses },
    { data: teeSets },
    { data: teams },
    { data: teamMembers },
  ] = await Promise.all([
    supabase.from("players").select("id, full_name").order("full_name", { ascending: true }),
    supabase.from("courses").select("id, name, city, state").order("name", { ascending: true }),
    supabase.from("tee_sets").select("id, name, course_id, par, rating, slope").order("name", { ascending: true }),
    supabase.from("teams").select("id, name, school, created_at").order("name", { ascending: true }),
    supabase
      .from("team_members")
      .select("id, team_id, user_id, player_id, role, created_at")
      .order("created_at", { ascending: false }),
  ]);

  // group team members by team for display
  const membersByTeam = new Map<string, typeof teamMembers>();
  (teamMembers ?? []).forEach((m) => {
    const list = membersByTeam.get(m.team_id) ?? [];
    list.push(m);
    membersByTeam.set(m.team_id, list as any);
  });

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-10">
      <h1 className="text-2xl font-semibold">Admin</h1>

      {/* ---------- Creation forms row ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Players */}
        <Card title="Create Player">
          <form action={createPlayer} className="space-y-3">
            <LabeledInput name="full_name" label="Full Name" placeholder="Jane Doe" required />
            <LabeledInput name="grad_year" label="Grad Year" placeholder="2027" type="number" />
            <Submit>Save Player</Submit>
          </form>
        </Card>

        {/* Courses */}
        <Card title="Create Course">
          <form action={createCourse} className="space-y-3">
            <LabeledInput name="name" label="Course Name" placeholder="Pebble Ridge" required />
            <LabeledInput name="city" label="City" placeholder="Springfield" />
            <LabeledInput name="state" label="State" placeholder="CA" />
            <Submit>Save Course</Submit>
          </form>
        </Card>

        {/* Tee Set */}
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

      {/* ---------- Team management ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Team */}
        <Card title="Create Team">
          <form action={createTeam} className="space-y-3">
            <LabeledInput name="team_name" label="Team Name" placeholder="MGC Varsity" required />
            <LabeledInput name="school" label="School" placeholder="Midwest Golf College" />
            <Submit>Create Team</Submit>
          </form>
        </Card>

        {/* Add Team Member */}
        <Card title="Add Team Member">
          <form action={addTeamMember} className="space-y-3">
            <LabeledInput name="team_id" label="Team ID" placeholder="team uuid..." required />
            <LabeledInput name="user_id" label="User ID (optional)" placeholder="auth.users uuid..." />
            <LabeledInput name="player_id" label="Player ID (optional)" placeholder="players uuid..." />
            <LabeledInput name="role" label="Role" placeholder="player | coach | admin" />
            <Submit>Add Member</Submit>
          </form>
          <p className="mt-2 text-xs text-gray-500">
            Provide either <code>user_id</code> or <code>player_id</code> (or both). Defaults role to{" "}
            <code>player</code>.
          </p>
        </Card>

        {/* Remove Team Member */}
        <Card title="Remove Team Member">
          <form action={removeTeamMember} className="space-y-3">
            <LabeledInput name="member_id" label="Team Member ID" placeholder="team_members uuid..." required />
            <Submit>Remove Member</Submit>
          </form>
        </Card>
      </div>

      {/* ---------- Identity helpers ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Link User ↔ Player">
          <form action={linkUserToPlayer} className="space-y-3">
            <LabeledInput name="user_id" label="User ID" placeholder="auth.users uuid..." required />
            <LabeledInput name="player_id" label="Player ID" placeholder="players uuid..." required />
            <Submit>Link</Submit>
          </form>
          <p className="mt-2 text-xs text-gray-500">
            Writes to <code>user_players</code> (PK=user_id).
          </p>
        </Card>

        <Card title="Set Default Team (Profile)">
          <form action={setDefaultTeam} className="space-y-3">
            <LabeledInput name="user_id" label="User ID" placeholder="auth.users uuid..." required />
            <LabeledInput name="team_id" label="Team ID" placeholder="team uuid..." required />
            <Submit>Set Default Team</Submit>
          </form>
          <p className="mt-2 text-xs text-gray-500">
            Updates <code>profiles.default_team_id</code> for the given user.
          </p>
        </Card>
      </div>

      {/* ---------- Helpful lists ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Teams">
          <ul className="space-y-2">
            {(teams ?? []).map((t) => (
              <li key={t.id} className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-gray-600">
                    {t.school ?? "—"} · created {new Date(t.created_at).toLocaleString()}
                  </div>
                </div>
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">{t.id}</code>
              </li>
            ))}
            {(!teams || teams.length === 0) && (
              <li className="text-sm text-gray-500">No teams yet.</li>
            )}
          </ul>
        </Card>

        <Card title="Team Members (latest first)">
          <ul className="space-y-2">
            {(teamMembers ?? []).map((m) => (
              <li key={m.id} className="flex items-start justify-between">
                <div className="text-sm">
                  <div>
                    <span className="font-medium">{m.role}</span> — team:
                    <code className="ml-1 rounded bg-gray-100 px-1 py-0.5 text-xs">{m.team_id}</code>
                  </div>
                  <div className="text-xs text-gray-600">
                    user:
                    <code className="ml-1 rounded bg-gray-100 px-1 py-0.5 text-xs">
                      {m.user_id ?? "—"}
                    </code>{" "}
                    · player:
                    <code className="ml-1 rounded bg-gray-100 px-1 py-0.5 text-xs">
                      {m.player_id ?? "—"}
                    </code>{" "}
                    · {new Date(m.created_at).toLocaleString()}
                  </div>
                </div>
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">{m.id}</code>
              </li>
            ))}
            {(!teamMembers || teamMembers.length === 0) && (
              <li className="text-sm text-gray-500">No members yet.</li>
            )}
          </ul>
        </Card>
      </div>

      {/* quick links */}
      <div className="pt-4">
        <Link href="/teams" className="text-blue-600 underline">
          Go to Teams page
        </Link>
      </div>
    </div>
  );
}

/* --------------------------- UI bits --------------------------- */
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

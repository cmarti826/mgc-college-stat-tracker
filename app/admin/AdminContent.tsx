// app/admin/AdminContent.tsx
import { createServerSupabase } from "@/lib/supabase/server";
import {
  createPlayer,
  deletePlayer,
  createCourse,
  deleteCourse,
  createTeeSet,
  deleteTeeSet,
  createTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  linkUserToPlayer,
  setDefaultTeam,
  createRound,
  deleteRound,
} from "./actions";

export const dynamic = 'force-dynamic' // ← ADD THIS

export const revalidate = 0;

export default async function AdminContent() {
  const supabase = createServerSupabase();

  const [
    { data: players },
    { data: courses },
    { data: teeSets },
    { data: teams },
    { data: teamMembers },
    { data: profiles },
    { data: rounds },
  ] = await Promise.all([
    supabase.from("mgc.players").select("id, full_name, grad_year").order("full_name"),
    supabase.from("mgc.courses").select("id, name, city, state").order("name"),
    supabase.from("mgc.tee_sets").select("id, name, course_id, par, rating, slope").order("name"),
    supabase.from("mgc.teams").select("id, name, school, created_at").order("name"),
    supabase
      .from("mgc.team_members")
      .select("id, team_id, user_id, player_id, role, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, default_team_id").order("full_name"),
    supabase
      .from("mgc.scheduled_rounds")
      .select("id, date, player_id, course_id, tee_set_id, team_id, type, status, name, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-10">
      <h1 className="text-2xl font-semibold">Admin</h1>

      {/* ======== Create Entities ======== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Player + optional login */}
        <Card title="Create Player (optional login)">
          <form action={createPlayer} className="space-y-3">
            <LabeledInput name="full_name" label="Full Name" placeholder="Jane Doe" required />
            <LabeledInput name="grad_year" label="Grad Year" placeholder="2027" type="number" />
            <div className="mt-2 rounded border p-3">
              <div className="mb-2 text-xs font-semibold text-gray-700">
                Login (optional) — add email + temporary password to create an account now
              </div>
              <LabeledInput name="email" label="Email" placeholder="jane@example.com" type="email" />
              <LabeledInput
                name="temp_password"
                label="Temporary Password"
                placeholder="min 6 characters"
                type="password"
              />
            </div>
            <Submit>Create Player</Submit>
          </form>
          <p className="mt-2 text-xs text-gray-500">
            If you supply email + temporary password, we’ll create an <code>auth.user</code>, a <code>profiles</code>{" "}
            row, and link it to the new player in <code>user_players</code>.
          </p>
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
            <Select
              name="course_id"
              label="Course"
              required
              options={(courses ?? []).map((c) => ({
                value: c.id,
                label: `${c.name}${c.city ? ` — ${c.city}` : ""}${c.state ? `, ${c.state}` : ""}`,
              }))}
            />
            <LabeledInput name="tee_name" label="Tee Name" placeholder="Blue" required />
            <LabeledInput name="par" label="Par" type="number" placeholder="72" required />
            <LabeledInput name="rating" label="Rating" type="number" step="0.1" placeholder="71.3" />
            <LabeledInput name="slope" label="Slope" type="number" placeholder="128" />
            <LabeledInput name="yards" label="Yards" type="number" placeholder="6820" />
            <Submit>Save Tee Set</Submit>
          </form>
        </Card>
      </div>

      {/* ======== Team Management ======== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Create Team">
          <form action={createTeam} className="space-y-3">
            <LabeledInput name="team_name" label="Team Name" placeholder="MGC Varsity" required />
            <LabeledInput name="school" label="School" placeholder="Midwest Golf College" />
            <Submit>Create Team</Submit>
          </form>
        </Card>

        <Card title="Add Team Member (dropdowns)">
          <form action={addTeamMember} className="space-y-3">
            <Select
              name="team_id"
              label="Team"
              required
              options={(teams ?? []).map((t) => ({
                value: t.id,
                label: `${t.name}${t.school ? ` — ${t.school}` : ""}`,
              }))}
            />
            <Select
              name="player_id"
              label="Player (optional)"
              options={[
                { value: "", label: "— none —" },
                ...(players ?? []).map((p) => ({ value: p.id, label: p.full_name })),
              ]}
            />
            <Select
              name="user_id"
              label="User (from profiles, optional)"
              options={[
                { value: "", label: "— none —" },
                ...(profiles ?? []).map((u) => ({ value: u.id, label: u.full_name ?? u.id })),
              ]}
            />
            <Select
              name="role"
              label="Role"
              options={[
                { value: "player", label: "player" },
                { value: "coach", label: "coach" },
                { value: "admin", label: "admin" },
              ]}
            />
            <Submit>Add Member</Submit>
          </form>
          <p className="mt-2 text-xs text-gray-500">Provide a Team, then a Player and/or a User.</p>
        </Card>

        <Card title="Identity Helpers">
          <div className="space-y-4">
            <form action={linkUserToPlayer} className="space-y-3">
              <Select
                name="user_id"
                label="User"
                required
                options={(profiles ?? []).map((u) => ({ value: u.id, label: u.full_name ?? u.id }))}
              />
              <Select
                name="player_id"
                label="Player"
                required
                options={(players ?? []).map((p) => ({ value: p.id, label: p.full_name }))}
              />
              <Submit>Link User to Player</Submit>
            </form>

            <form action={setDefaultTeam} className="space-y-3">
              <Select
                name="user_id"
                label="User"
                required
                options={(profiles ?? []).map((u) => ({ value: u.id, label: u.full_name ?? u.id }))}
              />
              <Select
                name="team_id"
                label="Default Team"
                required
                options={(teams ?? []).map((t) => ({ value: t.id, label: t.name }))}
              />
              <Submit>Set Default Team</Submit>
            </form>
          </div>
        </Card>
      </div>

      {/* ======== Rounds ======== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Create Round">
          <form action={createRound} className="space-y-3">
            <Select
              name="player_id"
              label="Player"
              required
              options={(players ?? []).map((p) => ({ value: p.id, label: p.full_name }))}
            />
            <Select
              name="team_id"
              label="Team (optional)"
              options={[
                { value: "", label: "— none —" },
                ...(teams ?? []).map((t) => ({ value: t.id, label: t.name })),
              ]}
            />
            <Select
              name="course_id"
              label="Course"
              required
              options={(courses ?? []).map((c) => ({
                value: c.id,
                label: `${c.name}${c.city ? ` — ${c.city}` : ""}${c.state ? `, ${c.state}` : ""}`,
              }))}
            />
            <Select
              name="tee_set_id"
              label="Tee Set"
              required
              options={(teeSets ?? []).map((t) => ({
                value: t.id,
                label: `${t.name} (par ${t.par}) · course ${t.course_id}`,
              }))}
            />
            <LabeledInput name="date" label="Date" type="date" />
            <LabeledInput name="name" label="Name (optional)" placeholder="Practice Round" />
            <LabeledInput name="type" label="Type (optional)" placeholder="practice | tournament | qualifying" />
            <LabeledInput name="status" label="Status (optional)" placeholder="scheduled | in_progress | complete" />
            <LabeledInput name="notes" label="Notes (optional)" placeholder="windy, cart path only..." />
            <Submit>Create Round</Submit>
          </form>
        </Card>

        <Card title="Recent Rounds (delete)">
          <ul className="divide-y">
            {(rounds ?? []).map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium">
                    {r.name ?? "Round"} · {r.date ?? "—"} · {r.type ?? "—"} · {r.status ?? "—"}
                  </div>
                  <div className="text-xs text-gray-600">
                    player:{r.player_id} · team:{r.team_id ?? "—"} · course:{r.course_id} · tee:{r.tee_set_id}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={`/rounds/${r.id}`} className="rounded border px-2 py-1 text-xs hover:bg-gray-50">
                    View
                  </a>
                  <form action={deleteRound}>
                    <input type="hidden" name="id" value={r.id} />
                    <DangerSmall>Delete</DangerSmall>
                  </form>
                </div>
              </li>
            ))}
            {(!rounds || rounds.length === 0) && (
              <li className="py-2 text-sm text-gray-500">No rounds yet.</li>
            )}
          </ul>
        </Card>
      </div>

      {/* ======== Lists with Delete buttons ======== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Players">
          <ul className="divide-y">
            {(players ?? []).map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium">{p.full_name}</div>
                  <div className="text-xs text-gray-600">grad: {p.grad_year ?? "—"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">{p.id}</code>
                  <form action={deletePlayer}>
                    <input type="hidden" name="id" value={p.id} />
                    <Danger>Delete</Danger>
                  </form>
                </div>
              </li>
            ))}
            {(!players || players.length === 0) && <li className="py-2 text-sm text-gray-500">No players yet.</li>}
          </ul>
        </Card>

        <Card title="Courses">
          <ul className="divide-y">
            {(courses ?? []).map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-gray-600">
                    {c.city ?? "—"}
                    {c.state ? `, ${c.state}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">{c.id}</code>
                  <form action={deleteCourse}>
                    <input type="hidden" name="id" value={c.id} />
                    <Danger>Delete</Danger>
                  </form>
                </div>
              </li>
            ))}
            {(!courses || courses.length === 0) && <li className="py-2 text-sm text-gray-500">No courses yet.</li>}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Tee Sets">
          <ul className="divide-y">
            {(teeSets ?? []).map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium">
                    {t.name} — par {t.par}
                  </div>
                  <div className="text-xs text-gray-600">
                    rating {t.rating ?? "—"}, slope {t.slope ?? "—"} · course {t.course_id}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">{t.id}</code>
                  <form action={deleteTeeSet}>
                    <input type="hidden" name="id" value={t.id} />
                    <Danger>Delete</Danger>
                  </form>
                </div>
              </li>
            ))}
            {(!teeSets || teeSets.length === 0) && <li className="py-2 text-sm text-gray-500">No tee sets yet.</li>}
          </ul>
        </Card>

        <Card title="Teams & Members">
          <ul className="divide-y">
            {(teams ?? []).map((t) => (
              <li key={t.id} className="py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-gray-600">{t.school ?? "—"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">{t.id}</code>
                    <form action={deleteTeam}>
                      <input type="hidden" name="id" value={t.id} />
                      <Danger>Delete</Danger>
                    </form>
                  </div>
                </div>

                {/* Members for this team */}
                <div className="ml-2 mt-2 border-l pl-3">
                  {(teamMembers ?? [])
                    .filter((m) => m.team_id === t.id)
                    .map((m) => (
                      <div key={m.id} className="flex items-center justify-between py-1 text-sm">
                        <div>
                          <span className="font-medium">{m.role}</span>{" "}
                          <span className="text-gray-600">
                            user:{m.user_id ?? "—"} · player:{m.player_id ?? "—"}
                          </span>
                        </div>
                        <form action={removeTeamMember}>
                          <input type="hidden" name="member_id" value={m.id} />
                          <DangerSmall>Remove</DangerSmall>
                        </form>
                      </div>
                    ))}
                  {(teamMembers ?? []).filter((m) => m.team_id === t.id).length === 0 && (
                    <div className="py-1 text-xs text-gray-500">No members.</div>
                  )}
                </div>
              </li>
            ))}
            {(!teams || teams.length === 0) && <li className="py-2 text-sm text-gray-500">No teams yet.</li>}
          </ul>
        </Card>
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

function LabeledInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }
) {
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

function Select({
  label,
  options,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-gray-600">{label}</span>
      <select
        className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring bg-white"
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value ?? o.label} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Submit({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="rounded bg-black px-3 py-2 text-white text-sm hover:opacity-90"
    >
      {children}
    </button>
  );
}

function Danger({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="rounded bg-red-600 px-3 py-2 text-white text-sm hover:opacity-90"
    >
      {children}
    </button>
  );
}

function DangerSmall({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="rounded bg-red-600 px-2 py-1 text-white text-xs hover:opacity-90"
    >
      {children}
    </button>
  );
}
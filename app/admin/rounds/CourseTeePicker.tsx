// app/admin/rounds/CourseTeePicker.tsx
"use client";

type Course = { id: string; name: string };
type TeeSet = { id: string; name: string; course_id: string };

export default function CourseTeePicker({
  courses,
  tee_sets,
}: {
  courses: Course[];
  tee_sets: TeeSet[];
}) {
  return (
    <>
      <div>
        <label className="block text-sm">Course</label>
        <select
          name="course_id"
          className="w-full border rounded p-2"
          onChange={(e) => {
            const hidden = document.getElementById("hidden-course-id") as HTMLInputElement;
            if (hidden) hidden.value = e.target.value;
          }}
          required
        >
          <option value="">Select course…</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm">Tee Set</label>
        <select
          name="tee_set_id"
          className="w-full border rounded p-2"
          onChange={(e) => {
            const hidden = document.getElementById("hidden-tee-set-id") as HTMLInputElement;
            if (hidden) hidden.value = e.target.value;
          }}
          required
        >
          <option value="">Select tee set…</option>
          {tee_sets.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
    </>
  );
}
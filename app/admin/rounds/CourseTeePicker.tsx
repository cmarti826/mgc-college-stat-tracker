// app/admin/rounds/CourseTeePicker.tsx
"use client";

type Course = { id: string; name: string };
type TeeSet = { id: string; name: string; course_id: string };

export default function CourseTeePicker({
  courses,
  tee_sets,
  fieldName = "tee_set_id",
}: {
  courses: Course[];
  tee_sets: TeeSet[];
  fieldName?: string;
}) {
  return (
    <>
      <div>
        <label className="block text-sm">Course</label>
        <select
          name="course_id"
          className="w-full border rounded p-2"
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
          name={fieldName}
          className="w-full border rounded p-2"
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
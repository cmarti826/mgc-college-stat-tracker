// app/admin/rounds/CourseTeePicker.tsx
"use client";

type Course = { id: string; name: string };
type TeeSet = { id: string; name: string; course_id: string };

export default function CourseTeePicker({
  courses,
  tee_sets,
  initialCourseId,
  fieldName = "tee_set_id",
  onCourseChange,
  onTeeChange,
}: {
  courses: Course[];
  tee_sets: TeeSet[];
  initialCourseId?: string;
  fieldName?: string;
  onCourseChange?: (id: string) => void;
  onTeeChange?: (id: string) => void;
}) {
  return (
    <>
      <div>
        <label className="block text-sm">Course</label>
        <select
          className="w-full border rounded p-2"
          defaultValue={initialCourseId || ""}
          onChange={(e) => onCourseChange?.(e.target.value)}
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
          onChange={(e) => onTeeChange?.(e.target.value)}
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
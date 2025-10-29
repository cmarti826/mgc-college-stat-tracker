// app/admin/rounds/CourseTeePicker.tsx
"use client";

import { useMemo, useState } from "react";

type Option = { id: string; name: string; course_id?: string | null };

export const dynamic = 'force-dynamic' // ← ADD THIS

export default function CourseTeePicker({
  courses,
  tees,
  initialCourseId,
  fieldName = "tee_set_id", // default to tee_set_id
}: {
  courses: Option[];
  tees: Option[];                // pass tee sets here
  initialCourseId?: string;
  fieldName?: string;            // allow override (e.g., "tee_id" if needed)
}) {
  const [courseId, setCourseId] = useState<string | undefined>(initialCourseId);

  const filteredTees = useMemo(() => {
    if (!courseId) return tees;
    return (tees ?? []).filter((t) => !t.course_id || t.course_id === courseId);
  }, [tees, courseId]);

  return (
    <>
      <div>
        <label className="block text-sm">Course</label>
        <select
          name="course_id"
          className="w-full border rounded p-2"
          value={courseId ?? ""}
          onChange={(e) => setCourseId(e.target.value || undefined)}
          required
        >
          <option value="">Select course…</option>
          {(courses ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm">Tee Set</label>
        <select name={fieldName} className="w-full border rounded p-2" required>
          <option value="">Select tee set…</option>
          {filteredTees.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";

type Option = { id: string; name: string; course_id?: string };

export default function CourseTeePicker({
  courses,
  tees,
  initialCourseId,
}: {
  courses: Option[];
  tees: (Option & { course_id: string })[];
  initialCourseId?: string | null;
}) {
  const [courseId, setCourseId] = useState<string>(() => initialCourseId || courses[0]?.id || "");
  const [teeId, setTeeId] = useState<string>("");

  const teesForCourse = useMemo(
    () => tees.filter((t) => t.course_id === courseId),
    [tees, courseId]
  );

  // ensure a valid tee is selected whenever course changes
  useEffect(() => {
    if (!teesForCourse.find((t) => t.id === teeId)) {
      setTeeId(teesForCourse[0]?.id || "");
    }
  }, [courseId, teesForCourse, teeId]);

  return (
    <>
      {/* Course */}
      <div>
        <label className="block text-sm">Course</label>
        <select
          name="course_id"
          className="w-full border rounded p-2"
          required
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tee (filtered by course) */}
      <div>
        <label className="block text-sm">Tee</label>
        <select
          name="tee_id"
          className="w-full border rounded p-2"
          required
          value={teeId}
          onChange={(e) => setTeeId(e.target.value)}
          disabled={teesForCourse.length === 0}
        >
          {teesForCourse.length === 0 ? (
            <option value="">No tees for course</option>
          ) : (
            teesForCourse.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))
          )}
        </select>
      </div>
    </>
  );
}

// src\pages\entryPage\timetable\columns.ts
import { type MRT_ColumnDef } from "material-react-table";

import { type SheetRow } from "@/src/lib/googleSheet";

/* —— column order definition —— */
const COLUMN_ORDER: { key: keyof SheetRow; title: string }[] = [
  { key: "course_code", title: "Course code" },
  { key: "course_name", title: "Course name" },
  { key: "section", title: "Section" },
  { key: "credit_hours", title: "Credit hours" },
  { key: "students_in_section", title: "Enrolled" },
  { key: "max_students", title: "Max Students" },
  { key: "level", title: "Level" },
  { key: "section_type", title: "Section type" },
  { key: "course_language", title: "Course language" },
  { key: "room_capacity", title: "Room capacity" },
  // { key: "instructor_code", title: "Instructor code" },
  { key: "instructor", title: "Instructor" },
  { key: "day", title: "Day" },
  { key: "start_time", title: "Time start" },
  { key: "end_time", title: "Time end" },
  { key: "hall", title: "Hall" },
  { key: "building", title: "Building" },
  { key: "college", title: "College" },
  { key: "department", title: "Department" },
  { key: "exam_date", title: "Exam Date" },
  { key: "exam_day", title: "Exam Day" },
  { key: "exam_start_time", title: "Exam Start" },
  { key: "exam_end_time", title: "Exam End" },
  { key: "exam_building", title: "Exam Building" },
  { key: "exam_hall", title: "Exam Hall" },
];

/* ———————————————————————————————————————————
   Build columns from shared COLUMN_ORDER
   ——————————————————————————————————————————— */
export function buildScheduleColumns(): MRT_ColumnDef<SheetRow>[] {
  return COLUMN_ORDER.map(({ key, title }) => ({
    header: title,
    accessorKey: key,
    minSize: 100,
    size:
      key === "course_code" || key === "section"
        ? 150
        : key === "course_name" || key === "instructor"
          ? 350
          : key === "college" || key === "department"
            ? 300
            : key === "exam_building" || key === "exam_hall"
              ? 220
              : key === "course_language" || key === "room_capacity"
                ? 220
                : 200,
  }));
}

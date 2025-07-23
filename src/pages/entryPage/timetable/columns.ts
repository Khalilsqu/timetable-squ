// src\pages\entryPage\timetable\columns.ts
import { type MRT_ColumnDef } from "material-react-table";

import { type SheetRow } from "@/src/lib/googleSheet";

/* —— column order definition —— */
const COLUMN_ORDER: { key: keyof SheetRow; title: string }[] = [
  { key: "course_code", title: "Course code" },
  { key: "course_name", title: "Course name" },
  { key: "section", title: "Section" },
  { key: "instructor", title: "Instructor" },
  { key: "day", title: "Day" },
  { key: "start_time", title: "Time start" },
  { key: "end_time", title: "Time end" },
  { key: "hall", title: "Hall" },
  { key: "building", title: "Building" },
  { key: "college", title: "College" },
  { key: "department", title: "Department" },
  { key: "exam_day", title: "Exam day" },
  { key: "exam_date", title: "Exam date" },
  { key: "exam_start_time", title: "Exam start" },
  { key: "exam_end_time", title: "Exam end" },
];

/* ———————————————————————————————————————————
   Build columns from shared COLUMN_ORDER
   ——————————————————————————————————————————— */
export function buildScheduleColumns(): MRT_ColumnDef<SheetRow>[] {
  return COLUMN_ORDER.map(({ key, title }) => ({
    header: title,
    accessorKey: key,
    size:
      key === "course_code" || key === "section"
        ? 110
        : key === "course_name" || key === "instructor"
        ? 200
        : 140,
  }));
}


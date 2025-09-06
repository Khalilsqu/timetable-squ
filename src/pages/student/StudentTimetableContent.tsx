// src/pages/student/StudentTimetableContent.tsx
import { Box, Typography, Stack } from "@mui/material";
import { useMemo } from "react";
import AllowConflictsToggle from "@/src/pages/student/AllowConflictsToggle";

import { useFilterStore } from "@/src/stores/filterStore";
import {
  useTimetableStore,
  type SectionOpt,
} from "@/src/stores/studentTableStore";

import MyCustomSpinner from "@/src/components/MyCustomSpinner";
import WeeklySchedule from "@/src/components/WeeklySchedule";
import SectionSearch from "@/src/pages/student/SectionSearch";
import SelectedCourseChips from "@/src/pages/student/SelectedCourseChips";
import TimetableSummaryTable from "@/src/pages/student/TimetableSummaryTable";

import type { SheetRow } from "@/src/lib/googleSheet";
import type { Row } from "@/src/pages/student/TimetableSummaryTable";
import { useScheduleRows, useSemesters } from "@/src/lib/queries";
/* ─────────── helper fns ─────────── */
type ExamSlot = { date: string; start: string; end: string };
type MeetingSlot = { day: string; start: string; end: string; hall: string };

const toMin = (hms: string) => {
  const [h, m, s = 0] = hms.split(":").map(Number);
  return h * 60 + m + s / 60;
};

const meetingClash = (a: MeetingSlot, b: MeetingSlot) =>
  a.day.toUpperCase() === b.day.toUpperCase() &&
  toMin(a.start) < toMin(b.end) &&
  toMin(b.start) < toMin(a.end);

const examClash = (a: ExamSlot, b: ExamSlot) =>
  a.date === b.date &&
  toMin(a.start) < toMin(b.end) &&
  toMin(b.start) < toMin(a.end);

const conflictReason = (opt: SectionOpt, chosen: SectionOpt[]) => {
  if (chosen.some((c) => c.id === opt.id)) return "already selected";

  const lectures = opt.slots
    .filter((slot) =>
      chosen.some((c) => c.slots.some((s) => meetingClash(s, slot)))
    )
    .map((slot) => `${slot.day.toUpperCase()}:${slot.start}–${slot.end}`);

  const exam = opt.exam;
  const exams =
    exam && chosen.some((c) => c.exam && examClash(c.exam, exam))
      ? [`Exam ${exam.date} ${exam.start}–${exam.end}`]
      : [];

  const all = [...lectures, ...exams];
  return all.length ? all.join(", ") : null;
};

/* ─────────── component ─────────── */
export default function StudentTimetableContent() {
  const {
    data: semData,
    isLoading: semLoading,
    error: semError,
  } = useSemesters();

  /* store-selected semester takes priority over the active one */
  const semesterFromStore = useFilterStore((s) => s.semester);
  const semester = semesterFromStore || semData?.active || "";

  const {
    data: rows = [],
    isLoading: rowsLoading,
    error: rowsError,
  } = useScheduleRows(semester);

  /* 3️⃣  build SectionOpt list ---------------------------------------- */
  const sections = useMemo<SectionOpt[]>(() => {
    const map: Record<string, SectionOpt> = {};

    rows.forEach((r) => {
      const code = String(r.course_code ?? "");
      const sec = String(r.section ?? "");
      if (!code || !sec || !r.day || !r.start_time || !r.end_time) return;

      const id = `${code}-${sec}`;

      if (!map[id]) {
        map[id] = {
          id,
          label: `${code} (${sec})`,
          slots: [],
          exam:
            r.exam_date && r.exam_start_time && r.exam_end_time
              ? {
                  date: String(r.exam_date),
                  start: String(r.exam_start_time),
                  end: String(r.exam_end_time),
                }
              : undefined,
        };
      }

      map[id].slots.push({
        day: String(r.day).trim(),
        start: String(r.start_time).trim(),
        end: String(r.end_time).trim(),
        hall: String(r.hall ?? ""),
      });
    });

    return Object.values(map);
  }, [rows]);

  /* 4️⃣  timetable store ---------------------------------------------- */
  const { chosen, pick, remove, allowConflicts } = useTimetableStore();

  /* 5️⃣  weekly grid rows --------------------------------------------- */
  const scheduleData = useMemo<SheetRow[]>(() => {
    const out: SheetRow[] = [];

    chosen.forEach((c) => {
      const template = rows.find((r) => {
        const id = `${r.course_code}-${r.section}`;
        return id === c.id;
      });
      if (!template) return;

      c.slots.forEach((slot) => {
        out.push({
          ...template,
          day: slot.day.toUpperCase(),
          start_time: slot.start,
          end_time: slot.end,
          hall: slot.hall,
        } as SheetRow);
      });
    });

    return out;
  }, [chosen, rows]);

  /* 6️⃣  summary table rows --------------------------------------------- */
  const summaryRows = useMemo<Row[]>(
    () =>
      chosen.map((c) => {
        const [code] = c.label.split(" (");
        const section = c.label.match(/\((.+)\)/)?.[1] ?? "—";

        const ref = rows.find((r) => `${r.course_code}-${r.section}` === c.id);

        return {
          code,
          courseName: String(ref?.course_name ?? "—"), // ← stringify
          section,
          instructor: String(ref?.instructor ?? "—"), // ← stringify
          examDate: c.exam
            ? `${c.exam.date} @ ${c.exam.start}–${c.exam.end}`
            : "—",
        };
      }),
    [chosen, rows]
  );

  /* 7️⃣  loading / error states --------------------------------------- */
  if (semLoading || rowsLoading) return <MyCustomSpinner />;

  if (semError)
    return (
      <Typography color="error">
        Failed to load semester list: {String(semError)}
      </Typography>
    );

  if (rowsError)
    return (
      <Typography color="error">
        Failed to load timetable data: {String(rowsError)}
      </Typography>
    );

  /* 8️⃣  render -------------------------------------------------------- */
  return (
    <Box p={2}>
      <Stack
        direction={{ xs: "column", lg: "row" }}
        alignItems={{ xs: "flex-start", lg: "center" }}
        spacing={2}
      >
        {/* search */}
        <Box flex={1} width="100%">
          <SectionSearch
            sections={sections}
            chosen={chosen}
            onPick={pick}
            getConflictReason={allowConflicts ? () => null : conflictReason}
            loading={rowsLoading}
          />
        </Box>
        <AllowConflictsToggle />
      </Stack>

      {/* chips */}
      <SelectedCourseChips chosen={chosen} onRemove={remove} />

      {/* weekly grid / empty state */}
      {scheduleData.length ? (
        <WeeklySchedule
          data={scheduleData}
          semester={semester}
          hideInstructor
          hideTooltip
        />
      ) : (
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mt: 4, textAlign: "center" }}
        >
          Your schedule is empty.
        </Typography>
      )}

      {/* summary */}
      <TimetableSummaryTable rows={summaryRows} />
    </Box>
  );
}

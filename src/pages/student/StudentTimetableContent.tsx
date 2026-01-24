// src/pages/student/StudentTimetableContent.tsx
import {
  Box,
  Typography,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { useMemo, useState } from "react";
import AllowConflictsToggle from "@/src/pages/student/AllowConflictsToggle";

import { useFilterStore } from "@/src/stores/filterStore";
import {
  useTimetableStore,
  type SectionOpt,
} from "@/src/stores/studentTableStore";

import MyCustomSpinner from "@/src/components/MyCustomSpinner";
import FinalExamSchedule from "@/src/components/FinalExamSchedule";
import WeeklySchedule from "@/src/components/WeeklySchedule";
import SectionSearch from "@/src/pages/student/SectionSearch";
import SelectedCourseChips from "@/src/pages/student/SelectedCourseChips";
import TimetableSummaryTable from "@/src/pages/student/TimetableSummaryTable";
import { useNotificationStore } from "@/src/stores/notificationStore";

import type { SheetRow } from "@/src/lib/googleSheet";
import type { Row } from "@/src/pages/student/TimetableSummaryTable";
import { useScheduleRows, useSemesters } from "@/src/lib/queries";
/* ─────────── helper fns ─────────── */
type ExamSlot = { date: string; start: string; end: string };
type MeetingSlot = { day: string; start: string; end: string; hall: string };

const DAY_ORDER: Record<string, string> = {
  sun: "SUN",
  sunday: "SUN",
  mon: "MON",
  monday: "MON",
  tue: "TUE",
  tues: "TUE",
  tuesday: "TUE",
  wed: "WED",
  weds: "WED",
  wednesday: "WED",
  thu: "THU",
  thur: "THU",
  thurs: "THU",
  thursday: "THU",
  fri: "FRI",
  friday: "FRI",
  sat: "SAT",
  saturday: "SAT",
};

const canonicalDay3 = (raw: unknown): string | null => {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toLowerCase();
  return DAY_ORDER[key] ?? null;
};

const extractCanonicalDays3 = (raw: unknown): string[] => {
  if (typeof raw !== "string") return [];
  const parts = raw.split(/[^A-Za-z]+/).filter(Boolean);
  const uniq: string[] = [];
  for (const p of parts) {
    const c = canonicalDay3(p);
    if (c && !uniq.includes(c)) uniq.push(c);
  }
  return uniq;
};

const isHHMM = (s: string) => /^\d{2}:\d{2}$/.test(s);

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

const courseCodeOf = (opt: SectionOpt) =>
  opt.label.split(" (")[0]?.trim() || "";
const sectionOf = (opt: SectionOpt) => opt.label.match(/\((.+)\)/)?.[1] ?? "";

const duplicateCourseReason = (opt: SectionOpt, chosen: SectionOpt[]) => {
  const code = courseCodeOf(opt);
  if (!code) return null;

  const already = chosen.find((c) => courseCodeOf(c) === code);
  if (!already) return null;

  const sec = sectionOf(already);
  return sec ? `already selected in section ${sec}` : "already selected";
};

const conflictReason = (opt: SectionOpt, chosen: SectionOpt[]) => {
  const dup = duplicateCourseReason(opt, chosen);
  if (dup) return dup;

  const lectures = opt.slots
    .filter((slot) =>
      chosen.some((c) => c.slots.some((s) => meetingClash(s, slot))),
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
  const [view, setView] = useState<"lectures" | "exams">("lectures");

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
  const showWarning = useNotificationStore((s) => s.showWarning);

  const onPickUniqueCourse = (sec: SectionOpt) => {
    const code = courseCodeOf(sec);
    if (!code) {
      pick(sec);
      return;
    }

    const already = chosen.find((c) => courseCodeOf(c) === code);
    if (already && already.id !== sec.id) {
      const alreadySec = sectionOf(already);
      const nextSec = sectionOf(sec);
      const msg =
        alreadySec && nextSec && nextSec !== alreadySec
          ? `${code} already selected in section ${alreadySec} (can't also pick section ${nextSec}).`
          : alreadySec
            ? `${code} already selected in section ${alreadySec}.`
            : `${code} already selected.`;
      showWarning(msg);
      return;
    }

    pick(sec);
  };

  /* 5️⃣  weekly grid rows --------------------------------------------- */
  const scheduleData = useMemo<SheetRow[]>(() => {
    const chosenIds = new Set(chosen.map((c) => c.id));
    if (chosenIds.size === 0) return [];

    const out: SheetRow[] = [];

    rows.forEach((r) => {
      const id = `${r.course_code}-${r.section}`;
      if (!chosenIds.has(id)) return;

      const start = String(r.start_time ?? "")
        .trim()
        .slice(0, 5);
      const end = String(r.end_time ?? "")
        .trim()
        .slice(0, 5);
      if (!isHHMM(start) || !isHHMM(end)) return;

      const hall = String(r.hall ?? "TBA").trim() || "TBA";
      const days = extractCanonicalDays3(r.day);
      if (days.length === 0) return;

      days.forEach((day) => {
        out.push({
          ...r,
          day,
          start_time: start,
          end_time: end,
          hall,
        } as SheetRow);
      });
    });

    return out;
  }, [chosen, rows]);

  /* 5️⃣b final exam view rows ------------------------------------------- */
  // Pass all rows for the selected sections so the exam view can show
  // instructors from other sessions (LEC/LAB) in the same section.
  const finalExamRows = useMemo<SheetRow[]>(() => {
    const chosenIds = new Set(chosen.map((c) => c.id));
    if (chosenIds.size === 0) return [];

    return rows.filter((r) => {
      const id = `${String(r.course_code ?? "").trim()}-${String(r.section ?? "").trim()}`;
      return chosenIds.has(id);
    });
  }, [chosen, rows]);

  const viewToggle = (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={view}
      onChange={(_, next) => {
        if (next) setView(next);
      }}
      aria-label="schedule view"
    >
      <ToggleButton value="lectures" aria-label="lectures view">
        Lectures
      </ToggleButton>
      <ToggleButton value="exams" aria-label="final exams view">
        Final Exams
      </ToggleButton>
    </ToggleButtonGroup>
  );

  /* 6️⃣  summary table rows --------------------------------------------- */
  const summaryRows = useMemo<Row[]>(
    () =>
      chosen.map((c) => {
        const [code] = c.label.split(" (");
        const section = c.label.match(/\((.+)\)/)?.[1] ?? "—";

        const refs = rows.filter(
          (r) => `${r.course_code}-${r.section}` === c.id,
        );
        const first = refs[0];
        const instructors = Array.from(
          new Set(
            refs
              .map((r) => String(r?.instructor ?? "").trim())
              .filter((s) => s.length > 0),
          ),
        );
        const instructor =
          instructors.length === 0
            ? "—"
            : instructors.length === 1
              ? instructors[0]
              : instructors.length <= 3
                ? instructors.join(" / ")
                : `Multiple (${instructors.length})`;

        return {
          code,
          courseName: String(first?.course_name ?? "—"), // ← stringify
          section,
          instructor,
          examDate: c.exam
            ? `${c.exam.date} @ ${c.exam.start}–${c.exam.end}`
            : "—",
        };
      }),
    [chosen, rows],
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
            onPick={onPickUniqueCourse}
            getConflictReason={
              allowConflicts ? duplicateCourseReason : conflictReason
            }
            loading={rowsLoading}
          />
        </Box>
        <AllowConflictsToggle />
      </Stack>

      {/* chips */}
      <SelectedCourseChips chosen={chosen} onRemove={remove} />

      {/* schedule view */}
      {view === "lectures" ? (
        scheduleData.length ? (
          <WeeklySchedule
            data={scheduleData}
            semester={semester}
            hideTooltip
            headerLeft={viewToggle}
          />
        ) : (
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mt: 4, textAlign: "center" }}
          >
            Your schedule is empty.
          </Typography>
        )
      ) : (
        <FinalExamSchedule
          data={finalExamRows}
          department="Selected Courses"
          semester={semester}
          headerLeft={viewToggle}
        />
      )}

      {/* summary */}
      <TimetableSummaryTable rows={summaryRows} />
    </Box>
  );
}

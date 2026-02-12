// src/pages/student/DepartmentTimetable.tsx
import { useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router";
import {
  Box,
  Autocomplete,
  TextField,
  Typography,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
// CloseIcon now used inside DepartmentFilterDrawer

import WeeklySchedule from "@/src/components/WeeklySchedule";
import MyCustomSpinner from "@/src/components/MyCustomSpinner";
import PageTransition from "@/src/components/layout/PageTransition";
import FinalExamSchedule from "@/src/components/FinalExamSchedule";

import { useSemesters, useScheduleRows } from "@/src/lib/queries";
import { useFilterStore } from "@/src/stores/filterStore";
import { useDepartmentFilterStore } from "@/src/stores/departmentFilterStore";
import DepartmentFilterDrawer from "@/src/pages/department/DepartmentFilterDrawer";
// showExams state moved to URL search params; store import removed

import type { SheetRow } from "@/src/lib/googleSheet";

/* ───────────── helper: URL helpers ───────────── */
const getParam = (sp: URLSearchParams, k: string) => sp.get(k) ?? undefined;
// React-Router's type (simplified):

type SetSearchParams = (
  nextInit: URLSearchParams,
  opts?: { replace?: boolean },
) => void;

const setParam = (
  sp: URLSearchParams,
  k: string,
  v: string | undefined,
  replaceFn: SetSearchParams, //
) => {
  const next = new URLSearchParams(sp);

  if (v) {
    next.set(k, v); //
  } else {
    next.delete(k);
  }

  replaceFn(next, { replace: true }); //
};

/* ───────────────── component ─────────────────── */
interface DepartmentOpt {
  department: string;
  college: string;
}

const baseName = (v: unknown) => {
  const str = typeof v === "string" ? v.trim() : "";
  return str
    .replace(/^(?:department|college|collage)\s+of\s+/i, "")
    .trim()
    .toLowerCase();
};

export default function DepartmentTimetable() {
  /* 1️⃣  semester ------------------------------------------------------ */
  const { data: semInfo, isLoading: semLoad, error: semErr } = useSemesters();
  const storeSemester = useFilterStore((s) => s.semester);
  const semester = storeSemester || semInfo?.active || null;

  /* 2️⃣  rows for that semester --------------------------------------- */
  const {
    data: rows = [],
    isLoading: rowLoad,
    error: rowErr,
  } = useScheduleRows(semester);

  /* 3️⃣  build unique department list --------------------------------- */
  const departmentOpts = useMemo<DepartmentOpt[]>(() => {
    const map = new Map<string, DepartmentOpt>();
    rows.forEach((r) => {
      const dept = String(r.department ?? "").trim();
      if (!dept) return;
      const coll = String(r.college ?? "").trim();
      // skip pseudo‑departments where the base department equals the base college
      if (baseName(dept) === baseName(coll)) return;
      if (!map.has(dept)) map.set(dept, { department: dept, college: coll });
    });
    return Array.from(map.values()).sort((a, b) =>
      a.college === b.college
        ? a.department.localeCompare(b.department)
        : a.college.localeCompare(b.college),
    );
  }, [rows]);

  /* 4️⃣  read/write ?department=… in URL ------------------------------ */
  const [searchParams, setSearchParams] = useSearchParams();
  const deptParam = getParam(searchParams, "department");
  const selectedOpt =
    departmentOpts.find((d) => d.department === deptParam) || null;

  const handleDeptChange = (_: unknown, v: DepartmentOpt | null) =>
    setParam(searchParams, "department", v?.department, setSearchParams);

  /* 5️⃣  filtered rows ------------------------------------------------- */
  const filtered = useMemo<SheetRow[]>(() => {
    if (!selectedOpt) return [];
    return rows.filter((r) => String(r.department) === selectedOpt.department);
  }, [rows, selectedOpt]);

  /* 5.1️⃣  derive instructor & course option lists (after dept filter) */
  const instructorOptions = useMemo(() => {
    const set = new Set<string>();
    filtered.forEach((r) => {
      const inst = String(r.instructor ?? "").trim();
      if (inst) set.add(inst);
    });
    return Array.from(set).sort();
  }, [filtered]);

  const courseOptions = useMemo(
    () =>
      Array.from(
        new Map(
          filtered
            .filter((r) => r.course_code)
            .map((r) => [
              String(r.course_code),
              `${r.course_code as string} — ${r.course_name as string}`,
            ]),
        ).entries(),
      )
        .map(([code, label]) => ({ code, label }))
        .sort((a, b) => a.code.localeCompare(b.code)),
    [filtered],
  );

  /* 5.2️⃣  filter selections moved to zustand (empty = show all) */
  const {
    instructors: selInstructors,
    courses: selCourses,
    openDrawer,
    setInstructors,
    setCourses,
    // others handled inside DepartmentFilterDrawer
  } = useDepartmentFilterStore();

  const applyRowFilters = useCallback(
    (rowsIn: SheetRow[]) => {
      return rowsIn.filter((r) => {
        const inst = String(r.instructor ?? "").trim();
        const course = String(r.course_code ?? "").trim();
        const instOk =
          selInstructors.length === 0 || selInstructors.includes(inst);
        const courseOk = selCourses.length === 0 || selCourses.includes(course);
        return instOk && courseOk;
      });
    },
    [selInstructors, selCourses],
  );

  const finalFiltered = useMemo(
    () => applyRowFilters(filtered),
    [filtered, applyRowFilters],
  );

  /* 5.3️⃣  exam view rows: keep section, include all session instructors */
  const examRows = useMemo<SheetRow[]>(() => {
    const base = filtered;
    if (base.length === 0) return [];

    const courseFiltered =
      selCourses.length === 0
        ? base
        : base.filter((r) =>
            selCourses.includes(String(r.course_code ?? "").trim()),
          );

    const sectionSource =
      selInstructors.length === 0
        ? courseFiltered
        : courseFiltered.filter((r) =>
            selInstructors.includes(String(r.instructor ?? "").trim()),
          );

    const sectionKeys = new Set<string>();
    sectionSource.forEach((r) => {
      const courseCode = String(r.course_code ?? "").trim();
      if (!courseCode) return;
      const section = String(r.section ?? "").trim();
      sectionKeys.add(`${courseCode}__${section || "*"}`);
    });
    if (sectionKeys.size === 0) return [];

    return courseFiltered.filter((r) => {
      const courseCode = String(r.course_code ?? "").trim();
      if (!courseCode) return false;
      const section = String(r.section ?? "").trim();
      return sectionKeys.has(`${courseCode}__${section || "*"}`);
    });
  }, [filtered, selCourses, selInstructors]);

  /* 5.2.b️⃣ prune selections when options shrink or department changes */
  useEffect(() => {
    if (selInstructors.length) {
      const valid = new Set(instructorOptions);
      const keep = selInstructors.filter((i) => valid.has(i));
      if (keep.length !== selInstructors.length) setInstructors(keep);
    }
    if (selCourses.length) {
      const valid = new Set(courseOptions.map((c) => c.code));
      const keep = selCourses.filter((c) => valid.has(c));
      if (keep.length !== selCourses.length) setCourses(keep);
    }
  }, [
    instructorOptions,
    courseOptions,
    selInstructors,
    selCourses,
    setInstructors,
    setCourses,
  ]);

  /* 6️⃣  ui state ------------------------------------------------------ */
  // toggle sessions vs exams via URL search params
  const showExams = searchParams.get("exams") === "true";
  const setShowExams = (val: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set("exams", "true");
    else next.delete("exams");
    setSearchParams(next, { replace: true });
  };

  if (semLoad || rowLoad) return <MyCustomSpinner />;

  if (semErr || rowErr)
    return (
      <Typography color="error" align="center" mt={4}>
        Failed to load data.
      </Typography>
    );

  /* 7️⃣  render -------------------------------------------------------- */
  return (
    <PageTransition>
      <Box p={2}>
        {/* title */}
        <Typography variant="h5" mb={3}>
          Department Schedule{semester ? `: ${semester}` : ""}
        </Typography>

        {/* department selector */}
        <Box mb={3} className="no-print">
          <Autocomplete
            options={departmentOpts}
            groupBy={(o) => o.college}
            getOptionLabel={(o) => o.department}
            isOptionEqualToValue={(o, v) => o.department === v.department}
            value={selectedOpt}
            onChange={handleDeptChange}
            renderInput={(params) => (
              <TextField {...params} label="Select Department" />
            )}
          />
        </Box>

        {/* toggle sessions vs exams */}
        {selectedOpt && (
          <Box
            mb={2}
            className="no-print"
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <ToggleButtonGroup
              value={showExams ? "exams" : "sessions"}
              exclusive
              onChange={(_, next) => {
                if (next !== null) setShowExams(next === "exams");
              }}
              size="small"
              color="primary"
            >
              <ToggleButton value="sessions">Course Sessions</ToggleButton>
              <ToggleButton value="exams">Final Exams</ToggleButton>
            </ToggleButtonGroup>
            <IconButton
              aria-label="filters"
              onClick={openDrawer}
              size="small"
              className="no-print"
            >
              <TuneIcon />
            </IconButton>
          </Box>
        )}

        {/* schedule view or prompt */}
        {selectedOpt ? (
          showExams ? (
            <FinalExamSchedule
              data={examRows}
              department={selectedOpt.department}
              semester={semester ?? undefined}
            />
          ) : (
            <WeeklySchedule
              data={finalFiltered}
              semester={semester ?? undefined}
            />
          )
        ) : (
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mt: 2, textAlign: "center" }}
          >
            Please select a department to view its weekly schedule.
          </Typography>
        )}
      </Box>

      <DepartmentFilterDrawer
        instructorOptions={instructorOptions}
        courseOptions={courseOptions}
        showExams={showExams}
      />
    </PageTransition>
  );
}

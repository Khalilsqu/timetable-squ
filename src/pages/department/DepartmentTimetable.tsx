// src/pages/student/DepartmentTimetable.tsx
import { useMemo } from "react";
import { useSearchParams } from "react-router";
import {
  Box,
  Autocomplete,
  TextField,
  Typography,
} from "@mui/material";

import WeeklySchedule from "@/src/components/WeeklySchedule";
import MyCustomSpinner from "@/src/components/MyCustomSpinner";
import PageTransition from "@/src/components/layout/PageTransition";

import { useSemesters, useScheduleRows } from "@/src/lib/queries";
import { useFilterStore } from "@/src/stores/filterStore";

import type { SheetRow } from "@/src/lib/googleSheet";

/* ───────────── helper: URL helpers ───────────── */
const getParam = (sp: URLSearchParams, k: string) => sp.get(k) ?? undefined;
// React-Router's type (simplified):

type SetSearchParams = (
  nextInit: URLSearchParams,
  opts?: { replace?: boolean }
) => void;

const setParam = (
  sp: URLSearchParams,
  k: string,
  v: string | undefined,
  replaceFn: SetSearchParams //
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
      const college = String(r.college ?? "Uncategorized").trim();
      if (!map.has(dept)) map.set(dept, { department: dept, college });
    });
    return Array.from(map.values()).sort((a, b) =>
      a.college === b.college
        ? a.department.localeCompare(b.department)
        : a.college.localeCompare(b.college)
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

  /* 6️⃣  ui state ------------------------------------------------------ */

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
          Department Schedule{semester ? ` · ${semester}` : ""}
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

        {/* weekly view or prompt */}
        {selectedOpt ? (
          <WeeklySchedule
            data={filtered}
            semester={semester ?? undefined}
            hideTooltip // optional: hide course-name icon
          />
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
    </PageTransition>
  );
}

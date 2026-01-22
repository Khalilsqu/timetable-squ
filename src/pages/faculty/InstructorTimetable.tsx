// src/pages/faculty/InstructorTimetable.tsx
import { useMemo } from "react";
import { useSearchParams } from "react-router";
import {
  Box,
  Autocomplete,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";

import FinalExamSchedule from "@/src/components/FinalExamSchedule";
import WeeklySchedule from "@/src/components/WeeklySchedule";
import MyCustomSpinner from "@/src/components/MyCustomSpinner";
import PageTransition from "@/src/components/layout/PageTransition";

import { useSemesters, useScheduleRows } from "@/src/lib/queries";
import { useFilterStore } from "@/src/stores/filterStore";
import { useSelectionTableStore } from "@/src/stores/selectionTableStore";

import type { SheetRow } from "@/src/lib/googleSheet";

/* ——— helpers ——— */
const norm = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/* ——— component ——— */
export default function InstructorTimetable() {
  // use URL search param "instExams" instead of local state
  const [searchParams, setSearchParams] = useSearchParams();
  const showExams = searchParams.get("instExams") === "true";
  const setShowExams = (val: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set("instExams", "true");
    else next.delete("instExams");
    setSearchParams(next, { replace: true });
  };

  /* 1️⃣  semester ------------------------------------------------------ */
  const { data: semInfo, isLoading: semLoad, error: semErr } = useSemesters();
  const storeSem = useFilterStore((s) => s.semester);
  const semester = storeSem || semInfo?.active || null;

  /* 2️⃣  rows ---------------------------------------------------------- */
  const {
    data: rows = [],
    isLoading: rowLoad,
    error: rowErr,
  } = useScheduleRows(semester);

  /* 3️⃣  list of unique instructor names ------------------------------ */
  const instructors = useMemo<string[]>(() => {
    const set = new Set(
      rows.map((r) => norm(r.instructor)).filter((n) => n.length > 0)
    );
    return Array.from(set).sort();
  }, [rows]);

  /* 4️⃣  Zustand store for selection ---------------------------------- */
  const selectedInstructors = useSelectionTableStore(
    (s) => s.selectedInstructors
  );
  const setSelectedInstructors = useSelectionTableStore(
    (s) => s.setSelectedInstructors
  );

  /* 5️⃣  filter rows for chosen instructors --------------------------- */
  const filtered = useMemo<SheetRow[]>(() => {
    if (selectedInstructors.length === 0) return [];
    return rows.filter((r) => selectedInstructors.includes(norm(r.instructor)));
  }, [rows, selectedInstructors]);

  /* 6️⃣  loading / error ---------------------------------------------- */
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
          Instructor Timetable{semester ? `: ${semester}` : ""}
        </Typography>

        {/* instructor selector */}
        <Box mb={3} className="no-print">
          <Autocomplete
            multiple
            options={instructors}
            value={selectedInstructors}
            onChange={(_, v) => setSelectedInstructors(v)}
            renderInput={(params) => (
              <TextField {...params} label="Select Instructor(s)" />
            )}
            sx={{ width: "100%" }}
          />
        </Box>

        {/* toggle sessions vs exams */}
        {selectedInstructors.length > 0 && (
          <Box mb={2} className="no-print">
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
          </Box>
        )}

        {/* schedule view or prompt */}
        {selectedInstructors.length > 0 ? (
          showExams ? (
            <FinalExamSchedule
              data={filtered}
              department={selectedInstructors.join(", ")}
              semester={semester ?? undefined}
            />
          ) : filtered.length ? (
            <WeeklySchedule
              data={filtered}
              semester={semester ?? undefined}
              hideTooltip
            />
          ) : (
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mt: 2, textAlign: "center" }}
            >
              No courses found for the selected instructor(s).
            </Typography>
          )
        ) : (
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mt: 2, textAlign: "center" }}
          >
            Please select one or more instructors to view their schedule.
          </Typography>
        )}
      </Box>
    </PageTransition>
  );
}

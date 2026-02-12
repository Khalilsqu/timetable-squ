// src/pages/faculty/InstructorTimetable.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import {
  Box,
  Autocomplete,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Switch,
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
const INSTRUCTOR_PARAM = "instructor";

const sameStringArray = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/* ——— component ——— */
export default function InstructorTimetable() {
  const [showEnrollment, setShowEnrollment] = useState(false);

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
      rows.map((r) => norm(r.instructor)).filter((n) => n.length > 0),
    );
    return Array.from(set).sort();
  }, [rows]);

  /* 4️⃣  Zustand store for selection ---------------------------------- */
  const selectedInstructors = useSelectionTableStore(
    (s) => s.selectedInstructors,
  );
  const setSelectedInstructors = useSelectionTableStore(
    (s) => s.setSelectedInstructors,
  );
  const selectedInstructorsRef = useRef(selectedInstructors);
  const isApplyingUrlInstructors = useRef(false);
  const urlInstructorParams = useMemo(
    () =>
      searchParams
        .getAll(INSTRUCTOR_PARAM)
        .map((name) => norm(name))
        .filter((name) => name.length > 0),
    [searchParams],
  );

  useEffect(() => {
    selectedInstructorsRef.current = selectedInstructors;
  }, [selectedInstructors]);

  useEffect(() => {
    if (rowLoad) return;
    if (urlInstructorParams.length === 0 || urlInstructorParams.length >= 11) {
      return;
    }
    const valid = urlInstructorParams.filter((name) => instructors.includes(name));
    if (!sameStringArray(valid, selectedInstructorsRef.current)) {
      isApplyingUrlInstructors.current = true;
      setSelectedInstructors(valid);
    }
  }, [
    urlInstructorParams,
    instructors,
    rowLoad,
    setSelectedInstructors,
  ]);

  useEffect(() => {
    if (rowLoad || selectedInstructors.length === 0) return;
    const valid = new Set(instructors);
    const keep = selectedInstructors.filter((name) => valid.has(name));
    if (keep.length !== selectedInstructors.length) {
      setSelectedInstructors(keep);
    }
  }, [rowLoad, instructors, selectedInstructors, setSelectedInstructors]);

  useEffect(() => {
    if (rowLoad) return;
    if (isApplyingUrlInstructors.current) {
      isApplyingUrlInstructors.current = false;
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.delete(INSTRUCTOR_PARAM);

    if (selectedInstructors.length > 0 && selectedInstructors.length < 11) {
      selectedInstructors.forEach((name) => next.append(INSTRUCTOR_PARAM, name));
    }

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [rowLoad, searchParams, selectedInstructors, setSearchParams]);

  /* 5️⃣  filter rows for chosen instructors --------------------------- */
  const filtered = useMemo<SheetRow[]>(() => {
    if (selectedInstructors.length === 0) return [];
    return rows.filter((r) => selectedInstructors.includes(norm(r.instructor)));
  }, [rows, selectedInstructors]);

  /* 5.1️⃣  exam view rows: include other session instructors in same section */
  const examRows = useMemo<SheetRow[]>(() => {
    if (selectedInstructors.length === 0) return [];

    const sectionKeys = new Set<string>();
    rows.forEach((r) => {
      if (!selectedInstructors.includes(norm(r.instructor))) return;
      const courseCode = String(r.course_code ?? "").trim();
      if (!courseCode) return;
      const section = String(r.section ?? "").trim();
      sectionKeys.add(`${courseCode}__${section || "*"}`);
    });

    if (sectionKeys.size === 0) return [];

    return rows.filter((r) => {
      const courseCode = String(r.course_code ?? "").trim();
      if (!courseCode) return false;
      const section = String(r.section ?? "").trim();
      return sectionKeys.has(`${courseCode}__${section || "*"}`);
    });
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
          <Box
            mb={2}
            className="no-print"
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            gap={2}
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
            {!showExams && (
              <FormControlLabel
                control={
                  <Switch
                    checked={showEnrollment}
                    onChange={(e) => setShowEnrollment(e.target.checked)}
                    size="small"
                  />
                }
                label="Show enrollment"
              />
            )}
          </Box>
        )}

        {/* schedule view or prompt */}
        {selectedInstructors.length > 0 ? (
          showExams ? (
            <FinalExamSchedule
              data={examRows}
              department={selectedInstructors.join(", ")}
              semester={semester ?? undefined}
            />
          ) : filtered.length ? (
            <WeeklySchedule
              data={filtered}
              semester={semester ?? undefined}
              showEnrollment={showEnrollment}
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

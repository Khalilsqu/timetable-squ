// src/pages/student/CollegeTimetable.tsx
import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { Box, Autocomplete, TextField, Typography } from "@mui/material";

import WeeklySchedule from "@/src/components/WeeklySchedule";
import MyCustomSpinner from "@/src/components/MyCustomSpinner";
import PageTransition from "@/src/components/layout/PageTransition";

import { useSemesters, useScheduleRows } from "@/src/lib/queries";
import { useFilterStore } from "@/src/stores/filterStore";

const getParam = (sp: URLSearchParams, k: string) => sp.get(k) ?? undefined;

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

const baseName = (v: unknown) => {
  const str = typeof v === "string" ? v.trim() : "";
  return str
    .replace(/^(?:department|college|collage)\s+of\s+/i, "")
    .trim()
    .toLowerCase();
};

/* ————— component ————— */
export default function CollegeTimetable() {
  /* 1️⃣  semester */
  const { data: semInfo, isLoading: semLoad, error: semErr } = useSemesters();
  const storeSem = useFilterStore((s) => s.semester);
  const semester = storeSem || semInfo?.active || null;

  /* 2️⃣  rows */
  const {
    data: rows = [],
    isLoading: rowLoad,
    error: rowErr,
  } = useScheduleRows(semester);

  /* 3️⃣  college options (only those that manage courses directly) */
  const collegeOpts = useMemo(() => {
    const direct = new Set<string>();
    rows.forEach((r) => {
      const coll = r.college as string;
      const dept = r.department as string | undefined;
      // a course is “direct” if there is no department or the base department equals the base college
      if (!dept || baseName(dept) === baseName(coll)) {
        direct.add(coll);
      }
    });
    return Array.from(direct).sort();
  }, [rows]);

  /* 4️⃣  URL param */
  const [searchParams, setSearchParams] = useSearchParams();
  const collegeParam = getParam(searchParams, "college");

  const onCollegeChange = (_: unknown, v: string | null) =>
    setParam(searchParams, "college", v ?? undefined, setSearchParams);

  /* 5️⃣  filtered rows */
  // filter rows for the selected college, keeping only direct courses
  const filtered = useMemo(() => {
    if (!collegeParam) return [];
    return rows.filter((r) => {
      const sameCollege = baseName(r.college) === baseName(collegeParam);
      const dept = r.department as string | undefined;
      const direct = !dept || baseName(dept) === baseName(r.college);
      return sameCollege && direct;
    });
  }, [rows, collegeParam]);

  /* 6️⃣  loading / error */
  if (semLoad || rowLoad) return <MyCustomSpinner />;

  if (semErr || rowErr)
    return (
      <Typography color="error" align="center" mt={4}>
        Failed to load data.
      </Typography>
    );

  /* 7️⃣  render */
  return (
    <PageTransition>
      <Box p={2}>
        {/* title */}
        <Typography variant="h5" mb={3}>
          College Schedule{semester ? ` · ${semester}` : ""}
        </Typography>

        {/* selector */}
        <Box mb={3} className="no-print">
          <Autocomplete
            options={collegeOpts}
            value={collegeParam ?? ""}
            onChange={onCollegeChange}
            renderInput={(params) => (
              <TextField {...params} label="Select College" />
            )}
            sx={{ width: "100%" }}
          />
        </Box>

        {/* weekly grid or prompts */}
        {collegeParam ? (
          filtered.length ? (
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
              No college-managed courses found for {collegeParam}.
            </Typography>
          )
        ) : (
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mt: 2, textAlign: "center" }}
          >
            Please select a college to view its un-departmented course schedule.
          </Typography>
        )}
      </Box>
    </PageTransition>
  );
}

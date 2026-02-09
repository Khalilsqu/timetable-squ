/* src/components/FilterDrawer.tsx */

import {
  Autocomplete,
  Backdrop,
  Box,
  Button,
  CircularProgress,
  Drawer,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
  Checkbox,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useFilterStore } from "@/src/stores/filterStore";

/* ——— sheet helpers ——— */
import { fetchSemesters } from "@/src/lib/semesters"; // returns {list, active}
import { useScheduleRows } from "@/src/lib/queries";
import type { SemesterInfo } from "@/src/lib/semesters";
import type { SheetRow } from "@/src/lib/googleSheet";

/* ------------------------------------------------------------------ */
/* 0. collect option lists from flat sheet rows                       */
/* ------------------------------------------------------------------ */

interface CollegeOpt {
  id: string;
  name: string;
}
interface DepartmentOpt {
  id: string;
  name: string;
  college: string;
}
interface CourseOpt {
  id: string;
  code: string;
  name: string;
  college: string;
  department: string;
  credit_hours?: number;
}

const collectOptions = (rows: SheetRow[]) => {
  const colleges: Record<string, CollegeOpt> = {};
  const departments: Record<string, DepartmentOpt> = {};
  const courses: Record<string, CourseOpt> = {};

  rows.forEach((r) => {
    if (typeof r.college === "string") {
      const key = r.college;
      colleges[key] = { id: key, name: key };
    }

    // collect departments only when the base name differs from the college base name
    if (typeof r.department === "string") {
      const dept = r.department.trim();
      const coll = String(r.college).trim();
      // remove common prefixes like "College of", "Collage of" or "Department of" before comparing
      const baseDept = dept
        .replace(/^(?:department|college|collage)\s+of\s+/i, "")
        .trim();
      const baseColl = coll.replace(/^(?:college|collage)\s+of\s+/i, "").trim();
      // if the base department is non‑empty and not equal to the base college, include it
      if (baseDept && baseDept.toLowerCase() !== baseColl.toLowerCase()) {
        departments[dept] = {
          id: dept,
          name: dept,
          college: coll,
        };
      }
    }

    if (typeof r.course_code === "string") {
      const key = r.course_code;
      courses[key] = {
        id: key,
        code: key,
        name: String(r.course_name),
        college: String(r.college),
        department: String(r.department),
        credit_hours:
          r.credit_hours !== undefined && r.credit_hours !== null
            ? Number(r.credit_hours)
            : undefined,
      };
    }
  });

  return {
    collegeList: Object.values(colleges).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
    departmentList: Object.values(departments).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
    courseList: Object.values(courses).sort((a, b) =>
      a.code.localeCompare(b.code),
    ),
  };
};

/* ------------------------------------------------------------------ */
/* Drawer component                                                   */
/* ------------------------------------------------------------------ */
interface DrawerProps {
  open: boolean;
  onClose: () => void;
}

const FilterDrawer = ({ open, onClose }: DrawerProps) => {
  const handleCollegeChange = (_: React.SyntheticEvent, v: CollegeOpt[]) => {
    setColleges(v.map((x) => x.id));
  };

  const handleDepartmentChange = (
    _: React.SyntheticEvent,
    v: DepartmentOpt[],
  ) => {
    setDepartments(v.map((x) => x.id));
  };

  /* layout */
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up("md"));
  const width = wide ? 380 : 300;

  const {
    semester,
    colleges,
    departments,
    courses,
    university_elective,
    university_requirement,
    credit_hours_min,
    credit_hours_max,
    filteredNumber,
    isFiltering,
    // NEW store fields
    level,
    course_languages,

    setSemester,

    setColleges,
    setDepartments,
    setCourses,
    setElective,
    setRequirement,
    setCreditHoursMin,
    setCreditHoursMax,
    reset,
    // NEW setters
    setLevel,
    setCourseLanguages,
  } = useFilterStore();

  const { data: semInfo } = useQuery<SemesterInfo, Error>({
    queryKey: ["semesters"],
    queryFn: fetchSemesters, // returns SemesterInfo
    // optional: staleTime, retry, etc.
  });

  const activeSem = semInfo?.active ?? null;

  useEffect(() => {
    if (!semester && activeSem) setSemester(activeSem);
  }, [semester, activeSem, setSemester, semInfo]);

  const { data: scheduleRowsData = [] } = useScheduleRows(semester || null);
  const scheduleRows = useMemo(
    () => (semester ? scheduleRowsData : []),
    [semester, scheduleRowsData],
  );

  const { collegeList, departmentList, courseList } = useMemo(
    () => collectOptions(scheduleRows),
    [scheduleRows],
  );
  // Infer max credit hours from courseList
  const inferredMaxCredit = useMemo(() => {
    if (!courseList.length) return 30;
    return Math.max(...courseList.map((c) => c.credit_hours ?? 0));
  }, [courseList]);

  // Set default max credit hours to inferred value when courseList changes
  useEffect(() => {
    setCreditHoursMax(inferredMaxCredit);
  }, [inferredMaxCredit, setCreditHoursMax]);

  // detect available languages from data
  const languageOptions = useMemo(
    () =>
      Array.from(
        new Set(
          scheduleRows
            .map((r) =>
              typeof r.course_language === "string"
                ? r.course_language.trim()
                : "",
            )
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [scheduleRows],
  );

  // prune invalid selected languages when options change
  useEffect(() => {
    if (!course_languages.length) return;
    const valid = new Set(languageOptions);
    const keep = course_languages.filter((l) => valid.has(l));
    if (keep.length !== course_languages.length) setCourseLanguages(keep);
  }, [course_languages, languageOptions, setCourseLanguages]);

  /* dependent options */
  const deptOptions = useMemo(
    () =>
      !colleges.length
        ? departmentList
        : departmentList.filter((d) => colleges.includes(d.college)),
    [departmentList, colleges],
  );

  const courseOptions = useMemo(
    () =>
      courseList.filter((c) => {
        const okCol = !colleges.length || colleges.includes(c.college);
        const okDep = !departments.length || departments.includes(c.department);
        const ch = c.credit_hours ?? 0;
        const okCredit = ch >= credit_hours_min && ch <= credit_hours_max;
        return okCol && okDep && okCredit;
      }),
    [courseList, colleges, departments, credit_hours_min, credit_hours_max],
  );

  /* prune dangling selections whenever parents change */
  useEffect(() => {
    if (departments.length) {
      const valid = new Set(deptOptions.map((d) => d.id));
      const keep = departments.filter((id) => valid.has(id));
      if (keep.length !== departments.length) setDepartments(keep);
    }
    if (courses.length) {
      const valid = new Set(courseOptions.map((c) => c.id));
      const keep = courses.filter((id) => valid.has(id));
      if (keep.length !== courses.length) setCourses(keep);
    }
  }, [
    deptOptions,
    courseOptions,
    departments,
    courses,
    setDepartments,
    setCourses,
  ]);

  const handleCreditHoursMinChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = Number(e.target.value);
    const min = Number.isNaN(value) ? 0 : Math.max(0, value);
    setCreditHoursMin(min);
    // Ensure max is always at least min + 1 and not above inferredMaxCredit
    if (credit_hours_max <= min) {
      setCreditHoursMax(Math.min(inferredMaxCredit, min + 1));
    }
  };
  const handleCreditHoursMaxChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = Number(e.target.value);
    let max = Number.isNaN(value)
      ? inferredMaxCredit
      : Math.min(inferredMaxCredit, value);
    // Ensure max is always at least min + 1
    if (max <= credit_hours_min) {
      max = Math.min(inferredMaxCredit, credit_hours_min + 1);
    }
    setCreditHoursMax(max);
  };

  /* ---------------------------------------------------------------- */
  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width, position: "relative" } } }}
    >
      {/* header */}
      <Box display="flex" alignItems="center" p={2}>
        <Typography variant="h6" flexGrow={1}>
          Filters
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* College */}
      <Box p={2}>
        <Autocomplete
          multiple
          size="small"
          options={collegeList}
          getOptionLabel={(o) => o.name}
          value={collegeList.filter((c) => colleges.includes(c.id))}
          onChange={handleCollegeChange}
          renderInput={(p) => <TextField {...p} label="College" />}
        />
      </Box>

      {/* Department */}
      <Box p={2}>
        <Autocomplete
          multiple
          size="small"
          options={deptOptions}
          getOptionLabel={(o) => o.name}
          value={deptOptions.filter((d) => departments.includes(d.id))}
          onChange={handleDepartmentChange}
          renderInput={(p) => <TextField {...p} label="Department" />}
        />
      </Box>

      {/* Course */}
      <Box p={2}>
        <Autocomplete
          multiple
          size="small"
          options={courseOptions}
          getOptionLabel={(o) => `${o.code} — ${o.name}`}
          value={courseOptions.filter((c) => courses.includes(c.id))}
          onChange={(_event, v: CourseOpt[]) => setCourses(v.map((x) => x.id))}
          renderInput={(p) => <TextField {...p} label="Course" />}
        />
      </Box>

      {/* Elective / Requirement (checkboxes) */}
      <Box p={2}>
        <FormControlLabel
          control={
            <Checkbox
              checked={university_elective}
              onChange={(e) => setElective(e.target.checked)}
              size="small"
            />
          }
          label="University Elective"
        />
      </Box>
      <Box p={2} sx={{ pt: 0 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={university_requirement}
              onChange={(e) => setRequirement(e.target.checked)}
              size="small"
            />
          }
          label="University Requirement"
        />
      </Box>

      {/* Level (UG / PG) */}
      <Box p={2}>
        <Typography variant="subtitle2" mb={1}>
          Level
        </Typography>
        <RadioGroup
          row
          value={level || "any"}
          onChange={(_: React.SyntheticEvent, v: string | null) =>
            setLevel(v === "UG" || v === "PG" ? v : "")
          }
        >
          <FormControlLabel value="any" control={<Radio />} label="Any" />
          <FormControlLabel value="UG" control={<Radio />} label="UG" />
          <FormControlLabel value="PG" control={<Radio />} label="PG" />
        </RadioGroup>
      </Box>

      {/* Language (inferred from data) */}
      <Box p={2}>
        <Autocomplete
          multiple
          size="small"
          options={languageOptions}
          value={course_languages}
          onChange={(_, v) => setCourseLanguages(v)}
          renderInput={(p) => <TextField {...p} label="Language" />}
        />
      </Box>

      {/* Credit Hours Range Filter */}
      <Box p={2} display="flex" gap={2} alignItems="center">
        <TextField
          label="Min Credit Hours"
          type="number"
          slotProps={{ htmlInput: { min: 0, max: inferredMaxCredit, step: 1 } }}
          value={credit_hours_min}
          onChange={handleCreditHoursMinChange}
          size="small"
          sx={{ width: 120 }}
        />
        <Typography variant="body2">to</Typography>
        <TextField
          label="Max Credit Hours"
          type="number"
          slotProps={{ htmlInput: { min: 0, max: inferredMaxCredit, step: 1 } }}
          value={credit_hours_max}
          onChange={handleCreditHoursMaxChange}
          size="small"
          sx={{ width: 120 }}
        />
      </Box>

      {/* footer */}
      <Box mt="auto" p={2} display="flex" flexDirection="column" gap={1}>
        <Typography variant="body2" color="text.secondary">
          Showing <strong>{filteredNumber}</strong>{" "}
          {filteredNumber === 1 ? "row" : "rows"}
        </Typography>
        <Button fullWidth variant="outlined" onClick={reset}>
          Clear All
        </Button>
      </Box>

      {/* dim‑overlay */}
      <Backdrop
        open={isFiltering}
        sx={{
          position: "absolute",
          inset: 0,
          bgcolor: "rgba(0,0,0,0.35)",
          zIndex: (th) => th.zIndex.drawer + 1,
        }}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </Drawer>
  );
};

export default FilterDrawer;

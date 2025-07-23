/* src/components/FilterDrawer.tsx */
import { useSearchParams } from "react-router";
import {
  Autocomplete,
  Backdrop,
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useFilterStore } from "@/src/stores/filterStore";

/* ——— sheet helpers ——— */
import { fetchSheetData } from "@/src/lib/googleSheet";
import { fetchSemesters } from "@/src/lib/semesters"; // returns {list, active}
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

    if (typeof r.department === "string") {
      const key = r.department;
      departments[key] = {
        id: key,
        name: key,
        college: String(r.college),
      };
    }

    if (typeof r.course_code === "string") {
      const key = r.course_code;
      courses[key] = {
        id: key,
        code: key,
        name: String(r.course_name),
        college: String(r.college),
        department: String(r.department),
      };
    }
  });

  return {
    collegeList: Object.values(colleges).sort((a, b) =>
      a.name.localeCompare(b.name)
    ),
    departmentList: Object.values(departments).sort((a, b) =>
      a.name.localeCompare(b.name)
    ),
    courseList: Object.values(courses).sort((a, b) =>
      a.code.localeCompare(b.code)
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
  const [, setSearchParams] = useSearchParams();

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
    filteredNumber,
    isFiltering,

    setSemester,
    softReset,
    setColleges,
    setDepartments,
    setCourses,
    setElective,
    setRequirement,
    reset,
  } = useFilterStore();

  const { data: semInfo } = useQuery<SemesterInfo, Error>({
    queryKey: ["semesters"],
    queryFn: fetchSemesters, // returns SemesterInfo
    // optional: staleTime, retry, etc.
  });

  const semesterOptions = semInfo?.list ?? [];
  const activeSem = semInfo?.active ?? null;

  useEffect(() => {
    if (!semester && activeSem) setSemester(activeSem);
  }, [semester, activeSem, setSemester, semInfo]);

  const { data: scheduleRows = [] } = useQuery<SheetRow[]>({
    queryKey: ["schedule", semester],
    enabled: !!semester,
    queryFn: async () => {
      const { rows } = await fetchSheetData();
      const filtered = rows.filter((r: SheetRow) => r.semester === semester);
      return filtered;
    },
  });

  const { collegeList, departmentList, courseList } = useMemo(
    () => collectOptions(scheduleRows),
    [scheduleRows]
  );

  /* dependent options */
  const deptOptions = useMemo(
    () =>
      !colleges.length
        ? departmentList
        : departmentList.filter((d) => colleges.includes(d.college)),
    [departmentList, colleges]
  );

  const courseOptions = useMemo(
    () =>
      courseList.filter((c) => {
        const okCol = !colleges.length || colleges.includes(c.college);
        const okDep = !departments.length || departments.includes(c.department);
        return okCol && okDep;
      }),
    [courseList, colleges, departments]
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

  const handleCollegeChange = (_: React.SyntheticEvent, v: CollegeOpt[]) => {
    setColleges(v.map((x) => x.id));
  };

  const handleDepartmentChange = (
    _: React.SyntheticEvent,
    v: DepartmentOpt[]
  ) => {
    setDepartments(v.map((x) => x.id));
  };

  const handleCourseChange = (_: React.SyntheticEvent, v: CourseOpt[]) => {
    setCourses(v.map((x) => x.id));
  };

  const handleElectiveChange = (_: React.SyntheticEvent, v: string | null) => {
    setElective(v === "yes");
  };

  const handleRequirementChange = (
    _: React.SyntheticEvent,
    v: string | null
  ) => {
    setRequirement(v === "yes");
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
      <Divider />

      {/* Semester */}
      <Box p={2}>
        <Autocomplete
          size="small"
          options={semesterOptions}
          value={semester ?? ""}
          onChange={(_, v) => {
            if (v && v !== semester) {
              setSemester(v);
              softReset();
              setSearchParams({}); // clear search params
            }
          }}
          renderInput={(p) => <TextField {...p} label="Semester" />}
        />
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
          onChange={handleCourseChange}
          renderInput={(p) => <TextField {...p} label="Course" />}
        />
      </Box>

      {/* Elective / Requirement */}
      <Box p={2}>
        <Typography variant="subtitle2" mb={1}>
          University Elective
        </Typography>
        <RadioGroup
          row
          value={university_elective ? "yes" : "no"}
          onChange={handleElectiveChange}
        >
          <FormControlLabel value="yes" control={<Radio />} label="Yes" />
          <FormControlLabel value="no" control={<Radio />} label="No" />
        </RadioGroup>
      </Box>

      <Box p={2}>
        <Typography variant="subtitle2" mb={1}>
          University Requirement
        </Typography>
        <RadioGroup
          row
          value={university_requirement ? "yes" : "no"}
          onChange={handleRequirementChange}
        >
          <FormControlLabel value="yes" control={<Radio />} label="Yes" />
          <FormControlLabel value="no" control={<Radio />} label="No" />
        </RadioGroup>
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

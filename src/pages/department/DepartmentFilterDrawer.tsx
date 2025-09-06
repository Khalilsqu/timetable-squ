// src/pages/department/DepartmentFilterDrawer.tsx
import React from "react";
import {
  Box,
  Drawer,
  Divider,
  Typography,
  IconButton,
  Autocomplete,
  TextField,
  Chip,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useDepartmentFilterStore } from "@/src/stores/departmentFilterStore";

interface CourseOpt {
  code: string;
  label: string;
}

interface DepartmentFilterDrawerProps {
  instructorOptions: string[];
  courseOptions: CourseOpt[];
  showExams: boolean;
}

const DepartmentFilterDrawer: React.FC<DepartmentFilterDrawerProps> = ({
  instructorOptions,
  courseOptions,
  showExams,
}) => {
  const {
    instructors: selInstructors,
    courses: selCourses,
    setInstructors,
    setCourses,
    reset,
    drawerOpen,
    closeDrawer,
  } = useDepartmentFilterStore();

  return (
    <Drawer
      anchor="right"
      open={drawerOpen}
      onClose={closeDrawer}
      slotProps={{ paper: { sx: { width: { xs: 300, sm: 340 } } } }}
    >
      <Box display="flex" flexDirection="column" height="100%">
        <Box display="flex" alignItems="center" p={2} gap={1}>
          <Typography variant="h6" flexGrow={1}>
            {showExams ? "Exam Filters" : "Session Filters"}
          </Typography>
          <IconButton onClick={closeDrawer} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />
        <Box
          p={2}
          display="flex"
          flexDirection="column"
          gap={3}
          flexGrow={1}
          overflow="auto"
        >
          {/* Instructor Filter */}
          <Box>
            <Autocomplete
              multiple
              size="small"
              options={instructorOptions}
              value={selInstructors}
              onChange={(_, v) => setInstructors(v)}
              renderInput={(p) => (
                <TextField
                  {...p}
                  label="Instructors"
                  placeholder="All instructors"
                />
              )}
              renderValue={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    label={option}
                    size="small"
                  />
                ))
              }
            />
          </Box>

          {/* Course Filter */}
          <Box>
            <Autocomplete
              multiple
              size="small"
              options={courseOptions}
              getOptionLabel={(o) => o.label}
              value={courseOptions.filter((c) => selCourses.includes(c.code))}
              onChange={(_, v) => setCourses(v.map((x) => x.code))}
              renderInput={(p) => (
                <TextField {...p} label="Courses" placeholder="All courses" />
              )}
            />
          </Box>
        </Box>
        <Divider />
        <Box
          p={2}
          pt={1}
          display="flex"
          flexDirection="column"
          gap={1}
          className="no-print"
        >
          <Box display="flex" gap={1}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={reset}
            >
              Reset
            </Button>
            <Button fullWidth variant="outlined" onClick={closeDrawer}>
              Close
            </Button>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
};

export default DepartmentFilterDrawer;

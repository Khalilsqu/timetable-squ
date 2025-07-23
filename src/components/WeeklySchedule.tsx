// src/components/WeeklySchedule.tsx

import { useMemo, useState } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
  Paper,
  Popover,
  IconButton,
  Tooltip,
  useMediaQuery,
  Button,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PrintIcon from "@mui/icons-material/Print";
import { useLayoutStore } from "@/src/stores/layoutStore";
import type { SheetRow } from "@/src/lib/googleSheet";

/* ------------- Helper types ---------------- */
interface ScheduleEntry {
  courseCode?: string;
  section?: number | string;
  sectionType?: string;
  hall?: string;
  instructor?: string;
  courseName?: string;
}

interface WeeklyScheduleProps {
  data: SheetRow[]; // ← now flat rows
  semester?: string;
  hideInstructor?: boolean;
  hideTooltip?: boolean;
}

/* ------------- Component ------------------- */
export default function WeeklySchedule({
  data,
  semester,
  hideInstructor = false,
  hideTooltip = false,
}: WeeklyScheduleProps) {
  const theme = useTheme();
  const isDark = useLayoutStore((s) => s.isDarkTheme);
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  /* 1. derive days & time-slots --------------------------------------- */
  const daysOfWeek = useMemo(() => {
    const order = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const uniq = Array.from(new Set(data.map((d) => String(d.day ?? ""))));
    return uniq.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [data]);

  const timeSlots = useMemo(() => {
    const uniq = Array.from(
      new Set(
        data.map((d) => `${d.start_time as string}-${d.end_time as string}`)
      )
    );
    return uniq.sort();
  }, [data]);

  /* 2. build grid: day  ➜  time-slot  ➜  entries[] -------------------- */
  const grid = useMemo(() => {
    const g: Record<string, Record<string, ScheduleEntry[]>> = {};
    daysOfWeek.forEach((d) => {
      g[d] = {};
      timeSlots.forEach((ts) => (g[d][ts] = []));
    });

    data.forEach((row) => {
      const day = String(row.day);
      const ts = `${row.start_time as string}-${row.end_time as string}`;
      g[day][ts].push({
        courseCode: String(row.course_code ?? ""),
        section: String(row.section ?? ""),
        sectionType: String(row.section_type ?? ""), // if you store it
        hall: String(row.hall ?? ""),
        instructor: String(row.instructor ?? ""),
        courseName: String(row.course_name ?? ""),
      });
    });

    return g;
  }, [data, daysOfWeek, timeSlots]);

  /* 3. popover state --------------------------------------------------- */
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [infoContent, setContent] = useState<string>("");
  const open = Boolean(anchorEl);
  const close = () => setAnchorEl(null);

  /* 4. static styles --------------------------------------------------- */
  const headerBg = isDark ? theme.palette.grey[800] : theme.palette.grey[100];

  /* 5. render ---------------------------------------------------------- */
  return (
    <>
      {/* ——— header row ——— */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
        className="no-print"
      >
        <Typography variant="h6">
          Weekly Schedule{semester && ` · ${semester}`}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={() => window.print()}
        >
          Print
        </Button>
      </Box>

      {/* ——— table ——— */}
      <TableContainer
        component={Paper}
        sx={{
          overflowX: "auto",
          "@media print": { overflowX: "visible" },
        }}
      >
        <Table size="small" sx={{ minWidth: 800 }}>
          {/* header */}
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  backgroundColor: headerBg,
                  fontWeight: 600,
                  textAlign: "left",
                  minWidth: 100,
                }}
              >
                Time
              </TableCell>
              {daysOfWeek.map((day, idx) => (
                <TableCell
                  key={day}
                  sx={{
                    backgroundColor: headerBg,
                    fontWeight: 600,
                    textAlign: "center",
                    minWidth: 150,
                    borderRight:
                      idx < daysOfWeek.length - 1 ? "1px dashed" : "none",
                    borderColor: theme.palette.divider,
                  }}
                >
                  {day}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          {/* body */}
          <TableBody>
            {timeSlots.map((ts) => (
              <TableRow key={ts}>
                {/* time-slot label */}
                <TableCell
                  sx={{
                    backgroundColor: isDark
                      ? theme.palette.grey[800]
                      : theme.palette.grey[100],
                    fontWeight: 500,
                    textAlign: "left",
                  }}
                >
                  {ts}
                </TableCell>

                {/* one cell per day */}
                {daysOfWeek.map((day, idx) => (
                  <TableCell
                    key={day}
                    sx={{
                      backgroundColor: isDark
                        ? theme.palette.grey[900]
                        : theme.palette.common.white,
                      verticalAlign: "top",
                      p: 1,
                      height: 120,
                      borderRight:
                        idx < daysOfWeek.length - 1 ? "1px dashed" : "none",
                      borderColor: theme.palette.divider,
                    }}
                  >
                    {grid[day][ts].map((e, i) => (
                      <Box
                        key={i}
                        sx={{
                          mb: 1,
                          p: 1,
                          bgcolor: theme.palette.primary.light,
                          color: theme.palette.primary.contrastText,
                          borderRadius: 1,
                          textAlign: "center",
                          fontSize: "0.875rem",
                        }}
                      >
                        {/* course code + section row */}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Typography fontWeight={600} component="span">
                            {e.courseCode} ({e.section})
                          </Typography>

                          {/* info icon for course name */}
                          {!!e.courseName && !hideTooltip && (
                            <Tooltip
                              className="no-print"
                              title={e.courseName}
                              disableHoverListener={!isDesktop}
                              disableFocusListener={!isDesktop}
                              disableTouchListener={!isDesktop}
                              slotProps={{
                                tooltip: {
                                  sx: {
                                    fontSize: isDesktop ? "0.95rem" : undefined,
                                    padding: isDesktop ? "6px 10px" : undefined,
                                  },
                                },
                              }}
                            >
                              <IconButton
                                size="small"
                                onClick={
                                  !isDesktop
                                    ? (ev) => {
                                        setAnchorEl(ev.currentTarget);
                                        setContent(e.courseName ?? "");
                                      }
                                    : undefined
                                }
                                sx={{ ml: 0.5 }}
                                aria-label="show course name"
                              >
                                <InfoOutlinedIcon
                                  fontSize="inherit"
                                  color={isDark ? "secondary" : "primary"}
                                  sx={{
                                    opacity: isDesktop ? 0.8 : 1,
                                    "&:hover": {
                                      opacity: isDesktop ? 1 : 0.8,
                                    },
                                  }}
                                />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>

                        {/* instructor / hall */}
                        {!hideInstructor && (
                          <Typography
                            variant="caption"
                            component="div"
                            sx={{
                              color: theme.palette.getContrastText(
                                theme.palette.primary.light
                              ),
                            }}
                          >
                            {e.instructor}
                          </Typography>
                        )}

                        <Typography
                          variant="caption"
                          component="div"
                          sx={{
                            color: theme.palette.getContrastText(
                              theme.palette.primary.light
                            ),
                          }}
                        >
                          {e.hall}
                        </Typography>
                      </Box>
                    ))}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* popover for course-name on mobile */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Typography sx={{ p: 1 }}>{infoContent}</Typography>
      </Popover>
    </>
  );
}

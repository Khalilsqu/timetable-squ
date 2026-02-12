// src/components/WeeklySchedule.tsx

import { useMemo, useState, type ReactNode } from "react";
import {
  Box,
  Chip,
  Stack,
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
  studentsInSection?: string;
  instructor?: string;
  courseName?: string;
}

interface WeeklyScheduleProps {
  data: SheetRow[]; // ← now flat rows
  semester?: string;
  hideInstructor?: boolean;
  hideTooltip?: boolean;
  showEnrollment?: boolean;
  headerLeft?: ReactNode;
}

const DAYS_ORDER = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const parseTimeToMinutes = (value: string): number | null => {
  const match = value
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*([AP]M))?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const suffix = match[3]?.toUpperCase();
  if (suffix === "PM" && hours < 12) hours += 12;
  if (suffix === "AM" && hours === 12) hours = 0;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const parseTimeRange = (value: string) => {
  const [start, end] = value.split("-").map((part) => part.trim());
  const startMins = start ? (parseTimeToMinutes(start) ?? 99999) : 99999;
  const endMins = end ? (parseTimeToMinutes(end) ?? startMins) : startMins;
  const duration = endMins >= startMins ? endMins - startMins : 0;
  return { startMins, duration };
};

/* ------------- Component ------------------- */
export default function WeeklySchedule({
  data,
  semester,
  hideInstructor = false,
  hideTooltip = false,
  showEnrollment = false,
  headerLeft,
}: WeeklyScheduleProps) {
  const theme = useTheme();
  const isDark = useLayoutStore((s) => s.isDarkTheme);
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [scrollLeft, setScrollLeft] = useState(0);

  /* 1. derive days & time-slots --------------------------------------- */
  const daysOfWeek = useMemo(() => {
    const uniq = Array.from(
      new Set(
        data.map((d) =>
          String(d.day ?? "")
            .trim()
            .toUpperCase(),
        ),
      ),
    ).filter(Boolean);
    return uniq.sort((a, b) => DAYS_ORDER.indexOf(a) - DAYS_ORDER.indexOf(b));
  }, [data]);

  const timeSlots = useMemo(() => {
    const uniq = Array.from(
      new Set(
        data.map(
          (d) =>
            `${String(d.start_time ?? "").trim()}-${String(d.end_time ?? "").trim()}`,
        ),
      ),
    ).filter((ts) => ts !== "-");
    return uniq.sort((a, b) => {
      const tA = parseTimeRange(a);
      const tB = parseTimeRange(b);
      if (tA.startMins !== tB.startMins) return tA.startMins - tB.startMins;
      return tA.duration - tB.duration;
    });
  }, [data]);

  /* 2. build grid: day  ➜  time-slot  ➜  entries[] -------------------- */
  const grid = useMemo(() => {
    const g: Record<string, Record<string, ScheduleEntry[]>> = {};
    daysOfWeek.forEach((d) => {
      g[d] = {};
      timeSlots.forEach((ts) => (g[d][ts] = []));
    });

    data.forEach((row) => {
      const day = String(row.day ?? "")
        .trim()
        .toUpperCase();
      const ts = `${String(row.start_time ?? "").trim()}-${String(
        row.end_time ?? "",
      ).trim()}`;
      if (!g[day] || !g[day][ts]) return;
      g[day][ts].push({
        courseCode: String(row.course_code ?? ""),
        section: String(row.section ?? ""),
        sectionType: String(row.section_type ?? ""), // if you store it
        hall: String(row.hall ?? ""),
        studentsInSection: String(row.students_in_section ?? "").trim(),
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
  const headerBg = isDark ? theme.palette.grey[900] : theme.palette.grey[100];
  const timeColWidth = 120;
  const dayColWidth = 220;
  const minTableWidth = Math.max(
    900,
    timeColWidth + dayColWidth * daysOfWeek.length,
  );

  const headerRow = (
    <TableRow>
      <TableCell
        sx={{
          backgroundColor: headerBg,
          fontWeight: 600,
          textAlign: "left",
          borderRight: "1px solid",
          borderColor: theme.palette.divider,
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
            borderRight: idx < daysOfWeek.length - 1 ? "1px solid" : "none",
            borderColor: theme.palette.divider,
          }}
        >
          {day}
        </TableCell>
      ))}
    </TableRow>
  );

  /* 5. render ---------------------------------------------------------- */
  return (
    <>
      {/* ——— header row ——— */}
      <Box mb={2} className="no-print">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Weekly Schedule{semester && `: ${semester}`}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
          >
            Print
          </Button>
        </Box>
        {headerLeft && (
          <Box display="flex" justifyContent="flex-end" mt={1}>
            {headerLeft}
          </Box>
        )}
      </Box>

      {/* ——— table ——— */}
      <TableContainer
        component={Paper}
        sx={{
          overflow: "visible",
          borderRadius: 2,
          border: "1px solid",
          borderColor: theme.palette.divider,
          "@media print": {
            display: "block",
            overflow: "visible !important",
            maxHeight: "none !important",
            border: "none",
            "& .MuiTable-root": {
              tableLayout: "auto",
            },
            "& .MuiTableCell-stickyHeader": {
              position: "static",
            },
          },
        }}
      >
        {/* sticky header that follows page scroll */}
        <Box
          className="no-print"
          sx={{
            position: "sticky",
            top: "var(--app-header-offset, 0px)",
            zIndex: (t) => t.zIndex.appBar - 1,
            backgroundColor: headerBg,
            borderBottom: "1px solid",
            borderColor: theme.palette.divider,
            overflow: "hidden",
            transition: "top .35s ease",
          }}
        >
          <Box sx={{ transform: `translateX(-${scrollLeft}px)` }}>
            <Table
              size="small"
              sx={{
                minWidth: minTableWidth,
                tableLayout: "fixed",
                "& .MuiTableCell-root": { borderColor: theme.palette.divider },
              }}
            >
              <colgroup>
                <col style={{ width: timeColWidth }} />
                {daysOfWeek.map((d) => (
                  <col key={d} style={{ width: dayColWidth }} />
                ))}
              </colgroup>
              <TableHead>{headerRow}</TableHead>
            </Table>
          </Box>
        </Box>

        {/* body with horizontal scroll */}
        <Box
          onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}
          sx={{
            overflowX: "auto",
            "@media print": { overflowX: "visible !important" },
          }}
        >
          <Table
            size="small"
            sx={{
              minWidth: minTableWidth,
              tableLayout: "fixed",
              "& .MuiTableCell-root": { borderColor: theme.palette.divider },
            }}
          >
            <colgroup>
              <col style={{ width: timeColWidth }} />
              {daysOfWeek.map((d) => (
                <col key={d} style={{ width: dayColWidth }} />
              ))}
            </colgroup>

            {/* header (kept for print) */}
            <TableHead
              sx={{
                display: "none",
                "@media print": { display: "table-header-group" },
              }}
            >
              {headerRow}
            </TableHead>

            {/* body */}
            <TableBody>
              {timeSlots.map((ts) => (
                <TableRow key={ts}>
                  {/* time-slot label */}
                  <TableCell
                    sx={{
                      backgroundColor: headerBg,
                      fontWeight: 500,
                      textAlign: "left",
                      borderRight: "1px solid",
                      borderColor: theme.palette.divider,
                    }}
                  >
                    {ts}
                  </TableCell>

                  {/* one cell per day */}
                  {daysOfWeek.map((day, idx) => (
                    <TableCell
                      key={day}
                      sx={{
                        backgroundColor: theme.palette.background.paper,
                        verticalAlign: "top",
                        p: 1.25,
                        height: 110,
                        borderRight:
                          idx < daysOfWeek.length - 1 ? "1px solid" : "none",
                        borderColor: theme.palette.divider,
                      }}
                    >
                      {grid[day][ts].map((e, i) => (
                        <Box
                          key={i}
                          className="schedule-card"
                          sx={{
                            mb: 1,
                            p: 1,
                            borderRadius: 1.5,
                            border: "1px solid",
                            borderColor: theme.palette.divider,
                            bgcolor: isDark
                              ? theme.palette.grey[900]
                              : theme.palette.common.white,
                          }}
                        >
                          <Stack spacing={0.75}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 0.5,
                                flexWrap: "wrap",
                              }}
                            >
                              <Tooltip
                                title={
                                  !hideTooltip && e.courseName
                                    ? e.courseName
                                    : ""
                                }
                                disableHoverListener={
                                  hideTooltip || !e.courseName || !isDesktop
                                }
                                disableFocusListener={
                                  hideTooltip || !e.courseName || !isDesktop
                                }
                                disableTouchListener={
                                  hideTooltip || !e.courseName || !isDesktop
                                }
                                slotProps={{
                                  popper: {
                                    className: "no-print",
                                  },
                                  tooltip: {
                                    sx: {
                                      fontSize: isDesktop
                                        ? "0.95rem"
                                        : undefined,
                                      padding: isDesktop
                                        ? "6px 10px"
                                        : undefined,
                                    },
                                  },
                                }}
                              >
                                <Chip
                                  size="small"
                                  color="primary"
                                  label={`${e.courseCode ?? ""}${
                                    e.section ? ` (${e.section})` : ""
                                  }`}
                                  sx={{ fontWeight: 600 }}
                                />
                              </Tooltip>

                              {!!e.sectionType && (
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  label={e.sectionType}
                                />
                              )}

                              {!!e.courseName && !hideTooltip && !isDesktop && (
                                <IconButton
                                  size="small"
                                  className="no-print"
                                  onClick={(ev) => {
                                    setAnchorEl(ev.currentTarget);
                                    setContent(e.courseName ?? "");
                                  }}
                                  aria-label="show course name"
                                >
                                  <InfoOutlinedIcon
                                    fontSize="inherit"
                                    color={isDark ? "secondary" : "primary"}
                                  />
                                </IconButton>
                              )}
                            </Box>

                            {!hideInstructor && !!e.instructor && (
                              <Typography
                                variant="caption"
                                component="div"
                                sx={{
                                  color: "text.secondary",
                                  textAlign: "center",
                                }}
                              >
                                {e.instructor}
                              </Typography>
                            )}

                            {!!e.hall && (
                              <Typography
                                variant="caption"
                                component="div"
                                sx={{
                                  color: "text.secondary",
                                  textAlign: "center",
                                }}
                              >
                                {e.hall}
                              </Typography>
                            )}
                            {showEnrollment && e.studentsInSection !== "" && (
                              <Typography
                                variant="caption"
                                component="div"
                                sx={{
                                  color: "text.secondary",
                                  textAlign: "center",
                                }}
                              >
                                Enrolled: {e.studentsInSection}
                              </Typography>
                            )}
                          </Stack>
                        </Box>
                      ))}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
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

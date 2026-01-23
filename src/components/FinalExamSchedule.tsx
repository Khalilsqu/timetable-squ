// src/pages/department/FinalExamSchedule.tsx
import { useMemo, type ReactNode } from "react";
import {
  Box,
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  Paper,
  useTheme,
} from "@mui/material";
import dayjs from "dayjs";
import PrintIcon from "@mui/icons-material/Print";
import type { SheetRow } from "@/src/lib/googleSheet";

interface FinalExamScheduleProps {
  data: SheetRow[];
  department: string;
  semester?: string;
  headerLeft?: ReactNode;
}

type ExamCellItem = {
  courseCode: string;
  courseName: string;
  instructor: string;
  examBuilding: string;
  examHall: string;
};

const mergeCsv = (a: string, b: string) => {
  const parts = [a, b]
    .flatMap((v) =>
      v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    )
    .filter(Boolean);
  return Array.from(new Set(parts)).join(", ");
};

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

const parseExamDate = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    return { dateStr: trimmed, dateObj };
  }

  const dmyMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    return { dateStr: trimmed, dateObj };
  }

  const fallback = new Date(trimmed);
  if (!Number.isNaN(fallback.getTime()))
    return { dateStr: trimmed, dateObj: fallback };
  return null;
};

/**
 * Displays a non-editable final exam schedule calendar for a department.
 * TODO: replace placeholder content with actual calendar layout.
 */
export default function FinalExamSchedule({
  data,
  department,
  semester,
  headerLeft,
}: FinalExamScheduleProps) {
  // access theme for divider colors
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const headerBg = isDark ? theme.palette.grey[900] : theme.palette.grey[100];
  // derive unique exam dates (DD/MM/YYYY)
  const dates = useMemo(() => {
    const uniq = Array.from(new Set(data.map((r) => String(r.exam_date ?? ""))))
      .map((v) => v.trim())
      .filter(Boolean);

    return uniq
      .map(parseExamDate)
      .filter((v): v is NonNullable<typeof v> => Boolean(v))
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [data]);

  // group columns into weeks for the header (e.g. Week 1, Week 2)
  const weekGroups = useMemo(() => {
    if (dates.length === 0) return [];
    // Anchor to Sunday of the first week
    const firstDate = dates[0].dateObj;
    const anchor = dayjs(firstDate).startOf("week"); // typically Sunday

    const groups: { label: string; count: number }[] = [];
    dates.forEach(({ dateObj }) => {
      const d = dayjs(dateObj);
      const diffDays = d.diff(anchor, "day");
      const weekNum = Math.floor(diffDays / 7) + 1;
      const label = `Week ${weekNum}`;

      if (groups.length > 0 && groups[groups.length - 1].label === label) {
        groups[groups.length - 1].count += 1;
      } else {
        groups.push({ label, count: 1 });
      }
    });
    return groups;
  }, [dates]);
  // derive time slots, excluding missing times
  const timeSlots = useMemo(() => {
    const slots = data
      .filter((r) => r.exam_start_time && r.exam_end_time)
      .map(
        (r) =>
          `${String(r.exam_start_time ?? "").trim()}-${String(
            r.exam_end_time ?? "",
          ).trim()}`,
      );
    const uniq = Array.from(new Set(slots));
    return uniq.sort((a, b) => {
      const tA = parseTimeRange(a);
      const tB = parseTimeRange(b);
      if (tA.startMins !== tB.startMins) return tA.startMins - tB.startMins;
      return tA.duration - tB.duration;
    });
  }, [data]);
  // build grid: dateStr -> timeslot -> entries
  const grid = useMemo(() => {
    const g: Record<string, Record<string, ExamCellItem[]>> = {};
    const agg: Record<
      string,
      Record<string, Record<string, ExamCellItem>>
    > = {};

    dates.forEach(({ dateStr }) => {
      g[dateStr] = {};
      agg[dateStr] = {};
      timeSlots.forEach((ts) => (g[dateStr][ts] = []));
      timeSlots.forEach((ts) => (agg[dateStr][ts] = {}));
    });

    data.forEach((row) => {
      const ds = String(row.exam_date ?? "").trim();
      const ts = `${String(row.exam_start_time ?? "").trim()}-${String(
        row.exam_end_time ?? "",
      ).trim()}`;
      if (!agg[ds] || !agg[ds][ts]) return;

      const courseCode = String(row.course_code ?? "").trim();
      if (!courseCode) return;

      const existing = agg[ds][ts][courseCode];
      if (!existing) {
        agg[ds][ts][courseCode] = {
          courseCode,
          courseName: String(row.course_name ?? "").trim(),
          instructor: String(row.instructor ?? "").trim(),
          examBuilding: String(row.exam_building ?? "").trim(),
          examHall: String(row.exam_hall ?? "").trim() || "TBA",
        };
      } else {
        existing.courseName =
          existing.courseName || String(row.course_name ?? "").trim();
        existing.instructor = mergeCsv(
          existing.instructor,
          String(row.instructor ?? "").trim(),
        );
        existing.examBuilding = mergeCsv(
          existing.examBuilding,
          String(row.exam_building ?? "").trim(),
        );
        existing.examHall = mergeCsv(
          existing.examHall,
          String(row.exam_hall ?? "").trim() || "TBA",
        );
      }
    });

    dates.forEach(({ dateStr }) => {
      timeSlots.forEach((ts) => {
        const items = Object.values(agg[dateStr]?.[ts] ?? {}).sort((a, b) =>
          a.courseCode.localeCompare(b.courseCode),
        );
        g[dateStr][ts] = items;
      });
    });

    return g;
  }, [data, dates, timeSlots]);

  if (data.length === 0) {
    return (
      <Box>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
          className="no-print"
        >
          <Typography variant="h6">
            Final Exam Schedule for {department}
            {semester ? `: ${semester}` : ""}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {headerLeft}
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={() => window.print()}
            >
              Print
            </Button>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary">
          No final exam schedule available.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* header with print button */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
        className="no-print"
      >
        <Typography variant="h6">
          Final Exam Schedule for {department}
          {semester ? `: ${semester}` : ""}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {headerLeft}
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
          >
            Print
          </Button>
        </Box>
      </Box>
      <TableContainer
        component={Paper}
        sx={{
          mb: 2,
          overflowX: "auto",
          maxHeight: "min(72vh, 720px)",
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
        <Table
          size="small"
          stickyHeader
          sx={{
            minWidth: 900,
            "& .MuiTableCell-root": { borderColor: theme.palette.divider },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  backgroundColor: headerBg,
                  fontWeight: 600,
                  borderRight: "1px solid",
                  borderColor: theme.palette.divider,
                  textAlign: "center",
                }}
              >
                Week
              </TableCell>
              {weekGroups.map((wg, idx) => (
                <TableCell
                  key={`${wg.label}-${idx}`}
                  align="center"
                  colSpan={wg.count}
                  sx={{
                    backgroundColor: headerBg,
                    fontWeight: 700,
                    borderRight:
                      idx < weekGroups.length - 1 ? "1px solid" : "none",
                    borderColor: theme.palette.divider,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    fontSize: "0.75rem",
                  }}
                >
                  {wg.label}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell
                sx={{
                  backgroundColor: headerBg,
                  fontWeight: 600,
                  borderRight: "1px solid",
                  borderColor: theme.palette.divider,
                }}
              >
                Time
              </TableCell>
              {dates.map(({ dateStr, dateObj }, idx) => (
                <TableCell
                  key={dateStr}
                  align="center"
                  sx={{
                    backgroundColor: headerBg,
                    fontWeight: 600,
                    borderRight: idx < dates.length - 1 ? "1px solid" : "none",
                    borderColor: theme.palette.divider,
                  }}
                >
                  <Box>
                    <Typography variant="body2">
                      {dateObj.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "2-digit",
                      })}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ marginTop: -0.5, display: "block" }}
                    >
                      {dateObj.getFullYear()}
                    </Typography>
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {timeSlots.map((ts) => (
              <TableRow key={ts}>
                <TableCell
                  sx={{
                    backgroundColor: headerBg,
                    fontWeight: 500,
                    borderRight: "1px solid",
                    borderColor: theme.palette.divider,
                  }}
                >
                  {ts}
                </TableCell>
                {dates.map(({ dateStr }, idx) => (
                  <TableCell
                    key={`${dateStr}-${ts}`}
                    align="center"
                    sx={{
                      borderRight:
                        idx < dates.length - 1 ? "1px solid" : "none",
                      borderColor: theme.palette.divider,
                      verticalAlign: "top",
                      p: 1.25,
                    }}
                  >
                    <Stack spacing={1}>
                      {grid[dateStr][ts].map((item) => (
                        <Box
                          key={item.courseCode}
                          sx={{
                            p: 1,
                            borderRadius: 1.5,
                            border: "1px solid",
                            borderColor: theme.palette.divider,
                            bgcolor: isDark
                              ? theme.palette.grey[900]
                              : theme.palette.common.white,
                          }}
                        >
                          <Stack spacing={0.75} alignItems="center">
                            <Tooltip
                              className="no-print"
                              title={item.courseName || ""}
                              disableHoverListener={!item.courseName}
                              disableFocusListener={!item.courseName}
                              disableTouchListener={!item.courseName}
                            >
                              <Chip
                                size="small"
                                color="primary"
                                label={item.courseCode}
                                sx={{ fontWeight: 600 }}
                              />
                            </Tooltip>

                            {item.examHall ? (
                              <Typography
                                variant="caption"
                                sx={{ color: "text.secondary" }}
                              >
                                {item.examHall}
                              </Typography>
                            ) : null}

                            {item.instructor ? (
                              <Typography
                                variant="caption"
                                sx={{ color: "text.secondary" }}
                              >
                                {item.instructor}
                              </Typography>
                            ) : null}
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

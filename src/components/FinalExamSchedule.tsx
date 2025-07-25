// src/pages/department/FinalExamSchedule.tsx
import { useMemo } from "react";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  useTheme,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import type { SheetRow } from "@/src/lib/googleSheet";

interface FinalExamScheduleProps {
  data: SheetRow[];
  department: string;
  semester?: string;
}

/**
 * Displays a non-editable final exam schedule calendar for a department.
 * TODO: replace placeholder content with actual calendar layout.
 */
export default function FinalExamSchedule({
  data,
  department,
  semester,
}: FinalExamScheduleProps) {
  // access theme for divider colors
  const theme = useTheme();
  // derive unique exam dates (DD/MM/YYYY)
  const dates = useMemo(() => {
    const uniq = Array.from(
      new Set(data.map((r) => String(r.exam_date ?? "")))
    ).filter(Boolean);
    // parse and sort
    return uniq
      .map((ds) => {
        const [d, m, y] = ds.split("/").map(Number);
        return { dateStr: ds, dateObj: new Date(y, m - 1, d) };
      })
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [data]);
  // derive time slots, excluding missing times
  const timeSlots = useMemo(() => {
    const slots = data
      .filter((r) => r.exam_start_time && r.exam_end_time)
      .map(
        (r) => `${r.exam_start_time as string}-${r.exam_end_time as string}`
      );
    const uniq = Array.from(new Set(slots));
    return uniq.sort();
  }, [data]);
  // build grid: dateStr -> timeslot -> entries
  const grid = useMemo(() => {
    const g: Record<string, Record<string, SheetRow[]>> = {};
    dates.forEach(({ dateStr }) => {
      g[dateStr] = {};
      timeSlots.forEach((ts) => (g[dateStr][ts] = []));
    });
    data.forEach((row) => {
      const ds = String(row.exam_date);
      const ts = `${row.exam_start_time as string}-${
        row.exam_end_time as string
      }`;
      if (g[ds] && g[ds][ts]) g[ds][ts].push(row);
    });
    return g;
  }, [data, dates, timeSlots]);

  if (data.length === 0) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Final Exam Schedule for {department}
          {semester ? ` · ${semester}` : ""}
        </Typography>
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
          Final Exam Schedule
          {semester ? `: ${semester}` : ""}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={() => window.print()}
        >
          Print
        </Button>
      </Box>
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
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
                    }}
                  >
                    {grid[dateStr][ts]
                      .filter(
                        (row, idx, arr) =>
                          arr.findIndex(
                            (r) => r.course_code === row.course_code
                          ) === idx
                      )
                      .map((row) => (
                        <Box key={String(row.course_code)} sx={{ mb: 1 }}>
                          <Typography variant="body2">
                            {String(row.course_code)}
                            {row.exam_hall ? ` @ ${row.exam_hall}` : ""}
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
    </Box>
  );
}

import { useMemo, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  Autocomplete,
  Chip,
  FormControlLabel,
  Switch,
  Paper,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import PageTransition from "@/src/components/layout/PageTransition";
import WeeklySchedule from "@/src/components/WeeklySchedule";
import MyCustomSpinner from "@/src/components/MyCustomSpinner";
import { MaterialReactTable, type MRT_ColumnDef } from "material-react-table";
import { useSemesters, useScheduleRows } from "@/src/lib/queries";
import { useFilterStore } from "@/src/stores/filterStore";
import type { SheetRow } from "@/src/lib/googleSheet";
import { buildScheduleColumns } from "@/src/pages/entryPage/timetable/columns";
import {
  useCommonSlotStore,
  type CommonSlotMode,
  type CommonSlotView,
} from "@/src/stores/commonSlotStore";
import CommonSlotHelpDialog from "./CommonSlotHelpDialog";

/* ---------- Time helpers ---------- */
const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
  return h * 60 + m;
};

const overlaps = (
  rowStart: string,
  rowEnd: string,
  selStart: string,
  selEnd: string
) => {
  const rs = toMinutes(rowStart);
  const re = toMinutes(rowEnd);
  const ss = toMinutes(selStart);
  const se = toMinutes(selEnd);
  if ([rs, re, ss, se].some(Number.isNaN)) return false;
  return rs < se && re > ss;
};

/* ---------- Day normalization ---------- */
const DAY_ORDER: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  weds: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};
const DAY_CANON = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function canonicalDay(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toLowerCase();
  const ord = DAY_ORDER[key];
  return ord === undefined ? null : DAY_CANON[ord];
}

// Supports "Mon/Wed", "Mon,Wed", "Mon & Wed"
function extractCanonicalDays(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  const parts = raw.split(/[^A-Za-z]+/).filter(Boolean);
  const uniq: string[] = [];
  for (const p of parts) {
    const c = canonicalDay(p);
    if (c && !uniq.includes(c)) uniq.push(c);
  }
  return uniq;
}

/* ---------- Component ---------- */
export default function CommonSlot() {
  const { data: semInfo } = useSemesters();
  const storeSemester = useFilterStore((s) => s.semester);
  const semester = storeSemester || semInfo?.active || "";
  const { data: rows = [], isLoading, isFetching } = useScheduleRows(semester);

  const {
    mode,
    start,
    end,
    days,
    hall,
    view,
    setMode,
    setStart,
    setEnd,
    setDays,
    setHall,
    setView,
    reset,
  } = useCommonSlotStore();

  const [helpOpen, setHelpOpen] = useState(false);

  // All selectable days (canonical)
  const allDays = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .flatMap((r) => extractCanonicalDays(r.day))
            .filter((d): d is string => !!d)
        )
      ).sort((a, b) => DAY_ORDER[a.toLowerCase()] - DAY_ORDER[b.toLowerCase()]),
    [rows]
  );

  const halls = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => String(r.hall || "").trim()).filter(Boolean))
      ).sort(),
    [rows]
  );

  const columns = useMemo<MRT_ColumnDef<SheetRow>[]>(buildScheduleColumns, []);

  const filtered = useMemo(() => {
    if (!rows.length) return [];
    if (toMinutes(start) >= toMinutes(end)) return [];
    return rows.filter((r) => {
      const rs = String(r.start_time || "").slice(0, 5);
      const re = String(r.end_time || "").slice(0, 5);
      if (!overlaps(rs, re, start, end)) return false;

      const rowDays = extractCanonicalDays(r.day);
      if (days.length && !rowDays.some((d) => days.includes(d))) return false;

      if (mode === "hall" && hall && String(r.hall || "").trim() !== hall)
        return false;
      return true;
    });
  }, [rows, start, end, days, hall, mode]);

  if (isLoading) return <MyCustomSpinner />;

  return (
    <PageTransition>
      <Box p={2} display="flex" flexDirection="column" gap={2}>
        <Typography
          variant="h5"
          fontWeight={600}
          display="flex"
          alignItems="center"
          gap={1}
        >
          Common Slot
          {semester && (
            <Typography component="span" variant="subtitle1">
              ({semester})
            </Typography>
          )}
          <Tooltip title="Explain filters" arrow>
            <IconButton
              size="small"
              color="primary"
              aria-label="open help"
              onClick={() => setHelpOpen(true)}
            >
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>

        <CommonSlotHelpDialog
          open={helpOpen}
          onClose={() => setHelpOpen(false)}
        />

        <Paper
          variant="outlined"
          sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}
        >
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
            <ToggleButtonGroup
              size="small"
              color="primary"
              value={mode}
              exclusive
              onChange={(_, v: CommonSlotMode | null) => v && setMode(v)}
            >
              <ToggleButton value="slot">Time Slot</ToggleButton>
              <ToggleButton value="hall">Hall Occupancy</ToggleButton>
            </ToggleButtonGroup>

            <ToggleButtonGroup
              size="small"
              color="primary"
              value={view}
              exclusive
              onChange={(_, v: CommonSlotView | null) => v && setView(v)}
            >
              <ToggleButton value="schedule">Schedule</ToggleButton>
              <ToggleButton value="table">Table</ToggleButton>
            </ToggleButtonGroup>

            <Tooltip title="Reset">
              <IconButton size="small" onClick={() => reset()}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <Divider />

          <Box display="flex" gap={2} flexWrap="wrap">
            <TextField
              label="Start"
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              size="small"
              inputProps={{ step: 300 }}
            />
            <TextField
              label="End"
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              size="small"
              inputProps={{ step: 300 }}
              error={toMinutes(start) >= toMinutes(end)}
              helperText={
                toMinutes(start) >= toMinutes(end)
                  ? "End must be after Start"
                  : " "
              }
            />

            <Autocomplete
              multiple
              size="small"
              options={allDays}
              value={days}
              onChange={(_, v) => setDays(v)}
              renderTags={(value, getTagProps) =>
                value.map((option, idx) => (
                  <Chip
                    label={option}
                    size="small"
                    {...getTagProps({ index: idx })}
                    key={option}
                  />
                ))
              }
              renderInput={(params) => <TextField {...params} label="Days" />}
              sx={{ minWidth: 220 }}
            />

            {mode === "hall" && (
              <Autocomplete
                size="small"
                options={halls}
                value={hall}
                onChange={(_, v) => setHall(v)}
                renderInput={(params) => <TextField {...params} label="Hall" />}
                sx={{ minWidth: 220 }}
              />
            )}
          </Box>

          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={view === "table"}
                onChange={() =>
                  setView(view === "table" ? "schedule" : "table")
                }
              />
            }
            label={view === "table" ? "Table View" : "Schedule View"}
            sx={{ alignSelf: "flex-start", mt: -1 }}
          />
        </Paper>

        <Box>
          <Typography variant="subtitle2" mb={1} color="text.secondary">
            {filtered.length} matching{" "}
            {filtered.length === 1 ? "section" : "sections"}
          </Typography>

          {isFetching && <MyCustomSpinner />}

          {view === "schedule" ? (
            <WeeklySchedule
              data={filtered}
              semester={semester || undefined}
              hideTooltip
            />
          ) : (
            <MaterialReactTable
              data={filtered}
              columns={columns}
              enableRowVirtualization
              enableColumnVirtualization
              enableColumnResizing
              columnResizeMode="onChange"
              initialState={{
                density: "compact",
                pagination: { pageIndex: 0, pageSize: 50 },
              }}
              muiTableContainerProps={{
                sx: { maxHeight: { xs: "60vh", md: "70vh" } },
              }}
            />
          )}
        </Box>
      </Box>
    </PageTransition>
  );
}

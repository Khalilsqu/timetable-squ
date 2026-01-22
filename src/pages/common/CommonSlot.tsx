import { useMemo, useState, useTransition, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  Autocomplete,
  Chip,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  Collapse,
  InputAdornment,
  LinearProgress,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import UnfoldLessOutlinedIcon from "@mui/icons-material/UnfoldLessOutlined";
import UnfoldMoreOutlinedIcon from "@mui/icons-material/UnfoldMoreOutlined";

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
  type TimeFilterMode,
} from "@/src/stores/commonSlotStore";
import CommonSlotHelpDialog from "./CommonSlotHelpDialog";
import CommonSlotDownloadButton from "./CommonSlotDownloadButton";

/* ---------- Time helpers ---------- */
const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
  return h * 60 + m;
};

const overlapsInterval = (rs: number, re: number, ss: number, se: number) =>
  rs < se && re > ss;

const withinInterval = (rs: number, re: number, ss: number, se: number) =>
  rs >= ss && re <= se;

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
  const { data: semInfo, isLoading: semLoading } = useSemesters();
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
    timeMode,
    // NEW:
    minCapacity,
    setMinCapacity,
    // setters
    setMode,
    setStart,
    setEnd,
    setDays,
    setHall,
    setView,
    setTimeMode,
    reset,
  } = useCommonSlotStore();

  const [helpOpen, setHelpOpen] = useState(false);
  const [capInfoOpen, setCapInfoOpen] = useState(false); // NEW
  const [isPending, startTransition] = useTransition();
  const [isSwitching, setIsSwitching] = useState(false);
  const [isMounting, setIsMounting] = useState(true);

  useEffect(() => {
    // Force a small delay to ensure common UI is painted
    const timer = setTimeout(() => setIsMounting(false), 30);
    return () => clearTimeout(timer);
  }, []);

  const handleViewChange = (v: CommonSlotView) => {
    if (v === view) return;
    // 1. Immediate high-priority update to show loader
    setIsSwitching(true);

    // 2. Delay the heavy render to allow browser to paint the loader
    setTimeout(() => {
      startTransition(() => {
        setView(v);
      });
    }, 60);
  };

  const prevView = useRef(view);
  useEffect(() => {
    if (prevView.current !== view) {
      if (isSwitching) setIsSwitching(false);
      prevView.current = view;
    }
  }, [view, isSwitching]);

  // pagination state (same pattern as EntryPage)
  const pagination = useFilterStore((s) => s.pagination);
  const setPagination = useFilterStore((s) => s.setPagination);
  const [showPagination, setShowPagination] = useState(false);

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
    const ss = toMinutes(start);
    const se = toMinutes(end);
    if (ss >= se) return [];
    return rows.filter((r) => {
      const rs = toMinutes(String(r.start_time || "").slice(0, 5));
      const re = toMinutes(String(r.end_time || "").slice(0, 5));
      if ([rs, re].some(Number.isNaN)) return false;

      const timeOk =
        timeMode === "overlap"
          ? overlapsInterval(rs, re, ss, se)
          : withinInterval(rs, re, ss, se);
      if (!timeOk) return false;

      const rowDays = extractCanonicalDays(r.day);
      if (days.length && !rowDays.some((d) => days.includes(d))) return false;

      // NEW: hall capacity filter (>= minCapacity)
      const capRaw = String(r.room_capacity ?? "").trim();
      const capNum = Math.floor(Number(capRaw));
      const capacity = Number.isFinite(capNum) ? capNum : 0;
      if (capacity < minCapacity) return false;

      if (mode === "hall" && hall && String(r.hall || "").trim() !== hall)
        return false;

      return true;
    });
  }, [rows, start, end, days, hall, mode, timeMode, minCapacity]);

  if (isLoading || semLoading || isMounting) {
    return (
      <Box
        sx={{
          minHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MyCustomSpinner />
      </Box>
    );
  }

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
            <Box
              role="button"
              tabIndex={0}
              aria-label="open help"
              onClick={() => setHelpOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setHelpOpen(true);
                }
              }}
              sx={{
                ml: 0.5,
                cursor: "pointer",
                userSelect: "none",
                bgcolor: "primary.main",
                color: "primary.contrastText",
                borderRadius: "10px",
                px: 1,
                py: 0.25,
                fontSize: 10,
                lineHeight: 1,
                fontWeight: 600,
                letterSpacing: 0.5,
                display: "inline-flex",
                gap: 0.4,
                alignItems: "center",
                justifyContent: "center",
                textTransform: "uppercase",
                boxShadow: (t) => `0 0 0 1px ${t.palette.primary.dark} inset`,
                "&:hover": {
                  bgcolor: "primary.dark",
                },
                "&:focus-visible": {
                  outline: (t) => `2px solid ${t.palette.primary.light}`,
                  outlineOffset: 2,
                },
              }}
            >
              HELP
              <InfoOutlinedIcon
                fontSize="inherit"
                sx={{
                  fontSize: 14,
                  mt: "-1px",
                }}
                aria-hidden="true"
              />
            </Box>
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
              onChange={(_, v: CommonSlotView | null) => {
                if (v) handleViewChange(v);
              }}
            >
              <ToggleButton value="schedule">Schedule</ToggleButton>
              <ToggleButton value="table">Table</ToggleButton>
            </ToggleButtonGroup>

            <ToggleButtonGroup
              size="small"
              color="primary"
              value={timeMode}
              exclusive
              onChange={(_, v: TimeFilterMode | null) => v && setTimeMode(v)}
            >
              <ToggleButton value="overlap">Overlap</ToggleButton>
              <ToggleButton value="within">Within</ToggleButton>
            </ToggleButtonGroup>

            <Tooltip title="Reset">
              <IconButton size="small" onClick={() => reset()}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <CommonSlotDownloadButton
              rows={filtered}
              columns={columns}
              semester={semester}
            />
          </Box>

          <Divider />

          <Box display="flex" gap={2} flexWrap="wrap">
            <TextField
              label="Start"
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              size="small"
              slotProps={{ htmlInput: { step: 300 } }}
            />
            <TextField
              label="End"
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              size="small"
              slotProps={{ htmlInput: { step: 300 } }}
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

            {/* Min Capacity numeric filter with info toggle */}
            <Box sx={{ width: 150 }}>
              <TextField
                fullWidth
                label="Min Capacity"
                type="number"
                value={minCapacity}
                onChange={(e) => {
                  const n = Math.floor(Number(e.target.value ?? 0));
                  setMinCapacity(Number.isFinite(n) && n > 0 ? n : 0);
                }}
                size="small"
                slotProps={{
                  htmlInput: {
                    min: 0,
                    step: 1,
                    inputMode: "numeric",
                    pattern: "[0-9]*",
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        aria-label="About capacity filter"
                        aria-expanded={capInfoOpen}
                        aria-controls="capacity-help"
                        onClick={() => setCapInfoOpen((v) => !v)}
                        edge="end"
                      >
                        <InfoOutlinedIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Collapse in={capInfoOpen} unmountOnExit>
                <Typography
                  id="capacity-help"
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.5 }}
                >
                  Rooms with capacity ≥ value
                </Typography>
              </Collapse>
            </Box>

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

          <ToggleButtonGroup
            size="small"
            color="primary"
            value={view}
            exclusive
            onChange={(_, v: CommonSlotView | null) => {
              if (v) handleViewChange(v);
            }}
            sx={{ alignSelf: "flex-start", mt: -1 }}
          >
            <ToggleButton value="schedule">Schedule View</ToggleButton>
            <ToggleButton value="table">Table View</ToggleButton>
          </ToggleButtonGroup>
        </Paper>

        <Box sx={{ position: "relative", minHeight: 400 }}>
          <Typography variant="subtitle2" mb={1} color="text.secondary">
            {filtered.length} matching{" "}
            {filtered.length === 1 ? "section" : "sections"}
          </Typography>

          {(isPending || isSwitching || isFetching) && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                zIndex: 100,
                display: "flex",
                flexDirection: "column",
                bgcolor: (t) =>
                  t.palette.mode === "dark"
                    ? "rgba(18, 18, 18, 0.7)"
                    : "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(4px)",
              }}
            >
              <LinearProgress color="primary" sx={{ height: 4 }} />
              <Box
                flex={1}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <MyCustomSpinner />
              </Box>
            </Box>
          )}

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
              enablePagination={showPagination}
              initialState={{ density: "compact" }}
              rowCount={filtered.length}
              state={{
                pagination: {
                  pageIndex: pagination.pageIndex,
                  pageSize: pagination.pageSize,
                },
              }}
              onPaginationChange={(updater) => {
                const next =
                  typeof updater === "function" ? updater(pagination) : updater;
                setPagination(next);
              }}
              muiTableContainerProps={{
                sx: { maxHeight: { xs: "60vh", md: "70vh" } },
              }}
              muiPaginationProps={{
                rowsPerPageOptions: [
                  { label: "10", value: 10 },
                  { label: "25", value: 25 },
                  { label: "50", value: 50 },
                  { label: "100", value: 100 },
                  { label: "200", value: 200 },
                ],
              }}
              muiTableHeadCellProps={{
                sx: { whiteSpace: "normal", wordBreak: "break-word" },
              }}
              muiTableBodyCellProps={{
                sx: { whiteSpace: "normal", wordBreak: "break-word" },
              }}
              renderBottomToolbarCustomActions={() => (
                <Box
                  sx={{
                    flex: "1 1 auto",
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    px: 2,
                    gap: 1,
                  }}
                >
                  {!showPagination && (
                    <Typography variant="caption" color="text.secondary">
                      {filtered.length} rows
                    </Typography>
                  )}
                  <Tooltip
                    title={
                      showPagination ? "Hide Pagination" : "Show Pagination"
                    }
                    arrow
                  >
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => setShowPagination((p) => !p)}
                      aria-label={
                        showPagination
                          ? "collapse pagination"
                          : "expand pagination"
                      }
                    >
                      {showPagination ? (
                        <UnfoldLessOutlinedIcon />
                      ) : (
                        <UnfoldMoreOutlinedIcon />
                      )}
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            />
          )}
        </Box>
      </Box>
    </PageTransition>
  );
}

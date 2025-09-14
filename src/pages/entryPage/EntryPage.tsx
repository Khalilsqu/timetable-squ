// src/pages/entryPage/EntryPage.tsx

import { useMemo, useEffect, useTransition, useState } from "react";
import {
  MaterialReactTable,
  // MRT_GlobalFilterTextField,
  // MRT_ToggleFiltersButton,
  type MRT_ColumnDef,
} from "material-react-table";
// import {
//   MRT_ShowHideColumnsButton,
//   MRT_ToggleDensePaddingButton,
//   MRT_ToggleFullScreenButton,
// } from "material-react-table";
import type { SheetRow } from "@/src/lib/googleSheet";
import { buildScheduleColumns } from "@/src/pages/entryPage/timetable/columns";
import { useFilterStore } from "@/src/stores/filterStore";

import { useSemesterLastUpdate, useSemesters } from "@/src/lib/queries";
import { useScheduleRows } from "@/src/lib/queries";
import MyCustomSpinner from "@/src/components/MyCustomSpinner";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";

import UnfoldLessOutlinedIcon from "@mui/icons-material/UnfoldLessOutlined";
import UnfoldMoreOutlinedIcon from "@mui/icons-material/UnfoldMoreOutlined";

import WeeklySchedule from "@/src/components/WeeklySchedule";
import { useEntryPageViewStore } from "@/src/stores/entryPageViewStore";
// import DownloadIcon from "@mui/icons-material/Download";
// import { mkConfig, generateCsv, download } from "export-to-csv";
/* ———————————————————————————————————————————
   Main viewer component
   ——————————————————————————————————————————— */

// Day types
const DAY_DISPLAY_ORDER = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;
type DayCanon = (typeof DAY_DISPLAY_ORDER)[number];

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
// return typed day
const canonicalDay = (raw: unknown): DayCanon | null => {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toLowerCase();
  const ord = DAY_ORDER[key];
  return ord === undefined ? null : DAY_DISPLAY_ORDER[ord];
};

const extractCanonicalDays = (raw: unknown): DayCanon[] => {
  if (typeof raw !== "string") return [];
  const parts = raw.split(/[^A-Za-z]+/).filter(Boolean);
  const uniq: DayCanon[] = [];
  for (const p of parts) {
    const c = canonicalDay(p);
    if (c && !uniq.includes(c)) uniq.push(c);
  }
  return uniq;
};

const isHHMM = (s: string) => /^\d{2}:\d{2}$/.test(s);

// Add an explicit day index helper so WeeklySchedule gets Sun→Thu order
const dayIndex = (d: DayCanon) => DAY_DISPLAY_ORDER.indexOf(d);

/* Typed schedule row used by WeeklySchedule */
type ScheduleRow = SheetRow & {
  day: DayCanon;
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
  hall: string;
};

export default function EntryPage() {
  const [isPending, startTransition] = useTransition();
  const { pagination, setPagination } = useFilterStore();
  const [showPagination, setShowPagination] = useState(false);

  /* 1. fetch + preprocess */

  const {
    data: semData,
    isLoading: semLoading,
    isFetching: semFetching,
  } = useSemesters();

  /* store-selected semester takes priority over the active one */
  const semesterFromStore = useFilterStore((s) => s.semester);
  const semester = semesterFromStore || semData?.active || "";

  const {
    data: rows = [],
    isLoading: rowsLoading,
    isFetching: rowsFetching,
  } = useScheduleRows(semester);

  const {
    data: lastUpdateData,
    isLoading: lastUpdateLoading,
    isFetching: lastUpdateFetching,
  } = useSemesterLastUpdate(semester);

  // apply user-selected filters from filterStore
  const {
    colleges,
    departments,
    courses,
    university_elective,
    university_requirement,
    credit_hours_min,
    credit_hours_max,
    setFilteredNumber,
    setIsFiltering,
    level,
    course_languages,
  } = useFilterStore();

  useEffect(() => setIsFiltering(isPending), [isPending, setIsFiltering]);

  const isYes = (v: unknown) => {
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      return s === "yes" || s === "y" || s === "true" || s === "1";
    }
    return false;
  };

  // filter rows based on store selections
  const filteredRows = useMemo(
    () =>
      rows.filter((r) => {
        if (colleges.length && !colleges.includes(String(r.college)))
          return false;
        if (departments.length && !departments.includes(String(r.department)))
          return false;
        if (courses.length && !courses.includes(String(r.course_code)))
          return false;

        // Apply checkbox semantics:
        // if checked → include only rows marked yes; if unchecked → don't filter by it.
        if (university_elective && !isYes(r.university_elective)) return false;
        if (university_requirement && !isYes(r.university_requirement))
          return false;

        // Level
        if (level) {
          const rowLevel = String(r.level ?? "")
            .trim()
            .toUpperCase();
          if (rowLevel !== level.toUpperCase()) return false;
        }

        // Language
        if (course_languages.length) {
          const lang = String(r.course_language ?? "").trim();
          if (!course_languages.includes(lang)) return false;
        }

        // Credit hours
        const ch = Number(r.credit_hours ?? 0);
        if (Number.isFinite(ch)) {
          if (ch < credit_hours_min || ch > credit_hours_max) return false;
        }

        return true;
      }),
    [
      rows,
      colleges,
      departments,
      courses,
      university_elective,
      university_requirement,
      credit_hours_min,
      credit_hours_max,
      level,
      course_languages,
    ]
  );

  useEffect(() => {
    // update filtered number in the store
    startTransition(() => {
      setFilteredNumber(filteredRows.length);
    });
  }, [filteredRows.length, setFilteredNumber]);

  /* 2. columns are fixed – memoise once */
  const columns = useMemo<MRT_ColumnDef<SheetRow>[]>(buildScheduleColumns, []);

  /* 3. data is memoised to avoid re-renders on other state changes */
  const tableData = useMemo(() => filteredRows, [filteredRows]);

  // const csvConfig = useMemo(
  //   () =>
  //     mkConfig({
  //       filename: `schedule_${semester || "all"}`, // exported file name
  //       fieldSeparator: ",",
  //       decimalSeparator: ".",
  //       useKeysAsHeaders: true, // header row
  //     }),
  //   [semester]
  // );

  const { view } = useEntryPageViewStore();

  // sanitize for WeeklySchedule to avoid null/invalid fields
  const scheduleRows = useMemo<ScheduleRow[]>(() => {
    return filteredRows
      .map((r) => {
        const start = String(r.start_time ?? "").slice(0, 5);
        const end = String(r.end_time ?? "").slice(0, 5);
        const days = extractCanonicalDays(r.day);
        const day = days[0] ?? null;
        const hall = String(r.hall ?? "TBA").trim() || "TBA";
        if (!day || !isHHMM(start) || !isHHMM(end)) return null;
        return {
          ...r,
          day,
          start_time: start,
          end_time: end,
          hall,
        } as ScheduleRow;
      })
      .filter((x): x is ScheduleRow => x !== null)
      .sort((a, b) => dayIndex(a.day) - dayIndex(b.day));
  }, [filteredRows]);

  /* render */
  return view === "schedule" ? (
    <WeeklySchedule
      data={scheduleRows}
      semester={semester || undefined}
      hideTooltip
    />
  ) : (
    <MaterialReactTable
      // virtualize rows and columns for performance on large datasets
      enableRowVirtualization
      enableColumnVirtualization
      // allow user to resize columns
      enableColumnResizing
      columnResizeMode="onChange"
      // control pagination visibility
      enablePagination={showPagination}
      columns={columns}
      data={tableData}
      rowCount={filteredRows.length}
      initialState={{ density: "compact" }}
      state={{
        isLoading: rowsLoading || semLoading || lastUpdateLoading,
        showProgressBars: rowsFetching || semFetching || lastUpdateFetching,
        pagination: {
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
        },
      }}
      onPaginationChange={(updater) => {
        const newPagination =
          typeof updater === "function" ? updater(pagination) : updater;
        setPagination(newPagination);
      }}
      muiCircularProgressProps={{
        Component: <MyCustomSpinner />,
      }}
      muiTableContainerProps={{
        sx: { maxHeight: { xs: "65vh", md: "70vh", xl: "78vh" } },
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
            justifyContent: "space-between",
            alignItems: "center",
            px: 2,
          }}
        >
          {/* LEFT  – existing “last updated” stamp */}
          {lastUpdateData && (
            <Typography variant="caption" color="text.secondary">
              Last updated:{" "}
              {lastUpdateData.parsed.toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric",
              })}
            </Typography>
          )}

          {/* RIGHT – filtered count and toggle */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* show count when pagination is disabled */}
            {!showPagination && (
              <Typography variant="caption" color="text.secondary">
                {filteredRows.length} rows
              </Typography>
            )}
            <Tooltip
              title={showPagination ? "Hide Pagination" : "Show Pagination"}
              arrow
            >
              <IconButton
                size="small"
                color="primary"
                onClick={() => setShowPagination((p) => !p)}
                aria-label={
                  showPagination ? "collapse pagination" : "expand pagination"
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
        </Box>
      )}
      // renderToolbarInternalActions={({ table }) => (
      //   <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      //     {/* built-in buttons */}
      //     <MRT_GlobalFilterTextField table={table} />
      //     <MRT_ToggleFiltersButton table={table} />
      //     <MRT_ShowHideColumnsButton table={table} />
      //     <MRT_ToggleDensePaddingButton table={table} />
      //     <MRT_ToggleFullScreenButton table={table} />

      //     {/* custom download button */}
      //     <Tooltip title="Download CSV" arrow>
      //       <IconButton
      //         size="small"
      //         color="primary"
      //         onClick={() => {
      //           const allRows = table
      //             .getPrePaginationRowModel()
      //             .rows.map((r) => r.original);

      //           // convert Dates → strings for export-to-csv
      //           const cleaned = allRows.map((row) =>
      //             Object.fromEntries(
      //               Object.entries(row).map(([k, v]) => [
      //                 k,
      //                 v instanceof Date ? v.toISOString() : v,
      //               ])
      //             )
      //           );

      //           const csv = generateCsv(csvConfig)(cleaned);
      //           download(csvConfig)(csv);
      //         }}
      //       >
      //         <DownloadIcon />
      //       </IconButton>
      //     </Tooltip>
      //   </Box>
      // )}
    />
  );
}

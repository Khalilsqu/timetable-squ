// src/pages/entryPage/EntryPage.tsx

import { useMemo, useEffect, useTransition } from "react";
import { MaterialReactTable, type MRT_ColumnDef } from "material-react-table";
import type { SheetRow } from "@/src/lib/googleSheet";
import { buildScheduleColumns } from "@/src/pages/entryPage/timetable/columns";
import { useFilterStore } from "@/src/stores/filterStore";

import { useSemesterLastUpdate, useSemesters } from "@/src/lib/queries";
import { useScheduleRows } from "@/src/lib/queries";
import MyCustomSpinner from "@/src/components/MyCustomSpinner";
import { Box, Typography } from "@mui/material";

/* ———————————————————————————————————————————
   Main viewer component
   ——————————————————————————————————————————— */
export default function EntryPage() {
  const [isPending, startTransition] = useTransition();
  const { pagination, setPagination } = useFilterStore();

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
    setFilteredNumber,
    setIsFiltering,
  } = useFilterStore();

  useEffect(() => setIsFiltering(isPending), [isPending, setIsFiltering]);

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
        if (
          university_elective !== null &&
          r.university_elective !== university_elective
        )
          return false;
        if (
          university_requirement !== null &&
          r.university_requirement !== university_requirement
        )
          return false;
        return true;
      }),
    [
      rows,
      colleges,
      departments,
      courses,
      university_elective,
      university_requirement,
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

  /* 4. render */
  return (
    <MaterialReactTable
      columns={columns}
      data={tableData}
      rowCount={filteredRows.length}
      state={{
        density: "compact",
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
        sx: { maxHeight: { xs: "65vh", md: "70vh", xl: "80vh" } },
      }}
      renderBottomToolbarCustomActions={() => (
        <Box sx={{ flex: 1, textAlign: "left", pl: 2 }}>
          {lastUpdateData && (
            <Typography variant="caption" color="text.secondary">
              Last updated:{" "}
              {lastUpdateData?.parsed.toLocaleString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric",
              })}
            </Typography>
          )}
        </Box>
      )}
    />
  );
}

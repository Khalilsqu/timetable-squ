// src\pages\student\TimetableSummaryTable.tsx
import { MRT_Table, useMaterialReactTable } from "material-react-table";
import type { MRT_ColumnDef } from "material-react-table";
import { Box, useTheme } from "@mui/material";
import { useMemo } from "react";

export type Row = {
  code: string;
  courseName: string;
  creditHours: number;
  section: string;
  instructor: string;
  examDate: string;
};

interface Props {
  rows: Row[];
}

export default function TimetableSummaryTable({ rows }: Props) {
  const theme = useTheme();

  const columns = useMemo<MRT_ColumnDef<Row>[]>(
    () => [
      { accessorKey: "code", header: "Course Code" },
      { accessorKey: "courseName", header: "Course Name" },
      {
        accessorKey: "creditHours",
        header: "CR",
        size: 60,
        muiTableHeadCellProps: { sx: { textAlign: "right" } },
        muiTableBodyCellProps: { sx: { textAlign: "right" } },
        Cell: ({ cell }) => {
          const v = cell.getValue<number>();
          return Number.isFinite(v) ? v : "";
        },
      },
      { accessorKey: "section", header: "Section #" },
      { accessorKey: "instructor", header: "Instructor" },
      { accessorKey: "examDate", header: "Exam Date" },
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: rows,
    enablePagination: false,
    enableSorting: false,
    enableColumnFilters: false,
    enableColumnActions: false,
    enableBottomToolbar: false,
    renderCaption: ({ table }) => {
      const visible = table.getRowModel().rows.map((r) => r.original);
      const total = visible.reduce(
        (sum, row) => sum + (row.creditHours || 0),
        0,
      );
      const rounded = Math.round(total * 10) / 10;
      const formatted = Number.isInteger(rounded)
        ? String(rounded)
        : rounded.toFixed(1);

      return (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <Box component="span">{`Selected courses: ${visible.length}`}</Box>
          <Box component="span">{`CR Hours: ${formatted}`}</Box>
        </Box>
      );
    },
    muiTableContainerProps: { sx: { overflowX: "auto" } },
    muiTableProps: {
      sx: { border: `1px solid ${theme.palette.divider}`, minWidth: 700 },
    },
    muiTableHeadCellProps: {
      sx: {
        borderBottom: `1px solid ${theme.palette.divider}`,
        fontWeight: 600,
      },
    },
    muiTableBodyCellProps: {
      sx: { borderBottom: `1px solid ${theme.palette.divider}` },
    },
  });

  return (
    <Box sx={{ overflowX: "auto", my: 3 }}>
      <MRT_Table table={table} />
    </Box>
  );
}
